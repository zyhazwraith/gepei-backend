import { useState, useEffect } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { getAdminOrders, updateOrderStatus, AdminOrder } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// 状态映射
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "待支付", color: "bg-orange-500" },
  paid: { label: "待服务", color: "bg-blue-500" },
  in_progress: { label: "进行中", color: "bg-purple-500" },
  completed: { label: "已完成", color: "bg-green-500" },
  cancelled: { label: "已取消", color: "bg-gray-500" },
};

export default function AdminOrderList() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await getAdminOrders();
      if (res.code === 0 && res.data) {
        setOrders(res.data);
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

  return (
    <AdminLayout title="订单管理">
      <div className="bg-white rounded-lg border shadow-sm">
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
                const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: "bg-gray-500" };
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{order.userNickname}</span>
                        <span className="text-xs text-gray-400">{order.userPhone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.orderType === 'custom' ? '定制单' : '普通单'}
                    </TableCell>
                    <TableCell>
                      {order.custom_requirements?.destination || '-'}
                    </TableCell>
                    <TableCell>¥{order.amount}</TableCell>
                    <TableCell>{order.serviceDate}</TableCell>
                    <TableCell>
                      <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                    </TableCell>
                    <TableCell>
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
    </AdminLayout>
  );
}
