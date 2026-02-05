import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getOrderDetails, AdminOrder, refundOrder } from "@/lib/api";
import { Loader2, User, MapPin, Clock, Calendar, Wallet, Undo2, AlertTriangle } from "lucide-react";
import Price from "@/components/Price";

interface Props {
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OrderDetailDialog({ orderId, open, onOpenChange }: Props) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(false);

  // Refund Dialog State
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0); // In Yuan (for input)
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    if (open && orderId) {
      fetchDetail(orderId);
    } else {
      setOrder(null);
    }
  }, [open, orderId]);

  const fetchDetail = async (id: number) => {
    setLoading(true);
    try {
      const res = await getOrderDetails(id);
      if (res.code === 0 && res.data) {
        setOrder(res.data);
      } else {
        toast.error(res.message || "获取详情失败");
      }
    } catch (error) {
      toast.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRefund = () => {
    if (!order) return;
    const amountInCents = parseInt(order.amount);
    // Default: Deduct 150 Yuan (15000 cents) penalty
    const defaultRefundCents = Math.max(0, amountInCents - 15000);
    
    setRefundAmount(defaultRefundCents / 100);
    setRefundReason("用户取消，扣除违约金 ¥150");
    setRefundDialogOpen(true);
  };

  const handleConfirmRefund = async () => {
    if (!order) return;
    
    const amountInCents = Math.floor(refundAmount * 100);
    if (amountInCents <= 0 || amountInCents > parseInt(order.amount)) {
      toast.error("退款金额无效");
      return;
    }

    setRefunding(true);
    try {
      const res = await refundOrder(order.id, {
        amount: amountInCents,
        reason: refundReason
      });
      if (res.code === 0) {
        toast.success("退款成功");
        setRefundDialogOpen(false);
        fetchDetail(order.id); // Refresh detail
      } else {
        toast.error(res.message || "退款失败");
      }
    } catch (error) {
      toast.error("操作失败");
    } finally {
      setRefunding(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            订单详情
            {order && <Badge variant="outline">{order.orderNumber}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : order ? (
          <div className="space-y-6 py-4">
            {/* 1. 基础信息 Grid */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-gray-500 flex items-center gap-1">
                  <User className="w-4 h-4" /> 客户信息
                </h4>
                <div className="text-sm">
                  <span className="font-medium">{order.userNickname || "未知"}</span>
                  <span className="ml-2 text-gray-500">{order.userPhone}</span>
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-gray-500 flex items-center gap-1">
                  <User className="w-4 h-4" /> 地陪信息
                </h4>
                <div className="text-sm">
                  {/* @ts-ignore */}
                  <span className="font-medium">{(order as any).guideNickname || (order as any).guide?.nickName || "未指派"}</span>
                  <span className="ml-2 text-gray-500">{(order as any).guidePhone || (order as any).guide?.phone || ""}</span>
                </div>
              </div>
            </div>

            {/* 2. 服务信息 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> 服务时间</div>
                <div className="text-sm font-medium">
                  {order.serviceStartTime ? new Date(order.serviceStartTime).toLocaleString() : "-"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> 时长</div>
                <div className="text-sm font-medium">{order.duration} 小时</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> 地点</div>
                <div className="text-sm font-medium truncate" title={order.serviceAddress}>
                  {order.serviceAddress || "-"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500 flex items-center gap-1"><Wallet className="w-3 h-3" /> 总金额</div>
                <Price amount={order.amount} className="text-sm font-bold text-orange-600" />
              </div>
            </div>

            {/* 3. 退款信息 (如果已退款) */}
            {order.status === 'refunded' && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-red-800 font-medium">
                   <Undo2 className="w-4 h-4" /> 订单已退款
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                   <div>
                     <span className="text-gray-500">退款金额:</span>
                     <Price amount={(order as any).refundAmount} className="ml-2 font-bold text-red-600" />
                   </div>
                   <div>
                     <span className="text-gray-500">退款原因:</span>
                     <span className="ml-2 text-gray-700">
                        {/* @ts-ignore */}
                        {(order as any).refund_records?.[0]?.reason || "未知"}
                     </span>
                   </div>
                </div>
              </div>
            )}

            {/* 4. 内容与备注 */}
            <div className="space-y-4 border-t pt-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">服务内容</h4>
                <div className="bg-white border rounded p-3 text-sm whitespace-pre-wrap">
                  {typeof order.content === 'string' ? order.content : JSON.stringify(order.content)}
                </div>
              </div>
              {order.requirements && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">备注要求</h4>
                  <div className="bg-yellow-50 border border-yellow-100 rounded p-3 text-sm text-yellow-800">
                    {order.requirements}
                  </div>
                </div>
              )}
            </div>

            {/* 5. 状态时间轴 (简略) */}
            <div className="text-xs text-gray-400 text-right">
              创建时间: {new Date(order.createdAt).toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">无法加载订单详情</div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {order && ['paid', 'waiting_service'].includes(order.status) && (
             <Button variant="destructive" onClick={handleOpenRefund}>
                退款
             </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Refund Confirmation Dialog */}
    <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                    确认退款
                </DialogTitle>
                <DialogDescription>
                    退款操作不可逆，请确认金额。
                </DialogDescription>
            </DialogHeader>

            {order && (
                <div className="space-y-4 py-4">
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded text-sm">
                        <span className="text-gray-600">订单总额</span>
                        <Price amount={order.amount} className="font-bold" />
                    </div>

                    <div className="space-y-2">
                        <Label>退款金额 (元)</Label>
                        <Input 
                            type="number" 
                            value={refundAmount} 
                            onChange={(e) => setRefundAmount(parseFloat(e.target.value))}
                            className="text-lg font-bold"
                        />
                        <div className="flex justify-between text-xs text-gray-500 px-1 items-center">
                           <span>违约金扣除: </span>
                           <Price amount={parseInt(order.amount) - Math.floor(refundAmount * 100)} className="text-gray-700 font-medium" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>退款原因</Label>
                        <Textarea 
                            value={refundReason} 
                            onChange={(e) => setRefundReason(e.target.value)}
                            placeholder="请输入退款原因..."
                            className="min-h-[80px]"
                        />
                    </div>
                </div>
            )}

            <DialogFooter>
                <Button variant="outline" onClick={() => setRefundDialogOpen(false)} disabled={refunding}>
                    取消
                </Button>
                <Button variant="destructive" onClick={handleConfirmRefund} disabled={refunding}>
                    {refunding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    确认退款
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
