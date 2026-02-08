import { useState, useEffect } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { getAdminOrders, updateOrderStatus, assignGuide, getGuides, AdminOrder, Pagination, Guide } from "@/lib/api";
import CreateCustomOrderDialog from "@/components/admin/CreateCustomOrderDialog";
import OrderDetailDialog from "@/components/admin/OrderDetailDialog";
import Price from "@/components/Price";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight, UserPlus, Check, Search, Plus, Eye, MapPin, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// 状态映射
const STATUS_MAP: Record<string, { label: string; color: string; textColor: string }> = {
  pending: { label: "待支付", color: "bg-orange-100 border-orange-200", textColor: "text-orange-800" },
  paid: { label: "已支付", color: "bg-blue-100 border-blue-200", textColor: "text-blue-800" },
  waiting_service: { label: "待服务", color: "bg-indigo-100 border-indigo-200", textColor: "text-indigo-800" },
  in_service: { label: "服务中", color: "bg-green-100 border-green-200", textColor: "text-green-800" },
  service_ended: { label: "服务结束", color: "bg-emerald-100 border-emerald-200", textColor: "text-emerald-800" },
  completed: { label: "已完成", color: "bg-slate-100 border-slate-200", textColor: "text-slate-800" },
  cancelled: { label: "已取消", color: "bg-gray-100 border-gray-200", textColor: "text-gray-500" },
  refunded: { label: "已退款", color: "bg-red-100 border-red-200", textColor: "text-red-800" },
};

const ORDER_TABS = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待支付" },
  { value: "paid,waiting_service", label: "待服务" },
  { value: "in_service", label: "服务中" },
  { value: "service_ended,completed", label: "已完成" },
  { value: "cancelled,refunded", label: "取消/退款" },
];

