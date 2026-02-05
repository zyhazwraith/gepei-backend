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
import { Loader2, ChevronLeft, ChevronRight, UserPlus, Check, Search, Plus, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// 状态映射
const STATUS_MAP: Record<string, { label: string; color: string; textColor: string }> = {
  pending: { label: "待支付", color: "bg-orange-100 border-orange-200", textColor: "text-orange-800" },
  paid: { label: "待服务", color: "bg-blue-100 border-blue-200", textColor: "text-blue-800" },
  waiting_for_user: { label: "待确认", color: "bg-yellow-100 border-yellow-200", textColor: "text-yellow-800" },
  in_progress: { label: "进行中", color: "bg-purple-100 border-purple-200", textColor: "text-purple-800" },
  completed: { label: "已完成", color: "bg-green-100 border-green-200", textColor: "text-green-800" },
  cancelled: { label: "已取消", color: "bg-gray-100 border-gray-200", textColor: "text-gray-800" },
};

export default function AdminOrderList() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");

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
  }, [page]);

  const fetchOrders = async (p: number) => {
    setLoading(true);
    try {
      const res = await getAdminOrders(p, 20, keyword);
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
    setPage(1); // 重置到第一页
    fetchOrders(1);
  };

  const handleCreateSuccess = (newOrderId: number) => {
    fetchOrders(1);
    handleViewDetail(newOrderId);
  };

  const handleViewDetail = (orderId: number) => {
    setDetailOrderId(orderId);
    setDetailDialogOpen(true);
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await updateOrderStatus(orderId, newStatus);
      if (res.code === 0) {
        toast.success("状态更新成功");
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
      } else {
        toast.error(res.message || "更新失败");
      }
    } catch (error) {
      toast.error("网络错误，更新失败");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssignClick = async (order: AdminOrder) => {
    setSelectedOrder(order);
    setAssignDialogOpen(true);
    setLoadingGuides(true);
    try {
      const res = await getGuides();
      if (res.code === 0 && res.data) {
        setGuideList(res.data.list);
      }
    } catch (error) {
      toast.error("获取地陪列表失败");
    } finally {
      setLoadingGuides(false);
    }
  };

  const toggleGuideSelection = (guideId: number) => {
    setSelectedGuideIds(prev => 
      prev.includes(guideId) 
        ? prev.filter(id => id !== guideId) 
        : [...prev, guideId]
    );
  };

  const handleAssignConfirm = async () => {
    if (!selectedOrder || selectedGuideIds.length === 0) return;
    
    setAssigning(true);
    try {
      const res = await assignGuide(selectedOrder.id, selectedGuideIds);
      if (res.code === 0) {
        toast.success("指派成功");
        setAssignDialogOpen(false);
        const newStatus = selectedOrder.orderType === 'custom' ? 'waiting_for_user' : 'in_progress';
        setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, status: newStatus as any } : o));
      } else {
        toast.error(res.message || "指派失败");
      }
    } catch (error) {
      toast.error("操作失败，请重试");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <AdminLayout title="订单管理">
      <div className="bg-white text-slate-900 rounded-lg border shadow-sm flex flex-col h-full">
        {/* 工具栏 */}
        <div className="p-4 border-b flex justify-between items-center">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索订单号 / 手机号"
                className="pl-9 h-9"
              />
            </div>
            <Button type="submit" size="sm">搜索</Button>
          </form>
          <Button 
            onClick={() => setCreateDialogOpen(true)} 
            size="sm"
            data-testid="create-custom-order-btn"
          >
            <Plus className="w-4 h-4 mr-1" />
            创建定制订单
          </Button>
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
                  <TableHead>订单号</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>目的地/服务</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>服务日期</TableHead>
                  <TableHead>当前状态</TableHead>
                  <TableHead>操作 (强制改状态)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "bg-gray-100", textColor: "text-gray-800" };
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-gray-900">
                        <div 
                          className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors group"
                          onClick={() => handleViewDetail(order.id)}
                        >
                          {order.orderNumber}
                          <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-gray-900">{order.userNickname}</span>
                          <span className="text-xs text-gray-500">{order.userPhone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-900">
                        {order.orderType === 'custom' ? '定制单' : '普通单'}
                      </TableCell>
                      <TableCell className="text-gray-900">
                        {order.customRequirements?.destination || '-'}
                      </TableCell>
                      <TableCell className="text-gray-900"><Price amount={order.amount} /></TableCell>
                      <TableCell className="text-gray-900">{order.serviceDate}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${statusInfo.color} ${statusInfo.textColor} border`}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {order.orderType === 'custom' && ['pending', 'paid'].includes(order.status) && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              data-testid={`assign-btn-${order.id}`}
                              onClick={() => handleAssignClick(order)}
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              指派
                            </Button>
                          )}
                          
                          <Select
                            disabled={updatingId === order.id}
                            onValueChange={(val) => handleStatusChange(order.id, val as AdminOrder['status'])}
                            value={order.status}
                          >
                            <SelectTrigger className="w-[120px] h-8">
                              <SelectValue placeholder="修改状态" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">待支付</SelectItem>
                              <SelectItem value="paid">待服务</SelectItem>
                              <SelectItem value="waiting_for_user">待确认</SelectItem>
                              <SelectItem value="in_progress">进行中</SelectItem>
                              <SelectItem value="completed">已完成</SelectItem>
                              <SelectItem value="cancelled">已取消</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
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
                          <div className="text-xs text-gray-500">{guide.city} · ¥{guide.hourlyPrice}/小时</div>
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
