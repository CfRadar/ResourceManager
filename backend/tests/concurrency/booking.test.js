'use strict';

/**
 * tests/concurrency/booking.test.js
 *
 * Concurrency Test Requirement (Research/NodeBackend/07_BOOKINGS_CONCURRENCY_AND_CHECKIN.md §1.2):
 * - Spawns 10 parallel requests for the exact same slot.
 * - Asserts that exactly 1 request succeeds and 9 requests return 409 BOOKING_CONFLICT.
 */

const { reserveSlot } = require('../../src/services/bookingEngine');

describe('Step 07 §1.2 Concurrency Safeguards & Exclusion Constraint', () => {
  it('handles 10 parallel reservation requests: exactly 1 succeeds and 9 return 409 BOOKING_CONFLICT', async () => {
    let reserved = false;

    // Simulated PostgreSQL GiST exclusion: only the first transaction wins, the other 9 collide with 23P01
    const mockTrxFactory = () => {
      return () => ({
        where: () => ({
          whereIn: () => ({
            where: () => ({
              where: () => ({
                select: async () => [],
              }),
            }),
          }),
        }),
        insert: () => ({
          returning: async () => {
            if (reserved) {
              const gistErr = new Error('exclusion constraint "no_overlapping_bookings"');
              gistErr.code = '23P01';
              throw gistErr;
            }
            reserved = true;
            return [{ id: 'winner-booking-uuid', status: 'SCHEDULED' }];
          },
        }),
      });
    };

    const slotRequest = {
      resourceId: 'res-concurrent-uuid',
      userId:     'user-uuid-1',
      requestId:  'req-uuid-1',
      startAt:    '2026-11-01T10:00:00.000Z',
      endAt:      '2026-11-01T12:00:00.000Z',
    };

    // Spawn 10 simultaneous promises
    const promises = Array.from({ length: 10 }).map((_, idx) =>
      reserveSlot(
        { ...slotRequest, userId: `user-uuid-${idx + 1}` },
        { trx: mockTrxFactory() }
      ).then(
        (res) => ({ status: 'resolved', data: res }),
        (err) => ({ status: 'rejected', error: err })
      )
    );

    const results = await Promise.all(promises);

    const successes = results.filter((r) => r.status === 'resolved');
    const conflicts = results.filter(
      (r) => r.status === 'rejected' && r.error.status === 409 && r.error.code === 'BOOKING_CONFLICT'
    );

    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(9);
    expect(successes[0].data.id).toBe('winner-booking-uuid');
  });
});
