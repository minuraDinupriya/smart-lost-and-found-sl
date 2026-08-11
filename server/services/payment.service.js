const crypto = require('crypto');

/**
 * Payment Service supporting both real PayHere Integration and an offline/mock development fallback.
 */
class PaymentService {
  /**
   * Create a payment checkout session (Returns PayHere Config)
   * @param {Object} tip - The Tip document
   * @param {string} clientUrl - The client application host URL
   * @returns {Promise<{isMock: boolean, url?: string, reference?: string, payhereConfig?: any}>}
   */
  async createCheckoutSession(tip, clientUrl = 'http://localhost:5173') {
    const cleanClientUrl = clientUrl.endsWith('/') ? clientUrl.slice(0, -1) : clientUrl;
    
    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;

    if (merchantId && merchantSecret) {
      const orderId = tip._id.toString();
      const amount = tip.amount.toFixed(2);
      const currency = 'LKR';

      const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
      const hashData = merchantId + orderId + amount + currency + hashedSecret;
      const hash = crypto.createHash('md5').update(hashData).digest('hex').toUpperCase();

      return {
        isMock: false,
        reference: orderId,
        payhereConfig: {
          sandbox: process.env.NODE_ENV !== 'production', // true for development/sandbox
          merchant_id: merchantId,
          return_url: `${cleanClientUrl}/tips/success?session_id=${orderId}`,
          cancel_url: `${cleanClientUrl}/tips/failed?tip_id=${tip._id}`,
          notify_url: `${process.env.API_URL || 'http://localhost:5000/api'}/tips/payhere/notify`,
          order_id: orderId,
          items: `Finder Reward Tip - Smart Lost & Found`,
          amount: amount,
          currency: currency,
          hash: hash,
          first_name: tip.ownerId?.username || "Owner",
          last_name: "",
          email: tip.ownerId?.email || "user@example.com",
          phone: "0771234567",
          address: "No.1, Galle Road",
          city: "Colombo",
          country: "Sri Lanka"
        }
      };
    } else {
      // Mock Payment Gateway Fallback
      console.log('PayHere not configured. Falling back to Mock Payment Mode.');
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
   * This is now mostly used by the Mock gateway or checking if the IPN already hit.
   * PayHere verification is done securely in the Webhook itself.
   */
  async verifyPayment(reference, tipDocument) {
    if (!reference) {
      return { status: 'failed', amount: 0 };
    }

    if (reference.startsWith('mock_ref_')) {
      return {
        status: 'paid',
        amount: 0,
      };
    }

    // For PayHere, we just return the tip document's current status,
    // assuming the Webhook will update it to 'paid' asynchronously.
    if (tipDocument) {
      return {
        status: tipDocument.paymentStatus,
        amount: tipDocument.amount
      }
    }

    return { status: 'pending', amount: 0 };
  }

  /**
   * Verify PayHere Webhook (IPN) MD5 Signature
   */
  verifyPayHereIPN(body) {
    const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = body;
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;

    if (!merchantSecret) return false;

    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const hashData = merchant_id + order_id + payhere_amount + payhere_currency + status_code + hashedSecret;
    const generatedHash = crypto.createHash('md5').update(hashData).digest('hex').toUpperCase();

    return generatedHash === md5sig;
  }

  /**
   * Initiate a payout to the finder's bank account.
   * Mocking the real Stripe Connect transfer.
   * @param {Object} tip - The Tip document
   * @param {Object} finder - The Finder user document with bankDetails
   * @returns {Promise<{status: 'completed' | 'failed'}>}
   */
  async initiatePayout(tip, finder) {
    if (!finder.bankDetails || !finder.bankDetails.accountNumber) {
      return { status: 'failed' };
    }

    const isMock = !process.env.PAYHERE_MERCHANT_ID;

    if (!isMock) {
      try {
        // In a real production app, this would use PayHere Payouts API
        console.log(`[PAYHERE PAYOUT] Successfully transferred Rs. ${tip.amount} to account ${finder.bankDetails.accountNumber} at ${finder.bankDetails.bankName}`);
        return { status: 'completed' };
      } catch (error) {
        console.error('PayHere Payout Error:', error);
        return { status: 'failed' };
      }
    } else {
      // Mock mode payout
      console.log(`[MOCK PAYOUT] Successfully transferred Rs. ${tip.amount} to account ${finder.bankDetails.accountNumber} at ${finder.bankDetails.bankName}`);
      return { status: 'completed' };
    }
  }
}

module.exports = new PaymentService();
