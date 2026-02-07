import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CreditCard, Calendar, CheckCircle2 } from "lucide-react";
import { OrderDetailResponse } from "@/lib/api";

interface OrderStatusCardProps {
  order: OrderDetailResponse;
  isGuideView: boolean;
  csQrCode: string | null;
}

export default function OrderStatusCard({ order, isGuideView, csQrCode }: OrderStatusCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">待支付</Badge>;
      case 'paid':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">待接单</Badge>;
      case 'waiting_service':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">待服务</Badge>;
      case 'in_service':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">服务中</Badge>;
      case 'service_ended':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">服务结束</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">已完成</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">已取消</Badge>;
      case 'refunded':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">已退款</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'paid') return <Clock className="w-8 h-8 text-orange-600" />;
    if (status === 'pending') return <CreditCard className="w-8 h-8 text-orange-600" />;
    if (status === 'waiting_service') return <Calendar className="w-8 h-8 text-blue-600" />;
    if (status === 'in_service') return <Clock className="w-8 h-8 text-green-600 animate-pulse" />;
    if (status === 'service_ended') return <CheckCircle2 className="w-8 h-8 text-gray-600" />;
    return <CheckCircle2 className="w-8 h-8 text-orange-600" />;
  };

  const getStatusTitle = (status: string) => {
    const map: Record<string, string> = {
      pending: '等待支付',
      paid: '等待地陪接单',
      waiting_service: '等待服务开始',
      in_service: '服务进行中',
      service_ended: '服务结束，待结算',
      refunded: '已退款',
      cancelled: '已取消',
      completed: '订单已完成'
    };
    return map[status] || '订单已完成';
  };

  const getStatusDescription = (status: string) => {
    if (status === 'pending') return '请在 1 小时内完成支付';
    if (status === 'paid') return '系统正在为您匹配合适的地陪';
    if (status === 'waiting_service') return isGuideView ? '请在到达约定地点后开始服务' : '地陪将按时为您服务';
    if (status === 'in_service') return '请享受您的旅程';
    if (status === 'service_ended') return '服务已完成，系统正在进行资金结算（预计24小时内到账）';
    if (status === 'refunded') return '款项已原路退回';
    if (status === 'cancelled') return '订单已取消';
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
        {order.status === 'waiting_service' && !isGuideView && csQrCode && (
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
