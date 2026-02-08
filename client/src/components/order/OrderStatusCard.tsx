import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CreditCard, Calendar, CheckCircle2 } from "lucide-react";
import { OrderDetailResponse, OrderStatus } from "@/lib/api";

interface OrderStatusCardProps {
  order: OrderDetailResponse;
  isGuideView: boolean;
  csQrCode: string | null;
}

export default function OrderStatusCard({ order, isGuideView, csQrCode }: OrderStatusCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case OrderStatus.PENDING:
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">待支付</Badge>;
      case OrderStatus.PAID:
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">待接单</Badge>;
      case OrderStatus.WAITING_SERVICE:
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">待服务</Badge>;
      case OrderStatus.IN_SERVICE:
        return <Badge variant="secondary" className="bg-green-100 text-green-800">服务中</Badge>;
      case OrderStatus.SERVICE_ENDED:
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">服务结束</Badge>;
      case OrderStatus.COMPLETED:
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">已完成</Badge>;
      case OrderStatus.CANCELLED:
        return <Badge variant="secondary" className="bg-red-100 text-red-800">已取消</Badge>;
      case OrderStatus.REFUNDED:
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">已退款</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === OrderStatus.PAID) return <Clock className="w-8 h-8 text-orange-600" />;
    if (status === OrderStatus.PENDING) return <CreditCard className="w-8 h-8 text-orange-600" />;
    if (status === OrderStatus.WAITING_SERVICE) return <Calendar className="w-8 h-8 text-blue-600" />;
    if (status === OrderStatus.IN_SERVICE) return <Clock className="w-8 h-8 text-green-600 animate-pulse" />;
    if (status === OrderStatus.SERVICE_ENDED) return <CheckCircle2 className="w-8 h-8 text-gray-600" />;
    return <CheckCircle2 className="w-8 h-8 text-orange-600" />;
  };

  const getStatusTitle = (status: string) => {
    const map: Record<string, string> = {
      [OrderStatus.PENDING]: '等待支付',
      [OrderStatus.PAID]: '等待地陪接单',
      [OrderStatus.WAITING_SERVICE]: '等待服务开始',
      [OrderStatus.IN_SERVICE]: '服务进行中',
      [OrderStatus.SERVICE_ENDED]: '服务结束，待结算',
      [OrderStatus.REFUNDED]: '已退款',
      [OrderStatus.CANCELLED]: '已取消',
      [OrderStatus.COMPLETED]: '订单已完成'
    };
    return map[status] || '订单已完成';
  };

  const getStatusDescription = (status: string) => {
    if (status === OrderStatus.PENDING) return '请在 1 小时内完成支付';
    if (status === OrderStatus.PAID) return '系统正在为您匹配合适的地陪';
    if (status === OrderStatus.WAITING_SERVICE) return isGuideView ? '请在到达约定地点后开始服务' : '地陪将按时为您服务';
    if (status === OrderStatus.IN_SERVICE) return '请享受您的旅程';
    if (status === OrderStatus.SERVICE_ENDED) return '服务已完成，系统正在进行资金结算（预计24小时内到账）';
    if (status === OrderStatus.REFUNDED) return '款项已原路退回';
    if (status === OrderStatus.CANCELLED) return '订单已取消';
    return '祝您旅途愉快';
  };


  return (
    <Card className="border-none shadow-sm bg-gradient-to-r from-orange-50 to-orange-100">
      <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
        <div className="p-3 bg-white/50 rounded-full">
          {getStatusIcon(order.status)}
        </div>
        <h2 className="text-xl font-bold text-orange-900">
          {getStatusTitle(order.status)}
        </h2>
        <p className="text-sm text-orange-800/80">
          {getStatusDescription(order.status)}
        </p>
        
        {/* 待服务状态下直接显示客服二维码 */}
        {order.status === OrderStatus.WAITING_SERVICE && !isGuideView && csQrCode && (
          <div className="mt-4 p-4 bg-white/60 rounded-lg flex flex-col items-center">
            <div className="text-xs font-bold text-orange-900 mb-2">请务必扫描下方二维码联系客服确认行程</div>
            <div className="w-32 h-32 bg-white p-1 rounded border border-orange-200">
              <img src={csQrCode} alt="客服二维码" className="w-full h-full object-cover" />
            </div>
            <div className="text-[10px] text-orange-800/70 mt-1">长按识别或截图保存</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
