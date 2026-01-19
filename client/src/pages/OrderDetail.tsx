import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, MapPin, Calendar, CreditCard, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getOrderById, payOrder, OrderDetailResponse } from "@/lib/api";
import BottomNav from "@/components/BottomNav";

export default function OrderDetail() {
  const [, params] = useRoute("/orders/:id");
  const [, setLocation] = useLocation();
  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (params?.id) {
      fetchOrder(parseInt(params.id));
    }
  }, [params?.id]);

  const fetchOrder = async (id: number) => {
    try {
      const res = await getOrderById(id);
      if (res.code === 0 && res.data) {
        setOrder(res.data);
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

  const handlePayment = async () => {
    if (!order) return;
    
    setPaying(true);
    try {
      const res = await payOrder(order.id, "wechat");
      if (res.code === 0) {
        toast.success("支付成功");
        fetchOrder(order.id); // 刷新状态
      } else {
        toast.error(res.message || "支付失败");
      }
    } catch (error) {
      toast.error("支付出错，请重试");
    } finally {
      setPaying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">待支付</Badge>;
      case 'paid':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">待接单</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">进行中</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">已完成</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">已取消</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
  const customReq = order.custom_requirements;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部导航 */}
      <div className="bg-white sticky top-0 z-10 px-4 py-3 border-b flex items-center">
        <Button variant="ghost" size="icon" className="-ml-2 mr-2" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">订单详情</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* 状态卡片 */}
        <Card className="border-none shadow-sm bg-gradient-to-r from-orange-50 to-orange-100">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
            <div className="p-3 bg-white/50 rounded-full">
               {order.status === 'paid' ? <Clock className="w-8 h-8 text-orange-600" /> : 
                order.status === 'pending' ? <CreditCard className="w-8 h-8 text-orange-600" /> :
                <CheckCircle2 className="w-8 h-8 text-orange-600" />}
            </div>
            <h2 className="text-xl font-bold text-orange-900">
              {order.status === 'pending' ? '等待支付' : 
               order.status === 'paid' ? '等待地陪接单' : 
               '订单进行中'}
            </h2>
            <p className="text-sm text-orange-800/80">
              {order.status === 'pending' ? '请在 30 分钟内完成支付' : 
               order.status === 'paid' ? '系统正在为您匹配合适的地陪' : 
               '祝您旅途愉快'}
            </p>
          </CardContent>
        </Card>

        {/* 基本信息 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex justify-between items-center">
              基本信息
              {getStatusBadge(order.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">订单编号</span>
              <span className="font-mono">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">下单时间</span>
              <span>{new Date(order.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">订单类型</span>
              <Badge variant="outline" className={isCustom ? "text-orange-600 border-orange-200 bg-orange-50" : "text-blue-600 border-blue-200 bg-blue-50"}>
                {isCustom ? "私人定制" : "普通预约"}
              </Badge>
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
              <span className="text-gray-500">订金</span>
              <span>¥{order.amount}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-medium">实付金额</span>
              <span className="text-lg font-bold text-orange-600">¥{order.amount}</span>
            </div>
          </CardContent>
        </Card>

        {/* 底部操作栏 (仅在待支付时显示) */}
        {order.status === 'pending' && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t safe-area-bottom">
            <Button 
              className="w-full bg-[#07C160] hover:bg-[#06AD56]" 
              size="lg"
              onClick={handlePayment}
              disabled={paying}
            >
              {paying ? "支付中..." : `微信支付 ¥${order.amount}`}
            </Button>
          </div>
        )}
      </div>

      {order.status !== 'pending' && <BottomNav />}
    </div>
  );
}
