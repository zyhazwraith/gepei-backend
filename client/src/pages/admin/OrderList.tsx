import { useState, useEffect } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { getAdminOrders, updateOrderStatus, assignGuide, getGuides, AdminOrder, Pagination, Guide } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight, UserPlus, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// 状态映射
const STATUS_MAP: Record<string, { label: string; color: string; textColor: string }> = {
  pending: { label: "待支付", color: "bg-orange-100 border-orange-200", textColor: "text-orange-800" },
  paid: { label: "待服务", color: "bg-blue-100 border-blue-200", textColor: "text-blue-800" },
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

  // 指派相关状态
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [guideList, setGuideList] = useState<Guide[]>([]);
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [selectedGuideId, setSelectedGuideId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchOrders(page);
  }, [page]);

  const fetchOrders = async (p: number) => {
    setLoading(true);
    try {
      const res = await getAdminOrders(p);
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

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await updateOrderStatus(orderId, newStatus);
      if (res.code === 0) {
        toast.success("状态更新成功");
        // 更新本地列表
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

  const handleAssignConfirm = async () => {
    if (!selectedOrder || !selectedGuideId) return;
    
    setAssigning(true);
    try {
      const res = await assignGuide(selectedOrder.id, selectedGuideId);
      if (res.code === 0) {
        toast.success("指派成功");
        setAssignDialogOpen(false);
        // 更新列表状态
        setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, status: 'in_progress' } : o));
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
      <div className="bg-white rounded-lg border shadow-sm flex flex-col h-full">
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
                      <TableCell className="font-medium text-gray-900">{order.orderNumber}</TableCell>
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
                      <TableCell className="text-gray-900">¥{order.amount}</TableCell>
                      <TableCell className="text-gray-900">{order.serviceDate}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${statusInfo.color} ${statusInfo.textColor} border`}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {/* 只有定制单且状态允许时显示指派按钮 */}
                          {order.orderType === 'custom' && ['pending', 'paid'].includes(order.status) && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleAssignClick(order)}
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              指派
                            </Button>
                          )}
                          
                          <Select
                            disabled={updatingId === order.id}
                            onValueChange={(val) => handleStatusChange(order.id, val)}
                            value={order.status}
                          >
                            <SelectTrigger className="w-[120px] h-8">
                              <SelectValue placeholder="修改状态" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">待支付</SelectItem>
                              <SelectItem value="paid">待服务</SelectItem>
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

        {/* 分页器 */}
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
        {/* 指派地陪弹窗 */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>指派地陪</DialogTitle>
              <DialogDescription>
                为订单 {selectedOrder?.orderNumber} 选择一位地陪。
                指派后，订单状态将变为"进行中/待服务"。
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
                        key={guide.id}
                        onClick={() => setSelectedGuideId(guide.id)}
                        className={`flex items-center p-3 rounded-md cursor-pointer transition-colors ${
                          selectedGuideId === guide.id ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <Avatar className="w-10 h-10 mr-3">
                          <AvatarFallback>{guide.name.slice(0, 1)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium flex items-center">
                            {guide.name}
                            {selectedGuideId === guide.id && <Check className="w-4 h-4 ml-2 text-primary" />}
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
                disabled={!selectedGuideId || assigning}
              >
                {assigning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    处理中...
                  </>
                ) : (
                  "确认指派"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
