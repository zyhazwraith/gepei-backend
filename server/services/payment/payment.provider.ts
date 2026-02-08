export interface RefundResult {
  success: boolean;
  refundTransactionId: string; // Changed from transactionId to be explicit
  error?: string;
}

export interface IPaymentProvider {
  /**
   * Process a refund
   * @param orderId Order ID (for logging)
   * @param amount Refund amount in cents
   * @param originalTransactionId Original payment transaction ID
   * @param outRefundNo System generated unique refund request no
   * @param reason Refund reason
   */
  refund(orderId: string, amount: number, originalTransactionId: string, outRefundNo: string, reason: string): Promise<RefundResult>;
}

export class MockWechatProvider implements IPaymentProvider {
  async refund(orderId: string, amount: number, originalTransactionId: string, outRefundNo: string, reason: string): Promise<RefundResult> {
    console.log(`[MockWechat] Processing refund for Order ${orderId}`);
    console.log(`[MockWechat] Amount: ${amount}, Reason: ${reason}`);
    console.log(`[MockWechat] Original Tx: ${originalTransactionId}, Out Refund No: ${outRefundNo}`);
    
    // Simulate API latency
    // await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      refundTransactionId: `WX_REF_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    };
  }
}

// Singleton instance
export const paymentProvider = new MockWechatProvider();
