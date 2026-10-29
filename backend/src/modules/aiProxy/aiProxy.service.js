'use strict';

/**
 * src/modules/aiProxy/aiProxy.service.js
 *
 * Proxy service to the Python AI engine with resilient deterministic fallbacks (Spec §4.24, §6.4).
 * Implements:
 *   - Circuit Breaker (CLOSED -> OPEN after 3 failures, 30s cooldown -> HALF_OPEN)
 *   - 4-second strict timeout threshold
 *   - Anti-hallucination sanitization & visibility scoping
 *   - Audit logging on fallback (AI_UNAVAILABLE_FALLBACK)
 *   - Missing-resource empty-match guidance
 */

const aiClient = require('../../services/aiClient');
const { db } = require('../../config/db');
const { TIMEOUT } = require('../../config/constants');
const { appendAuditEvent } = require('../../services/auditChain');
const { resourceRepo } = require('../resources/resources.repository');

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 3;
    this.cooldownPeriod = options.cooldownPeriod || 30_000; // 30 seconds
    this.state = 'CLOSED'; // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    this.consecutiveFailures = 0;
    this.lastFailureTime = null;
  }

  isOpen() {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.cooldownPeriod) {
        this.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess() {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
  }

  recordFailure() {
    this.consecutiveFailures += 1;
    this.lastFailureTime = Date.now();
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  reset() {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.lastFailureTime = null;
  }

  getState() {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
    };
  }

  async execute(actionFn, fallbackFn) {
    if (this.isOpen()) {
      return fallbackFn(new Error('Circuit breaker is OPEN. Fast-failing to deterministic fallback.'));
    }

    try {
      const result = await actionFn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      return fallbackFn(err);
    }
  }
}

class AiProxyService {
  constructor() {
    this.circuitBreaker = new CircuitBreaker();
  }

  /**
   * Helper to resolve visible resource IDs for caller
   */
  async getVisibleResourceIds(user) {
    try {
      const visibleRes = await resourceRepo.findVisibleResources({}, user, { page: 1, pageSize: 500 });
      return (visibleRes.data || []).map((r) => r.id);
    } catch {
      // Fallback query in case repo throws or in test mock
      const rows = await db('resources').where({ status: 'ACTIVE' }).select('id');
      return (rows || []).map((r) => r.id);
    }
  }

  /**
   * Matches free text against network resources with circuit breaker, visibility gating,
   * anti-hallucination sanitization, and deterministic keyword fallback (Spec §4.24, §6.4).
   */
  async matchNeed(text, user) {
    const visibleResourceIds = await this.getVisibleResourceIds(user);

    const actionFn = async () => {
      const timeoutMs = TIMEOUT.AI_SERVICE_MS || 4000;
      const result = await Promise.race([
        aiClient.post('/ai/match-need', { text, visibleResourceIds }, user?.sub),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI service timeout')), timeoutMs)
        ),
      ]);

      // Anti-hallucination & visibility sanitization (Spec §6.4)
      const rawMatches = result.matches || result.rankedResources || [];
      const sanitizedMatches = rawMatches.filter((m) => {
        const matchId = m.resourceId || m.resource_id;
        return visibleResourceIds.includes(matchId);
      });

      const emptyMatchGuidance = sanitizedMatches.length === 0 ? {
        canSubmitNeedRequest: true,
        submitUrl: '/services/needs/new',
        message: 'No matching equipment found in your network. Submit a Missing-Resource Need Request to alert coordinators.',
      } : null;

      return {
        ...result,
        matches: sanitizedMatches,
        rankedResources: sanitizedMatches,
        source: 'AI',
        emptyMatchGuidance,
      };
    };

