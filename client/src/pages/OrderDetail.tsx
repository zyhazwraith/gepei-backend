import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, MapPin, Calendar, Clock, AlertCircle, Headphones, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getOrderById, getCurrentUser, OrderDetailResponse, User, payOvertime, getPublicConfigs, getGuideDetail, Guide } from "@/lib/api";
import Price from "@/components/Price";
import BottomNav from "@/components/BottomNav";
import PaymentSheet from "@/components/PaymentSheet";
import OvertimeDialog from "@/components/OvertimeDialog";
import ContactCSDialog from "@/components/ContactCSDialog";
import OrderStatusCard from "@/components/order/OrderStatusCard";
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
  const canStartService = isGuideView && order?.status === 'waiting_service';
  const canEndService = isGuideView && order?.status === 'in_service';
  const canRequestOvertime = order?.status === 'in_service' && currentUser?.userId === order.userId;

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

  // 简化的状态Badge获取
  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string, className: string }> = {
      pending: { label: '待支付', className: 'bg-yellow-100 text-yellow-800' },
      paid: { label: '待接单', className: 'bg-blue-100 text-blue-800' },
      waiting_service: { label: '待服务', className: 'bg-blue-100 text-blue-800' },
      in_service: { label: '服务中', className: 'bg-green-100 text-green-800' },
      service_ended: { label: '服务结束', className: 'bg-gray-100 text-gray-800' },
      completed: { label: '已完成', className: 'bg-gray-100 text-gray-800' },
      cancelled: { label: '已取消', className: 'bg-red-100 text-red-800' },
      refunded: { label: '已退款', className: 'bg-gray-100 text-gray-800' },
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
    <div className="min-h-screen bg-gray-50 pb-64">
      {/* 顶部导航 */}
      <div className="bg-white sticky top-0 z-10 px-4 py-3 border-b flex items-center">
        <Button variant="ghost" size="icon" className="-ml-2 mr-2" onClick={() => window.history.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">订单详情</h1>
        <Button variant="ghost" size="icon" onClick={() => setShowCSDialog(true)}>
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

        {/* 基本信息 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex justify-between items-center">
              订单信息
              {getStatusBadge(order.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <span className="text-gray-500 block text-xs">服务时间</span>
                <span>{new Date(order.serviceStartTime || order.serviceDate).toLocaleString()}</span>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <span className="text-gray-500 block text-xs">预约时长</span>
                <span>{order.duration} 小时</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <span className="text-gray-500 block text-xs">约定地点</span>
                <span>{order.serviceAddress}</span>
              </div>
            </div>

            {/* 服务内容展示 */}
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <span className="text-gray-500 block text-xs">服务内容</span>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {order.content || (isCustom ? "私人定制行程服务" : "标准地陪陪游服务")}
                </p>
              </div>
            </div>

            {/* 备注展示 */}
            {order.requirements && (
                <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                    <span className="text-gray-500 block text-xs">备注</span>
                    <p className="text-gray-700 leading-relaxed bg-gray-50 p-2 rounded whitespace-pre-wrap mt-1">
                    {order.requirements}
                    </p>
                </div>
                </div>
            )}

            <div className="pt-3 border-t mt-2">
                <div className="flex justify-between text-xs text-gray-400">
                    <span>订单编号</span>
                    <span className="font-mono">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>下单时间</span>
                    <span>{new Date(order.createdAt).toLocaleString()}</span>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* 需求详情 */}
        {isCustom && customReq && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">定制需求</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <span className="text-gray-500 block text-xs">目的地</span>
                  <span>{customReq.destination}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <span className="text-gray-500 block text-xs">日期</span>
                  <span>{customReq.startDate}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <span className="text-gray-500 block text-xs">需求描述</span>
                  <p className="mt-1 text-gray-700 leading-relaxed bg-gray-50 p-2 rounded">
                    {customReq.specialRequirements}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 费用明细 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">费用明细</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">订单原价</span>
              <Price amount={order.amount} />
            </div>
            
            {/* 地陪视角显示平台服务费 */}
            {isGuideView && order.guideIncome && (
              <div className="flex justify-between text-gray-400">
                <span>平台服务费</span>
                <span>- <Price amount={Number(order.totalAmount || order.amount) - Number(order.guideIncome)} /></span>
              </div>
            )}

            {/* Overtime Records List */}
            {order.overtimeRecords && order.overtimeRecords.length > 0 && (
                <div className="pt-2 border-t space-y-2">
                    {order.overtimeRecords.map(record => (
                        <div key={record.id} className="flex justify-between items-center text-xs">
                            <div className="flex flex-col">
                                <span className="font-medium text-gray-700">加时 {record.duration}小时</span>
                                <span className="text-gray-400 scale-90 origin-left">
                                    {new Date(record.createdAt).toLocaleString([], {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                                </span>
                            </div>
                            <Price amount={record.fee} />
                        </div>
                    ))}
                </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-medium">{isGuideView ? '本单收入' : '实付总额'}</span>
              {isGuideView ? (
                <Price amount={order.guideIncome} className="text-lg font-bold text-red-600" />
              ) : (
                <Price amount={order.totalAmount || order.amount} className="text-lg font-bold text-gray-900" />
              )}
            </div>
          </CardContent>
        </Card>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t safe-area-bottom z-50">
        
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

      {order.status !== 'pending' && !canStartService && !canEndService && !canRequestOvertime && <BottomNav />}
      
      <ContactCSDialog isOpen={showCSDialog} onClose={() => setShowCSDialog(false)} />
    </div>
  );
}
