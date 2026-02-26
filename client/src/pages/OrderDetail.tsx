import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, MapPin, Calendar, Clock, AlertCircle, Headphones, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getOrderById, getCurrentUser, OrderDetailResponse, User, payOvertime, getPublicConfigs, getGuideDetail, Guide, OrderStatus, refundOrder } from "@/lib/api";
import Price from "@/components/Price";
import BottomNav from "@/components/BottomNav";
import PaymentSheet from "@/components/PaymentSheet";
import OvertimeDialog from "@/components/OvertimeDialog";
import ContactCSDialog from "@/components/ContactCSDialog";
import RefundConfirmDialog from "@/components/RefundConfirmDialog";
import OrderStatusCard from "@/components/order/OrderStatusCard";
import OrderSupportBar from "@/components/order/OrderSupportBar";
import GuideActions from "@/components/order/GuideActions";
import UserActions from "@/components/order/UserActions";
import { Badge } from "@/components/ui/badge";

export default function OrderDetail() {
  const [, params] = useRoute("/orders/:id");
  const [, setLocation] = useLocation();
  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [showCSDialog, setShowCSDialog] = useState(false);
  const [csQrCode, setCsQrCode] = useState<string | null>(null);
  
  // Refund State
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  
  // Overtime States
  const [showOvertimeDialog, setShowOvertimeDialog] = useState(false);
  const [pendingOvertime, setPendingOvertime] = useState<{ id: number; amount: number } | null>(null);
  const [showOvertimePayment, setShowOvertimePayment] = useState(false);
  
  // User & Guide Status
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Load current user
    getCurrentUser().then(res => {
      if(res.code === 0) setCurrentUser(res.data || null);
    });

    // Fetch CS config
    getPublicConfigs().then(res => {
        if (res.code === 0 && res.data && res.data.cs_qrcode_url) {
            setCsQrCode(res.data.cs_qrcode_url);
        }
    });

    if (params?.id) {
      fetchOrder(parseInt(params.id));
    }
  }, [params?.id]);

  const fetchOrder = async (id: number) => {
    try {
      const res = await getOrderById(id);
      if (res.code === 0 && res.data) {
        setOrder(res.data);
        
        // Fetch Guide Info if guideId exists
        if (res.data.guideId) {
          getGuideDetail(res.data.guideId).then(gRes => {
            if (gRes.code === 0 && gRes.data) {
              setGuide(gRes.data);
            }
          });
        }
      } else {
        toast.error(res.message || "获取订单失败");
      }
    } catch (error) {
      console.error("Fetch order error:", error);
      toast.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const isGuideView = currentUser && order && currentUser.userId === order.guideId;
  const canStartService = isGuideView && order?.status === OrderStatus.WAITING_SERVICE;
  const canEndService = isGuideView && order?.status === OrderStatus.IN_SERVICE;
  const canRequestOvertime = order?.status === OrderStatus.IN_SERVICE && currentUser?.userId === order.userId;
  // Use == for loose equality to handle string/number mismatch
  const canRefund = order && [OrderStatus.PAID, OrderStatus.WAITING_SERVICE].includes(order.status) && currentUser && currentUser.userId == order.userId;

  const handlePaymentSuccess = () => {
    if (order) {
      fetchOrder(order.id); // 刷新状态
    }
  };

  const handleOvertimeCreated = (overtimeId: number, amount: number) => {
    setPendingOvertime({ id: overtimeId, amount });
    setShowOvertimePayment(true);
  };

  const handleOvertimePaymentSuccess = () => {
      // Refresh order to see updated status/amounts
      if (order) fetchOrder(order.id);
      setShowOvertimePayment(false);
      setPendingOvertime(null);
  };

  const handleOvertimePayConfirm = async () => {
      if (!pendingOvertime) return;
      const toastId = toast.loading("正在支付加时费...");
      try {
          await payOvertime(pendingOvertime.id, 'wechat');
          toast.success("支付成功", { id: toastId });
          handleOvertimePaymentSuccess();
      } catch (error: any) {
          toast.error(error.message || "支付失败", { id: toastId });
      }
  };

  const handleRequestOvertime = () => {
    if (!order) return;
    if (!order.pricePerHour) {
        toast.error("当前订单未设置加时单价，无法自助加时，请联系客服");
        return;
    }
    setShowOvertimeDialog(true);
  };

  const handleRefundConfirm = async () => {
    if (!order) return;
    const toastId = toast.loading("正在处理退款申请...");
    try {
      const res = await refundOrder(order.id);
      if (res.code === 0 && res.data) {
        toast.success(res.data.message || "退款申请成功", { id: toastId });
        setShowRefundDialog(false);
        fetchOrder(order.id); // Refresh
      } else {
        toast.error(res.message || "退款申请失败", { id: toastId });
      }
    } catch (error: any) {
      toast.error(error.message || "网络错误，请稍后重试", { id: toastId });
    }
  };

  // 简化的状态Badge获取
  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string, className: string }> = {
      [OrderStatus.PENDING]: { label: '待支付', className: 'bg-yellow-100 text-yellow-800' },
      [OrderStatus.PAID]: { label: '待接单', className: 'bg-blue-100 text-blue-800' },
      [OrderStatus.WAITING_SERVICE]: { label: '待服务', className: 'bg-blue-100 text-blue-800' },
      [OrderStatus.IN_SERVICE]: { label: '服务中', className: 'bg-green-100 text-green-800' },
      [OrderStatus.SERVICE_ENDED]: { label: '服务结束', className: 'bg-gray-100 text-gray-800' },
      [OrderStatus.COMPLETED]: { label: '已完成', className: 'bg-gray-100 text-gray-800' },
      [OrderStatus.CANCELLED]: { label: '已取消', className: 'bg-red-100 text-red-800' },
      [OrderStatus.REFUNDED]: { label: '已退款', className: 'bg-gray-100 text-gray-800' },
    };
    
    const config = map[status];
    if (config) {
      return <Badge variant="secondary" className={config.className}>{config.label}</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">加载中...</div>;
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500">订单不存在</p>
        <Button onClick={() => setLocation("/")}>返回首页</Button>
      </div>
    );
  }

  const isCustom = order.orderType === 'custom';
  const customReq = order.customRequirements;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-64">
      {/* 顶部导航 */}
      <div className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 px-4 py-3 flex items-center bg-gradient-to-b from-rose-50/50 to-white/0">
        <Button variant="ghost" size="icon" className="-ml-2 mr-2 hover:bg-slate-100 rounded-full" onClick={() => window.history.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">订单详情</h1>
        <Button variant="ghost" size="icon" className="hover:bg-slate-100 rounded-full" onClick={() => setShowCSDialog(true)}>
          <Headphones className="w-5 h-5" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* 状态卡片 */}
        <OrderStatusCard 
          order={order} 
          isGuideView={isGuideView || false} 
          csQrCode={csQrCode} 
        />

        {/* 客服强引导 - 仅在待服务和服务中显示 */}
        {[OrderStatus.WAITING_SERVICE, OrderStatus.IN_SERVICE].includes(order.status as any) && (
          <OrderSupportBar onContactClick={() => setShowCSDialog(true)} />
        )}

        {/* 基本信息 */}
        <Card className="border-none shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex justify-between items-center">
              订单信息
              {getStatusBadge(order.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <span className="text-slate-500 block text-xs mb-0.5">服务时间</span>
                <span className="font-medium">{new Date(order.serviceStartTime || order.serviceDate).toLocaleString()}</span>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <span className="text-slate-500 block text-xs mb-0.5">预约时长</span>
                <span className="font-medium">{order.duration} 小时</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <span className="text-slate-500 block text-xs mb-0.5">约定地点</span>
                <span className="font-medium">{order.serviceAddress}</span>
              </div>
            </div>

            {/* 服务内容展示 */}
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <span className="text-slate-500 block text-xs mb-0.5">服务内容</span>
                <p className="text-slate-900 whitespace-pre-wrap font-medium">
                  {order.content || (isCustom ? "私人定制行程服务" : "标准地陪陪游服务")}
                </p>
              </div>
            </div>

            {/* 备注展示 */}
            {order.requirements && (
                <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-slate-400 mt-0.5" />
                <div className="flex-1">
                    <span className="text-slate-500 block text-xs mb-0.5">备注</span>
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl whitespace-pre-wrap mt-1 text-xs">
                    {order.requirements}
                    </p>
                </div>
                </div>
            )}

            <div className="pt-3 border-t border-slate-100 mt-2">
                <div className="flex justify-between text-xs text-slate-400">
                    <span>订单编号</span>
                    <span className="font-mono">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>下单时间</span>
                    <span>{new Date(order.createdAt).toLocaleString()}</span>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* 需求详情 */}
        {isCustom && customReq && (
          <Card className="border-none shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">定制需求</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="text-slate-500 block text-xs">目的地</span>
                  <span>{customReq.destination}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="text-slate-500 block text-xs">日期</span>
                  <span>{customReq.startDate}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <span className="text-slate-500 block text-xs">需求描述</span>
                  <p className="mt-1 text-slate-700 leading-relaxed bg-slate-50 p-2 rounded-xl">
                    {customReq.specialRequirements}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 费用明细 */}
        <Card className="border-none shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">费用明细</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500">订单原价</span>
              <Price amount={order.amount} />
            </div>
            
            {/* 地陪视角显示平台服务费 */}
            {isGuideView && order.guideIncome && (
              <div className="flex justify-between text-slate-400">
                <span>平台服务费</span>
                <span>- <Price amount={Number(order.totalAmount || order.amount) - Number(order.guideIncome)} /></span>
              </div>
            )}

            {/* Overtime Records List */}
            {order.overtimeRecords && order.overtimeRecords.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                    {order.overtimeRecords.map(record => (
                        <div key={record.id} className="flex justify-between items-center text-xs">
                            <div className="flex flex-col">
                                <span className="font-medium text-slate-700">加时 {record.duration}小时</span>
                                <span className="text-slate-400 scale-90 origin-left">
                                    {new Date(record.createdAt).toLocaleString([], {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                                </span>
                            </div>
                            <Price amount={record.fee} />
                        </div>
                    ))}
                </div>
            )}
            
            {/* Refund Info - Removed redundant red row */}

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="font-bold text-slate-900">{isGuideView ? '本单收入' : '实付总额'}</span>
              {isGuideView ? (
                <Price amount={order.guideIncome} className="text-lg font-black text-rose-500" />
              ) : (
                <div className="text-right">
                  <Price 
                    amount={order.totalAmount || order.amount} 
                    className={`text-lg font-black ${order.status === OrderStatus.REFUNDED ? 'text-slate-400 line-through' : 'text-slate-900'}`} 
                  />
                </div>
              )}
            </div>

            {order.status === OrderStatus.REFUNDED && order.refundAmount && (
              <div className="pt-4 mt-2 border-t border-slate-100 flex flex-col items-center">
                <span className="text-sm text-slate-500 mb-1">已退款金额</span>
                <Price amount={order.refundAmount} className="text-xl font-bold text-green-600" />
                <span className="text-xs text-slate-400 mt-1">资金预计1-3个工作日到账</span>
              </div>
            )}

            {canRefund && (
              <div className="pt-4 mt-2 border-t border-slate-100 flex justify-center">
                <Button 
                  variant="ghost" 
                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 w-full rounded-full"
                  onClick={() => setShowRefundDialog(true)}
                >
                  申请退款
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 safe-area-bottom z-50 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
        
        {/* 地陪视角操作栏 */}
        {isGuideView ? (
          <GuideActions 
            order={order} 
            onOrderUpdated={(id) => fetchOrder(id)} 
          />
        ) : (
          /* 用户视角操作栏 */
          <UserActions 
            order={order}
            currentUser={currentUser}
            onShowPayment={() => setShowPayment(true)}
            onRequestOvertime={handleRequestOvertime}
          />
        )}
      </div>
      
      </div>

      <PaymentSheet 
        orderId={order.id}
        amount={order.amount}
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePaymentSuccess}
      />

      {order && (
        <RefundConfirmDialog 
          isOpen={showRefundDialog}
          onClose={() => setShowRefundDialog(false)}
          onConfirm={handleRefundConfirm}
          hoursSincePaid={(() => {
             if (!order.paidAt) return 0;
             const paidTime = new Date(order.paidAt).getTime();
             const now = Date.now();
             return (now - paidTime) / (1000 * 60 * 60);
          })()} 
        />
      )}

      <OvertimeDialog 
        isOpen={showOvertimeDialog}
        onClose={() => setShowOvertimeDialog(false)}
        orderId={order.id}
        pricePerHour={order.pricePerHour || 0}
        onSuccess={handleOvertimeCreated}
      />
      
      {/* Overtime Payment Confirmation Dialog (Simple) */}
      {showOvertimePayment && pendingOvertime && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center bg-black/50 p-4">
              <div className="bg-white w-full max-w-md rounded-xl p-6 space-y-4 animate-in slide-in-from-bottom-10 fade-in">
                  <h3 className="text-lg font-bold text-center">支付加时费</h3>
                  <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600 mb-1"><Price amount={pendingOvertime.amount} /></div>
                      <p className="text-sm text-gray-500">微信支付</p>
                  </div>
                  <Button 
                    className="w-full bg-[#07C160] hover:bg-[#06AD56]" 
                    size="lg"
                    onClick={handleOvertimePayConfirm}
                  >
                    立即支付
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => setShowOvertimePayment(false)}>取消</Button>
              </div>
          </div>
      )}

      {order.status !== OrderStatus.PENDING && !canStartService && !canEndService && !canRequestOvertime && <BottomNav />}
      
      <ContactCSDialog isOpen={showCSDialog} onClose={() => setShowCSDialog(false)} />
    </div>
  );
}
