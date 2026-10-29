'use strict';

/**
 * tests/aiProxyCircuitBreaker.test.js
 *
 * Step 08 & Step 09 — Express AI Proxy, Circuit Breaker, Anti-Hallucination & Fallback (Spec §4.24, §6.4).
 */

const { CircuitBreaker, AiProxyService } = require('../src/modules/aiProxy/aiProxy.service');
const aiProxyService = require('../src/modules/aiProxy/aiProxy.service');
const aiClient = require('../src/services/aiClient');
const { db } = require('../src/config/db');
const { appendAuditEvent } = require('../src/services/auditChain');

jest.mock('../src/services/aiClient');
jest.mock('../src/services/auditChain', () => ({
  appendAuditEvent: jest.fn().mockResolvedValue({ id: 'audit-mock-1' }),
}));

// Mock DB for resource queries
jest.mock('../src/config/db', () => {
  const mockRows = [
    {
      id: 'res_001',
      name: 'Prusa i3 MK3S+ 3D Printer',
      category: 'fabrication',
      description: 'Desktop 3D printer for rapid prototyping',
      status: 'ACTIVE',
    },
    {
      id: 'res_002',
      name: 'Epilog Fusion Pro Laser Cutter',
      category: 'fabrication',
      description: 'CO2 laser cutter',
      status: 'ACTIVE',
    },
  ];

  function createQb(rows = mockRows) {
    return {
      _rows: rows,
      where() { return this; },
      whereIn(col, ids) {
        if (Array.isArray(ids)) {
          this._rows = this._rows.filter((r) => ids.includes(r.id));
        }
        return this;
      },
      orWhereILike() { return this; },
      select() { return this; },
      limit(n) {
        return Promise.resolve(this._rows.slice(0, n));
      },
      then(resolve) {
        return Promise.resolve(this._rows).then(resolve);
      },
    };
  }

  const mockDbFn = (table) => {
    return createQb(mockRows);
  };
  mockDbFn.raw = (str, bindings) => str;
  return { db: mockDbFn };
});

