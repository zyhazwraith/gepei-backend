import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getOrderDetails, AdminOrder } from "@/lib/api";
import { Loader2, User, MapPin, Clock, Calendar, Wallet } from "lucide-react";

interface Props {
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OrderDetailDialog({ orderId, open, onOpenChange }: Props) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(false);

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

  const formatPrice = (cents: number | string | undefined) => {
    if (cents === undefined || cents === null) return "-";
    return (Number(cents) / 100).toFixed(2);
  };

  return (
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
                  {/* @ts-ignore: guideNickname/guidePhone might be on root or nested depending on API return, checking both */}
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
                <div className="text-sm font-bold text-orange-600">¥{formatPrice(order.amount)}</div>
              </div>
            </div>

            {/* 3. 内容与备注 */}
            <div className="space-y-4 border-t pt-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">服务内容</h4>
                <div className="bg-white border rounded p-3 text-sm whitespace-pre-wrap">
                  {/* @ts-ignore: content might be missing in type definition but exists in API response */}
                  {typeof (order as any).content === 'string' ? (order as any).content : JSON.stringify((order as any).content || "")}
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

            {/* 4. 状态时间轴 (简略) */}
            <div className="text-xs text-gray-400 text-right">
              创建时间: {new Date(order.createdAt).toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">无法加载订单详情</div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