export default function AdminOrderList() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");

  // Create & Detail Dialog States
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<number | null>(null);

  // 指派相关状态
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [guideList, setGuideList] = useState<Guide[]>([]);
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [selectedGuideIds, setSelectedGuideIds] = useState<number[]>([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchOrders(page);
  }, [page, status]);

  const fetchOrders = async (p: number) => {
    setLoading(true);
    try {
      const res = await getAdminOrders(p, 20, keyword, status);
      if (res.code === 0 && res.data) {
        setOrders(res.data.list);
        setPagination(res.data.pagination);
      }
    } catch (error) {
      toast.error("获取订单列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders(1);
  };

  const handleTabChange = (val: string) => {
    setStatus(val);
    setPage(1);
  };
  
  const handleCreateSuccess = (newOrderId: number) => {
    fetchOrders(1);
    handleViewDetail(newOrderId);
  };

  const handleViewDetail = (orderId: number) => {
    setDetailOrderId(orderId);
    setDetailDialogOpen(true);
  };

  const handleAssignConfirm = async () => {
    // Note: Assign feature might be moved to Detail Dialog in future,
    // but we keep it here if we want to support list-view assignment.
    // Currently, the "Assign" button was removed from the list view during cleanup.
    // If we want to restore it, we need to add the button back to columns.
    // For now, this function is only used by the Dialog which is rendered at the bottom.
    if (!selectedOrder || selectedGuideIds.length === 0) return;
    
    setAssigning(true);
    try {
      const res = await assignGuide(selectedOrder.id, selectedGuideIds);
      if (res.code === 0) {
        toast.success("指派成功");
        setAssignDialogOpen(false);
        fetchOrders(page);
      }
    } catch (error) {
      toast.error("指派失败");
    } finally {
      setAssigning(false);
    }
  };

  const toggleGuideSelection = (guideId: number) => {
    setSelectedGuideIds(prev => 
      prev.includes(guideId) 
        ? prev.filter(id => id !== guideId) 
        : [...prev, guideId]
    );
  };

  return (
    <AdminLayout title="订单管理">
      <div className="bg-white text-slate-900 rounded-lg border shadow-sm flex flex-col h-full">
        {/* 工具栏 */}
        <div className="p-4 border-b flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 flex-1">
              <Tabs value={status} onValueChange={handleTabChange} className="w-full max-w-2xl">
                <TabsList>
                  {ORDER_TABS.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <Button 
              onClick={() => setCreateDialogOpen(true)} 
              size="sm"
              data-testid="create-custom-order-btn"
            >
              <Plus className="w-4 h-4 mr-1" />
              创建定制订单
            </Button>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索订单号 / 用户手机 / 创建人 / 地陪 / 用户昵称"
                className="pl-9 h-9"
              />
            </div>
            <Button type="submit" size="sm">搜索</Button>
          </form>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">订单信息</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>创建人</TableHead>
                  <TableHead>地陪</TableHead>
                  <TableHead>服务信息</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "bg-gray-100", textColor: "text-gray-500" };
                  
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-mono font-medium">{order.orderNumber}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(order.createdAt).toLocaleString()}
                          </span>
                          <Badge variant="outline" className="w-fit">
                            {order.orderType === 'custom' ? '定制单' : '普通单'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{order.userName}</span>
                          <span className="text-xs text-gray-500 font-mono">{order.userPhone}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                         {order.creatorId ? (
                            <div className="flex flex-col">
                              <span className="text-sm">{order.creatorName}</span>
                              <span className="text-xs text-gray-500 font-mono">{order.creatorPhone}</span>
                            </div>
                         ) : (
                            <span className="text-gray-400 text-xs">-</span>
                         )}
                      </TableCell>
                      <TableCell>
                         {order.guideId ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{order.guideName}</span>
                              <span className="text-xs text-gray-500 font-mono">{order.guidePhone}</span>
                            </div>
                         ) : (
                            <span className="text-gray-400 text-xs">未指派</span>
                         )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                           <div className="flex items-center gap-1 text-gray-700">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <span className="truncate max-w-[150px]" title={order.serviceAddress}>
                                {order.serviceAddress || '-'}
                              </span>
                           </div>
                           <div className="flex items-center gap-1 text-gray-500 text-xs">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span>
                                {order.serviceStartTime ? new Date(order.serviceStartTime).toLocaleString() : '-'} 
                                {order.totalDuration ? ` (${order.totalDuration}h)` : (order.duration ? ` (${order.duration}h)` : '')}
                              </span>
                           </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Price amount={order.totalAmount || order.amount} className="font-bold" />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`${statusInfo.color} ${statusInfo.textColor} border-0`}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewDetail(order.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24 text-gray-500">
                      暂无订单数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {pagination && pagination.total_pages > 1 && (
          <div className="p-4 border-t flex items-center justify-between bg-gray-50">
            <span className="text-sm text-gray-500">
              共 {pagination.total} 条，第 {pagination.page} / {pagination.total_pages} 页
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> 上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
                disabled={page >= pagination.total_pages || loading}
              >
                下一页 <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
        
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>指派地陪</DialogTitle>
              <DialogDescription>
                为订单 {selectedOrder?.orderNumber} 选择地陪。
                {selectedOrder?.orderType === 'custom' 
                  ? '定制单：指派候选人后，订单状态变为"待确认"，需等待客户选择。' 
                  : '普通单：指派后，订单状态将变为"进行中/待服务"。'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              {loadingGuides ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <ScrollArea className="h-[300px] border rounded-md p-2">
                  <div className="space-y-1">
                    {guideList.map(guide => (
                      <div 
                        key={guide.guideId}
                        data-testid={`guide-item-${guide.guideId}`}
                        onClick={() => toggleGuideSelection(guide.guideId)}
                        className={`flex items-center p-3 rounded-md cursor-pointer transition-colors ${
                          selectedGuideIds.includes(guide.guideId) ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <Avatar className="w-10 h-10 mr-3">
                          <AvatarFallback>{guide.nickName?.slice(0, 1) || 'G'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium flex items-center">
                            {guide.nickName}
                            {selectedGuideIds.includes(guide.guideId) && <Check className="w-4 h-4 ml-2 text-primary" />}
                          </div>
                          <div className="text-xs text-gray-500">{guide.city} · <Price amount={guide.price || 0} />/小时</div>
                        </div>
                      </div>
                    ))}
                    {guideList.length === 0 && (
                      <div className="text-center py-8 text-gray-500">暂无地陪数据</div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>取消</Button>
              <Button 
                onClick={handleAssignConfirm} 
                data-testid="confirm-assign-btn"
                disabled={selectedGuideIds.length === 0 || assigning}
              >
                {assigning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    处理中...
                  </>
                ) : (
                  `确认指派 (${selectedGuideIds.length})`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <CreateCustomOrderDialog 
          open={createDialogOpen} 
          onOpenChange={setCreateDialogOpen} 
          onSuccess={handleCreateSuccess}
        />

        <OrderDetailDialog 
          open={detailDialogOpen} 
          onOpenChange={setDetailDialogOpen} 
          orderId={detailOrderId}
        />
      </div>
    </AdminLayout>
  );
}