describe('Step 08 — AI Proxy Circuit Breaker & Fallback Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    aiProxyService.circuitBreaker.reset();
  });

  describe('1. CircuitBreaker State Machine', () => {
    it('initializes in CLOSED state with 0 consecutive failures', () => {
      const cb = new CircuitBreaker();
      expect(cb.getState().state).toBe('CLOSED');
      expect(cb.getState().consecutiveFailures).toBe(0);
      expect(cb.isOpen()).toBe(false);
    });

    it('trips from CLOSED to OPEN after 3 consecutive failures', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 3 });
      const failAction = jest.fn().mockRejectedValue(new Error('Simulated network timeout'));
      const fallback = jest.fn().mockResolvedValue('fallback_result');

      // Failures 1 & 2
      await cb.execute(failAction, fallback);
      expect(cb.getState().state).toBe('CLOSED');
      expect(cb.getState().consecutiveFailures).toBe(1);

      await cb.execute(failAction, fallback);
      expect(cb.getState().state).toBe('CLOSED');
      expect(cb.getState().consecutiveFailures).toBe(2);

      // Failure 3 -> Trips to OPEN
      await cb.execute(failAction, fallback);
      expect(cb.getState().state).toBe('OPEN');
      expect(cb.getState().consecutiveFailures).toBe(3);
      expect(cb.isOpen()).toBe(true);
    });

    it('fast-fails to fallback immediately when OPEN without calling actionFn', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 1 });
      const failAction = jest.fn().mockRejectedValue(new Error('Down'));
      const fallback = jest.fn().mockImplementation((err) => Promise.resolve(`fallback: ${err.message}`));

      await cb.execute(failAction, fallback);
      expect(cb.getState().state).toBe('OPEN');

      const actionShouldNotRun = jest.fn();
      const res = await cb.execute(actionShouldNotRun, fallback);

      expect(actionShouldNotRun).not.toHaveBeenCalled();
      expect(res).toContain('Circuit breaker is OPEN');
    });

    it('transitions to HALF_OPEN after cooldown and returns to CLOSED on success', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 1, cooldownPeriod: 50 }); // 50ms cooldown
      const failAction = jest.fn().mockRejectedValue(new Error('Down'));
      const fallback = jest.fn().mockResolvedValue('fallback');

      await cb.execute(failAction, fallback);
      expect(cb.getState().state).toBe('OPEN');

      // Wait for cooldown
      await new Promise((r) => setTimeout(r, 60));
      expect(cb.isOpen()).toBe(false); // Transitions to HALF_OPEN

      const successAction = jest.fn().mockResolvedValue('recovered_result');
      const result = await cb.execute(successAction, fallback);

      expect(result).toBe('recovered_result');
      expect(cb.getState().state).toBe('CLOSED');
      expect(cb.getState().consecutiveFailures).toBe(0);
    });
  });

  describe('2. Anti-Hallucination Sanitization & Visibility Gating (Spec §6.4)', () => {
    it('strips hallucinated or unauthorized resource IDs returned by AI service', async () => {
      const testUser = { sub: 'usr-1', role: 'REQUESTER' };

      // Mock AI client returning a valid ID and a hallucinated ID
      aiClient.post.mockResolvedValueOnce({
        ok: true,
        matches: [
          { resourceId: 'res_001', score: 0.95 },
          { resourceId: 'res_hallucinated_999', score: 0.92 }, // Not in visible DB
        ],
      });

      // Mock visibleResourceIds resolver to only include res_001
      jest.spyOn(aiProxyService, 'getVisibleResourceIds').mockResolvedValueOnce(['res_001']);

      const response = await aiProxyService.matchNeed('3D printer', testUser);

      expect(response.source).toBe('AI');
      expect(response.matches).toHaveLength(1);
      expect(response.matches[0].resourceId).toBe('res_001');

      // Hallucinated ID must be pruned
      const matchIds = response.matches.map((m) => m.resourceId);
      expect(matchIds).not.toContain('res_hallucinated_999');
    });

    it('returns emptyMatchGuidance when no visible matches match the query', async () => {
      const testUser = { sub: 'usr-2', role: 'REQUESTER' };

      aiClient.post.mockResolvedValueOnce({
        ok: true,
        matches: [],
      });

      jest.spyOn(aiProxyService, 'getVisibleResourceIds').mockResolvedValueOnce(['res_001']);

      const response = await aiProxyService.matchNeed('Quantum computing dilution refrigerator', testUser);

      expect(response.matches).toHaveLength(0);
      expect(response.emptyMatchGuidance).toBeDefined();
      expect(response.emptyMatchGuidance.canSubmitNeedRequest).toBe(true);
      expect(response.emptyMatchGuidance.submitUrl).toBe('/services/needs/new');
    });
  });

  describe('3. Deterministic Fallback & Audit Logging', () => {
    it('triggers keyword fallback and logs audit event when AI service fails', async () => {
      const testUser = { sub: 'usr-3', role: 'REQUESTER' };

      aiClient.post.mockRejectedValueOnce(new Error('Connection refused'));

      jest.spyOn(aiProxyService, 'getVisibleResourceIds').mockResolvedValueOnce(['res_001', 'res_002']);

      const response = await aiProxyService.matchNeed('laser cutter for acrylic', testUser);

      expect(response.source).toBe('KEYWORD_FALLBACK');
      expect(Array.isArray(response.rankedResources)).toBe(true);
      expect(response.parsedNeed.originalText).toBe('laser cutter for acrylic');

      // Verify audit logging
      expect(appendAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'AI_UNAVAILABLE_FALLBACK',
          actorId: 'usr-3',
        })
      );
    });

    it('parseNeed falls back gracefully without throwing', async () => {
      aiClient.post.mockRejectedValueOnce(new Error('Timeout'));

      const response = await aiProxyService.parseNeed('Sample preparation bench for biology experiments', { sub: 'usr-4' });

      expect(response.source).toBe('KEYWORD_FALLBACK');
      expect(response.purpose).toBe('Research / Development');
      expect(response.technicalRequirements).toContain('Sample preparation');
    });
  });
});

