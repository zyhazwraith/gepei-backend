import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, ChevronRight, MapPin, Calendar, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getOrders, OrderDetailResponse, OrderStatus } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Price from "@/components/Price";
import { useInView } from "react-intersection-observer";

import EmptyState from "@/components/EmptyState";

// 订单状态映射
const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  [OrderStatus.PENDING]: { label: "待支付", color: "text-orange-600 bg-orange-50 border-orange-200", icon: Clock },
  [OrderStatus.PAID]: { label: "待接单", color: "text-blue-600 bg-blue-50 border-blue-200", icon: Package },
  [OrderStatus.WAITING_SERVICE]: { label: "待服务", color: "text-purple-600 bg-purple-50 border-purple-200", icon: CheckCircle },
  [OrderStatus.IN_SERVICE]: { label: "服务中", color: "text-indigo-600 bg-indigo-50 border-indigo-200", icon: Package },
  [OrderStatus.SERVICE_ENDED]: { label: "服务结束", color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle },
  [OrderStatus.COMPLETED]: { label: "已完成", color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle },
  [OrderStatus.CANCELLED]: { label: "已取消", color: "text-gray-600 bg-gray-50 border-gray-200", icon: XCircle },
  [OrderStatus.REFUNDED]: { label: "已退款", color: "text-gray-600 bg-gray-50 border-gray-200", icon: XCircle },
};

const CUSTOMER_TABS = [
  { id: 'all', label: '全部' },
  { id: OrderStatus.PENDING, label: '待支付' },
  { id: [OrderStatus.PAID, OrderStatus.WAITING_SERVICE, OrderStatus.IN_SERVICE].join(','), label: '进行中' },
  { id: [OrderStatus.SERVICE_ENDED, OrderStatus.COMPLETED].join(','), label: '已完成' },
  { id: [OrderStatus.CANCELLED, OrderStatus.REFUNDED].join(','), label: '已取消' },
];

const GUIDE_TABS = [
  { id: [OrderStatus.PAID, OrderStatus.WAITING_SERVICE, OrderStatus.IN_SERVICE, OrderStatus.SERVICE_ENDED, OrderStatus.COMPLETED].join(','), label: '全部' },
  { id: [OrderStatus.PAID, OrderStatus.WAITING_SERVICE, OrderStatus.IN_SERVICE].join(','), label: '进行中' },
  { id: [OrderStatus.SERVICE_ENDED, OrderStatus.COMPLETED].join(','), label: '已完成' },
];

