import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, ChevronRight, MapPin, Calendar } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getOrders, OrderDetailResponse } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

import EmptyState from "@/components/EmptyState";

// 订单状态映射
const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "待支付", color: "text-orange-600 bg-orange-50 border-orange-200", icon: Clock },
  paid: { label: "待服务", color: "text-blue-600 bg-blue-50 border-blue-200", icon: Package },
  waiting_for_user: { label: "待确认", color: "text-purple-600 bg-purple-50 border-purple-200", icon: CheckCircle },
  in_progress: { label: "进行中", color: "text-indigo-600 bg-indigo-50 border-indigo-200", icon: Package },
  completed: { label: "已完成", color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle },
  cancelled: { label: "已取消", color: "text-gray-600 bg-gray-50 border-gray-200", icon: XCircle },
};

export default function OrderList() {
  const [activeTab, setActiveTab] = useState("all");
  const [orders, setOrders] = useState<OrderDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await getOrders(activeTab);
      if (res.code === 0 && res.data) {
        setOrders(res.data);
      } else {
        toast.error(res.message || "获取订单失败");
      }
    } catch (error: any) {
      console.error("获取订单错误:", error);
      toast.error("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 渲染订单卡片
  const renderOrderCard = (order: OrderDetailResponse) => {
    const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "text-gray-500", icon: Package };
    const StatusIcon = statusInfo.icon;
    
    // 目的地显示逻辑：优先显示 customRequirements.destination，否则显示 "标准服务"
    const destination = order.customRequirements?.destination || "标准服务";

    return (
      <Card 
        key={order.id} 
        className="mb-4 border-gray-100 shadow-sm active:scale-[0.99] transition-transform"
        onClick={() => setLocation(`/orders/${order.id}`)}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`font-normal ${statusInfo.color} flex items-center gap-1`}>
                <StatusIcon className="w-3 h-3" />
                {statusInfo.label}
              </Badge>
              <span className="text-xs text-gray-400">{order.orderNumber}</span>
            </div>
            <span className="font-bold text-gray-900">¥{order.amount}</span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
              {destination}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
              {order.serviceDate}
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
            <span className="text-xs text-gray-400">
              {new Date(order.createdAt).toLocaleDateString()}
            </span>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500 hover:text-gray-900 p-0">
              查看详情 <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">请先登录后查看订单</p>
        <Button onClick={() => setLocation("/login")}>去登录</Button>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部标题 */}
      <div className="bg-white sticky top-0 z-10 px-4 py-3 border-b flex items-center justify-center">
        <h1 className="text-lg font-bold">我的订单</h1>
      </div>

      {/* 状态筛选 Tabs */}
      <div className="sticky top-[53px] z-10 bg-gray-50 px-4 pt-2 pb-2">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-5 bg-white border">
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="pending">待支付</TabsTrigger>
            <TabsTrigger value="paid">待服务</TabsTrigger>
            <TabsTrigger value="waiting_for_user">待确认</TabsTrigger>
            <TabsTrigger value="completed">已完成</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 订单列表 */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-10 text-gray-400 text-sm">加载中...</div>
        ) : orders.length > 0 ? (
          orders.map(renderOrderCard)
        ) : (
          <EmptyState 
            icon={Package} 
            title="暂无订单" 
            description="您还没有相关的订单记录"
            action={<Button onClick={() => setLocation("/guides")}>去逛逛</Button>}
          />
        )}
      </div>

      <BottomNav />
    </div>
  );
}