    const fallbackFn = async (err) => {
      await appendAuditEvent({
        actorId:    user?.sub || 'system',
        actorRole:  user?.role || 'REQUESTER',
        action:     'AI_UNAVAILABLE_FALLBACK',
        entityType: 'AiMatch',
        entityId:   user?.sub || 'anonymous',
        reason:     `AI service call failed: ${err.message}. Invoking deterministic fallback.`,
        visibility: 'INTERNAL',
      }).catch(() => {});

      // Deterministic keyword fallback
      const words = (text || '').toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      let query = db('resources').where({ status: 'ACTIVE' });

      if (visibleResourceIds && visibleResourceIds.length > 0) {
        query = query.whereIn('id', visibleResourceIds);
      }

      if (words.length > 0) {
        query = query.where(function () {
          for (const word of words) {
            this.orWhereILike('name', `%${word}%`)
              .orWhereILike('category', `%${word}%`)
              .orWhereILike('description', `%${word}%`);
          }
        });
      }

      const matches = await query.limit(5);

      const ranked = matches.map((r) => ({
        resourceId:  r.id,
        name:        r.name,
        category:    r.category,
        matchType:   'AVAILABLE_LISTING',
        reasons:     [`Keyword match on resource title or category: ${r.category}`],
      }));

      const emptyMatchGuidance = ranked.length === 0 ? {
        canSubmitNeedRequest: true,
        submitUrl: '/services/needs/new',
        message: 'No matching equipment found in your network. Submit a Missing-Resource Need Request to alert coordinators.',
      } : null;

      return {
        parsedNeed: {
          originalText: text,
          detectedKeywords: words,
        },
        rankedResources: ranked,
        matches: ranked,
        source: 'KEYWORD_FALLBACK',
        emptyMatchGuidance,
      };
    };

    return this.circuitBreaker.execute(actionFn, fallbackFn);
  }

  /**
   * Turns natural language text into structured need-request fields.
   */
  async parseNeed(text, user) {
    const actionFn = async () => {
      const timeoutMs = TIMEOUT.AI_SERVICE_MS || 4000;
      const result = await Promise.race([
        aiClient.post('/ai/parse-need', { text }, user?.sub),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI service timeout')), timeoutMs)
        ),
      ]);
      return { ...result, source: 'AI' };
    };

    const fallbackFn = async () => {
      return {
        capabilityNeeded:        text ? text.slice(0, 100) : '',
        technicalRequirements:   text || '',
        purpose:                 'Research / Development',
        accessModePreference:    'INDEPENDENT',
        consentShareContact:     false,
        source:                  'KEYWORD_FALLBACK',
      };
    };

    return this.circuitBreaker.execute(actionFn, fallbackFn);
  }

  /**
   * Generates a neutral, factual summary of an incident timeline.
   */
  async draftIncidentSummary(incidentId, user) {
    const incident = await db('incidents').where({ id: incidentId }).first();
    const notes = await db('incident_notes').where({ incident_id: incidentId }).orderBy('created_at', 'asc');

    const actionFn = async () => {
      const timeoutMs = TIMEOUT.AI_SERVICE_MS || 4000;
      const result = await Promise.race([
        aiClient.post('/ai/incident-summary', { incident, notes }, user?.sub),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI service timeout')), timeoutMs)
        ),
      ]);
      return { ...result, source: 'AI' };
    };

    const fallbackFn = async () => {
      const summary = `Incident [${incident?.type || 'GENERAL'}] filed on ${new Date(incident?.created_at || Date.now()).toLocaleDateString()}. Notes count: ${notes.length}. Initial description: ${incident?.description || 'N/A'}`;
      return {
        summary,
        sources: notes.map((n) => n.id),
        source: 'KEYWORD_FALLBACK',
      };
    };

    return this.circuitBreaker.execute(actionFn, fallbackFn);
  }

  /**
   * Plain-language summary of resource access policy.
   */
  async policySummary(policyData, user) {
    const actionFn = async () => {
      const timeoutMs = TIMEOUT.AI_SERVICE_MS || 4000;
      const result = await Promise.race([
        aiClient.post('/ai/policy-summary', { policyData }, user?.sub),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI service timeout')), timeoutMs)
        ),
      ]);
      return { ...result, source: 'AI' };
    };

    const fallbackFn = async () => {
      return {
        summary: `Policy allows access modes: ${(policyData?.accessModes || ['INDEPENDENT']).join(', ')}. Advance booking: ${policyData?.advanceBookingDays || 14} days. Maximum duration: ${policyData?.maxDurationHours || 4} hours.`,
        source: 'KEYWORD_FALLBACK',
      };
    };

    return this.circuitBreaker.execute(actionFn, fallbackFn);
  }
}

const aiProxyService = new AiProxyService();

module.exports = aiProxyService;
module.exports.AiProxyService = AiProxyService;
module.exports.CircuitBreaker = CircuitBreaker;