export default function OrderList() {
  // View Mode: "customer" (我预订的) | "guide" (我服务的)
  const [viewMode, setViewMode] = useState<'customer' | 'guide'>('customer');
  const [activeTab, setActiveTab] = useState("all");

  // Handle View Mode Change (Fix double request)
  const handleViewModeChange = (mode: 'customer' | 'guide') => {
    if (mode === viewMode) return;
    setViewMode(mode);
    setActiveTab(mode === 'customer' ? CUSTOMER_TABS[0].id : GUIDE_TABS[0].id);
    // Data reset and fetch will be triggered by useEffect
  };

  const [orders, setOrders] = useState<OrderDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Infinite Scroll Hook
  const { ref: observerRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px',
  });

  // Reset pagination when tabs change
  useEffect(() => {
    setPage(1);
    setOrders([]);
    setHasMore(true);
    fetchOrders(1);
  }, [activeTab, viewMode]);

  // Handle Infinite Scroll
  useEffect(() => {
    if (inView && !loadingMore && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchOrders(nextPage, true);
    }
  }, [inView, loadingMore, hasMore, loading]);

  const fetchOrders = async (pageNum: number, isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      // Pass both status (activeTab) and viewAs (viewMode)
      const res = await getOrders(activeTab, viewMode, pageNum);
      if (res.code === 0 && res.data) {
        const newOrders = res.data.list;
        if (isLoadMore) {
          setOrders(prev => [...prev, ...newOrders]);
        } else {
          setOrders(newOrders);
        }
        
        // Update hasMore based on pagination info
        const { page, totalPages } = res.data.pagination;
        setHasMore(page < totalPages);
      } else {
        toast.error(res.message || "获取订单失败");
      }
    } catch (error: any) {
      console.error("获取订单错误:", error);
      toast.error("网络错误，请重试");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 渲染订单卡片
  const renderOrderCard = (order: OrderDetailResponse) => {
    const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "text-gray-500", icon: Package };
    const StatusIcon = statusInfo.icon;
    
    // 使用通用字段显示
    const location = order.serviceAddress || "未指定地点";
    
    // 时间显示逻辑
    let timeDisplay = order.serviceDate;
    if (order.serviceStartTime) {
        const start = new Date(order.serviceStartTime);
        const startStr = `${(start.getMonth() + 1).toString().padStart(2, '0')}-${start.getDate().toString().padStart(2, '0')} ${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
        
        if (order.serviceEndTime) {
            const end = new Date(order.serviceEndTime);
            const isSameDay = start.getDate() === end.getDate() && start.getMonth() === end.getMonth();
            const endStr = isSameDay 
                ? `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`
                : `${(end.getMonth() + 1).toString().padStart(2, '0')}-${end.getDate().toString().padStart(2, '0')} ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
            timeDisplay = `${startStr} - ${endStr}`;
        } else {
            timeDisplay = startStr;
        }
    }

    // 收入计算逻辑 (地陪视角)
    const isGuideView = viewMode === 'guide';

    return (
      <Card 
        key={order.id} 
        className="mb-4 border-gray-100 shadow-sm active:scale-[0.99] transition-transform"
        onClick={() => setLocation(`/orders/${order.id}`)}
      >
        <CardHeader className="p-4 pb-1">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-400 font-mono">{order.orderNumber}</span>
            </div>
            <Badge variant="outline" className={`font-normal ${statusInfo.color} flex items-center gap-1`}>
              <StatusIcon className="w-3 h-3" />
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-1 space-y-2">
          {/* 地点 */}
          <div className="flex items-center text-sm text-gray-900 font-medium">
            <MapPin className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
          
          {/* 时间 */}
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
            <span>{timeDisplay}</span>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center">
            {isGuideView ? (
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-red-600">本单收入</span>
                <Price amount={order.guideIncome} className="font-bold text-lg text-red-600" />
              </div>
            ) : (
              <Price amount={order.totalAmount || order.amount} className="font-bold text-lg text-gray-900" />
            )}
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

  const isGuide = user.isGuide; // Check if user is guide

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部标题 & 角色切换 */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-border/40 flex flex-col items-center justify-center">
        <div className="w-full px-4 py-3 flex items-center justify-center relative">
            <h1 className="text-lg font-bold">我的订单</h1>
        </div>
        
        {/* Role Switcher (Only for Guides) */}
        {isGuide && (
            <div className="w-full px-4 pb-3">
                <div className="grid grid-cols-2 p-1 bg-secondary rounded-lg">
                    <button
                        className={`py-1.5 text-sm font-medium rounded-md transition-all ${
                            viewMode === 'customer' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={() => handleViewModeChange('customer')}
                    >
                        我预订的
                    </button>
                    <button
                        className={`py-1.5 text-sm font-medium rounded-md transition-all ${
                            viewMode === 'guide' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={() => handleViewModeChange('guide')}
                    >
                        我服务的
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* 状态筛选 Tabs - 可横向滚动 */}
      <div className={`sticky ${isGuide ? 'top-[105px]' : 'top-[53px]'} z-10 bg-background px-4 pt-3 pb-2 transition-all`}>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(viewMode === 'customer' ? CUSTOMER_TABS : GUIDE_TABS).map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors border ${
                 activeTab === tab.id
                   ? 'bg-primary text-primary-foreground border-primary'
                   : 'bg-background text-muted-foreground border-border hover:bg-secondary'
               }`}
             >
               {tab.label}
             </button>
          ))}
        </div>
      </div>

      {/* 订单列表 */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : orders.length > 0 ? (
          <>
            {orders.map(renderOrderCard)}
            
            {/* Infinite Scroll Loader */}
            <div ref={observerRef} className="flex justify-center pt-4 min-h-[40px] pb-4">
              {loadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">加载中...</span>
                </>
              ) : (
                hasMore && (
                  <span className="text-xs text-muted-foreground opacity-50">上拉加载更多</span>
                )
              )}
              
              {!hasMore && (
                <span className="text-xs text-muted-foreground">没有更多订单了</span>
              )}
            </div>
          </>
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
