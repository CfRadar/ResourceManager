'use strict';

/**
 * src/modules/payments/payments.service.js
 *
 * Business logic for simulated billing, cost estimates, and demo invoices.
 * Spec §4.18, Step 09.
 */

const { bookingRepo } = require('../bookings/bookings.repository');
const { policyRepo }  = require('../policies/policies.repository');
const { Errors }      = require('../../utils/AppError');

class PaymentsService {
  /**
   * Generates a dynamic cost estimate breakdown for a booking.
   */
  async getCostEstimate(bookingId, user) {
    const booking = await bookingRepo.findDetailById(bookingId);
    if (!booking) {
      throw Errors.NotFound('Booking not found.');
    }

    const start = new Date(booking.start_time || booking.start_at);
    const end = new Date(booking.end_time || booking.end_at);
    const durationHours = Math.max(0.5, (end - start) / (1000 * 60 * 60));

    const policy = await policyRepo.findCurrentPolicy(booking.resource_id);
    const pricing = policy?.policyData?.pricing || { model: 'FREE' };

    if (pricing.model === 'QUOTE') {
      return {
        bookingId,
        model:           'QUOTE',
        quoteRequired:   true,
        notice:          'Quotation required by facility management.',
        consumablesNote: pricing.consumablesNote || '',
        demo:            true,
      };
    }

    const hourlyRate = Number(pricing.hourlyRate || 0);
    const operatorFee = Number(pricing.operatorFee || 0);
    const tokensPerHour = Number(pricing.tokensPerHour || 0);

    const baseCost = durationHours * hourlyRate;
    const totalCost = baseCost + operatorFee;
    const tokenEstimate = Math.ceil(durationHours * tokensPerHour);

    return {
      bookingId,
      model:           pricing.model || 'FREE',
      durationHours:   Number(durationHours.toFixed(2)),
      hourlyRate,
      operatorFee,
      totalCost,
      tokenEstimate,
      currency:        'INR',
      consumablesNote: pricing.consumablesNote || '',
      demo:            true,
    };
  }

  /**
   * Manager issues a simulated invoice for a completed booking.
   */
  async generateInvoice(bookingId, data, manager) {
    const estimate = await this.getCostEstimate(bookingId, manager);

    const invoiceId = `inv_${Date.now()}`;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const lineItems = data.lineItems || [
      {
        description: `Resource reservation (${estimate.durationHours || 1} hrs)`,
        amount:      estimate.totalCost || 0,
      },
    ];

    const total = lineItems.reduce((acc, item) => acc + Number(item.amount || 0), 0);

    return {
      id:            invoiceId,
      bookingId,
      invoiceNumber,
      issuedAt:      new Date().toISOString(),
      status:        'UNPAID',
      lineItems,
      total,
      currency:      'INR',
      demo:          true,
      notice:        'Demonstration invoice for prototype testing only.',
    };
  }

  /**
   * Simulates invoice payment settlement.
   */
  async markPaid(invoiceId, manager) {
    return {
      invoiceId,
      status:   'PAID',
      paidAt:   new Date().toISOString(),
      markedBy: manager.sub,
      demo:     true,
      notice:   'Simulated payment in sandbox. No money moved.',
    };
  }
}

const paymentsService = new PaymentsService();

module.exports = {
  PaymentsService,
  paymentsService,
};

