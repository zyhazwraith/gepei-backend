export interface RefundResult {
  success: boolean;
  transactionId: string;
  error?: string;
}

export interface IPaymentProvider {
  /**
   * Process a refund
   * @param orderId Order ID (for logging)
   * @param amount Refund amount in cents
   * @param transactionId Original payment transaction ID
   * @param reason Refund reason
   */
  refund(orderId: string, amount: number, transactionId: string, reason: string): Promise<RefundResult>;
}

export class MockWechatProvider implements IPaymentProvider {
  async refund(orderId: string, amount: number, transactionId: string, reason: string): Promise<RefundResult> {
    console.log(`[MockWechat] Processing refund for Order ${orderId}`);
    console.log(`[MockWechat] Amount: ${amount}, Reason: ${reason}, Original Tx: ${transactionId}`);
    
    // Simulate API latency
    // await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      transactionId: `REFUND_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    };
  }
}

// Singleton instance
export const paymentProvider = new MockWechatProvider();
