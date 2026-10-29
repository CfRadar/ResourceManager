'use strict';

/**
 * src/modules/aiProxy/aiProxy.service.js
 *
 * Proxy service to the Python AI engine with resilient deterministic fallbacks (Spec §4.24).
 */

const aiClient = require('../../services/aiClient');
const { db } = require('../../config/db');
const { TIMEOUT } = require('../../config/constants');
const { appendAuditEvent } = require('../../services/auditChain');

class AiProxyService {
  /**
   * Matches free text against network resources with deterministic keyword fallback.
   */
  async matchNeed(text, user) {
    try {
      const result = await Promise.race([
        aiClient.post('/ai/match-need', { text }, user.sub),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI service timeout')), TIMEOUT.AI_SERVICE_MS || 4000)
        ),
      ]);

      return {
        ...result,
        source: 'AI',
      };
    } catch (err) {
      await appendAuditEvent({
        actorId:    user.sub,
        actorRole:  user.role,
        action:     'AI_UNAVAILABLE_FALLBACK',
        entityType: 'AiMatch',
        entityId:   user.sub,
        reason:     `AI service call failed: ${err.message}. Invoking deterministic fallback.`,
        visibility: 'INTERNAL',
      }).catch(() => {});

      // Deterministic keyword fallback
      const words = (text || '').toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      let query = db('resources').where({ status: 'ACTIVE' });

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

      return {
        parsedNeed: {
          originalText: text,
          detectedKeywords: words,
        },
        rankedResources: ranked,
        source: 'KEYWORD_FALLBACK',
      };
    }
  }

  /**
   * Turns natural language text into structured need-request fields.
   */
  async parseNeed(text, user) {
    try {
      const result = await Promise.race([
        aiClient.post('/ai/parse-need', { text }, user.sub),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI service timeout')), TIMEOUT.AI_SERVICE_MS || 4000)
        ),
      ]);
      return { ...result, source: 'AI' };
    } catch (err) {
      // Deterministic parsing
      return {
        capabilityNeeded:        text.slice(0, 100),
        technicalRequirements:   text,
        purpose:                 'Research / Development',
        accessModePreference:    'INDEPENDENT',
        consentShareContact:     false,
        source:                  'KEYWORD_FALLBACK',
      };
    }
  }

  /**
   * Generates a neutral, factual summary of an incident timeline.
   */
  async draftIncidentSummary(incidentId, user) {
    const incident = await db('incidents').where({ id: incidentId }).first();
    const notes = await db('incident_notes').where({ incident_id: incidentId }).orderBy('created_at', 'asc');

    try {
      const result = await Promise.race([
        aiClient.post('/ai/incident-summary', { incident, notes }, user.sub),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI service timeout')), TIMEOUT.AI_SERVICE_MS || 4000)
        ),
      ]);
      return { ...result, source: 'AI' };
    } catch (err) {
      const summary = `Incident [${incident?.type || 'GENERAL'}] filed on ${new Date(incident?.created_at || Date.now()).toLocaleDateString()}. Notes count: ${notes.length}. Initial description: ${incident?.description || 'N/A'}`;
      return {
        summary,
        sources: notes.map((n) => n.id),
        source: 'KEYWORD_FALLBACK',
      };
    }
  }

  /**
   * Plain-language summary of resource access policy.
   */
  async policySummary(policyData, user) {
    try {
      const result = await Promise.race([
        aiClient.post('/ai/policy-summary', { policyData }, user.sub),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI service timeout')), TIMEOUT.AI_SERVICE_MS || 4000)
        ),
      ]);
      return { ...result, source: 'AI' };
    } catch (err) {
      return {
        summary: `Policy allows access modes: ${(policyData?.accessModes || ['INDEPENDENT']).join(', ')}. Advance booking: ${policyData?.advanceBookingDays || 14} days. Maximum duration: ${policyData?.maxDurationHours || 4} hours.`,
        source: 'KEYWORD_FALLBACK',
      };
    }
  }
}

module.exports = new AiProxyService();

