const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

/**
 * Payment Service supporting both real Stripe Integration and an offline/mock development fallback.
 */
class PaymentService {
  /**
   * Create a payment checkout session.
   * @param {Object} tip - The Tip document
   * @param {string} clientUrl - The client application host URL (e.g., http://localhost:5173)
   * @returns {Promise<{url: string, reference: string, isMock: boolean}>}
   */
  async createCheckoutSession(tip, clientUrl = 'http://localhost:5173') {
    const cleanClientUrl = clientUrl.endsWith('/') ? clientUrl.slice(0, -1) : clientUrl;

    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'lkr', // Use Sri Lankan Rupee
                product_data: {
                  name: `Finder Reward Tip - Smart Lost & Found`,
                  description: `Voluntary reward tip for returning item. Thank you!`,
                },
                unit_amount: Math.round(tip.amount * 100), // Stripe expects cents/cents-equivalent
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${cleanClientUrl}/tips/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${cleanClientUrl}/tips/failed?tip_id=${tip._id}`,
          metadata: {
            tipId: tip._id.toString(),
            returnRecordId: tip.returnRecordId.toString(),
          },
        });

        return {
          url: session.url,
          reference: session.id,
          isMock: false,
        };
      } catch (error) {
        console.error('Stripe Session Creation Error:', error);
        throw new Error('Failed to communicate with Stripe API. Please check configuration.');
      }
    } else {
      // Mock Payment Gateway Fallback
      console.log('Stripe not configured. Falling back to Mock Payment Mode.');
      const mockReference = `mock_ref_${Math.random().toString(36).substring(2, 15)}`;
      const mockUrl = `${cleanClientUrl}/tips/payment/${tip._id}?reference=${mockReference}&mock=true`;

      return {
        url: mockUrl,
        reference: mockReference,
        isMock: true,
      };
    }
  }

  /**
   * Verify a payment reference.
   * @param {string} reference - The payment reference (Stripe Session ID or Mock reference)
   * @returns {Promise<{status: 'paid' | 'failed' | 'pending', amount: number}>}
   */
  async verifyPayment(reference) {
    if (!reference) {
      return { status: 'failed', amount: 0 };
    }

    if (stripe && reference.startsWith('cs_')) {
      try {
        const session = await stripe.checkout.sessions.retrieve(reference);
        if (session.payment_status === 'paid') {
          return {
            status: 'paid',
            amount: session.amount_total / 100,
          };
        } else if (session.payment_status === 'unpaid') {
          return {
            status: 'pending',
            amount: session.amount_total / 100,
          };
        } else {
          return {
            status: 'failed',
            amount: 0,
          };
        }
      } catch (error) {
        console.error('Stripe Session Verification Error:', error);
        return { status: 'failed', amount: 0 };
      }
    } else if (reference.startsWith('mock_ref_')) {
      // Mock payment is verified successfully
      return {
        status: 'paid',
        amount: 0, // Mock mode uses stored DB amount
      };
    }

    return { status: 'failed', amount: 0 };
  }
}

module.exports = new PaymentService();
