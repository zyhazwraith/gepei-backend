import { useState, useEffect } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { getAuditLogs, AuditLog } from "../../lib/api";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Loader2, ChevronLeft, ChevronRight, Search, RotateCcw } from "lucide-react";

// Constants for filters
const ACTIONS = [
  { value: "all", label: "全部动作" },
  { value: "audit_guide", label: "地陪审核" },
  { value: "audit_withdraw", label: "提现审核" },
  { value: "ban_user", label: "封禁用户" },
  { value: "unban_user", label: "解禁用户" },
  { value: "refund_order", label: "订单退款" },
  { value: "update_config", label: "系统配置" },
];

const TARGET_TYPES = [
  { value: "all", label: "全部类型" },
  { value: "guide", label: "地陪" },
  { value: "withdrawal", label: "提现单" },
  { value: "user", label: "用户" },
  { value: "order", label: "订单" },
  { value: "system_config", label: "系统配置" },
];

export default function AuditLogList() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  // Filter states
  const [action, setAction] = useState<string>("all");
  const [targetType, setTargetType] = useState<string>("all");
  const [operatorId, setOperatorId] = useState<string>("");

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAuditLogs({
        page,
        limit: pagination.pageSize,
        action,
        target_type: targetType,
        operator_id: operatorId,
      });

      if (res.code === 0 && res.data) {
        setLogs(res.data.list);
        setPagination({
          page: res.data.pagination.page,
          pageSize: res.data.pagination.pageSize,
          total: res.data.pagination.total,
          totalPages: res.data.pagination.totalPages,
        });
      }
    } catch (error: any) {
      toast.error(error.message || "加载日志失败");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchLogs(1);
  }, []);

  const handleSearch = () => {
    fetchLogs(1);
  };

  const handleReset = () => {
    setAction("all");
    setTargetType("all");
    setOperatorId("");
    setTimeout(() => fetchLogs(1), 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-CN");
  };

  return (
    <AdminLayout title="审计日志">
      <div className="bg-white text-slate-900 rounded-lg border shadow-sm flex flex-col h-full">
        {/* 工具栏 */}
        <div className="p-4 border-b flex flex-wrap gap-4 items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">动作:</span>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-[140px] h-9 bg-white">
                <SelectValue placeholder="选择动作" />
              </SelectTrigger>
              <SelectContent>
                {ACTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">类型:</span>
            <Select value={targetType} onValueChange={setTargetType}>
              <SelectTrigger className="w-[140px] h-9 bg-white">
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                {TARGET_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">操作人:</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                placeholder="输入ID"
                className="pl-9 h-9 w-[140px] bg-white"
              />
            </div>
          </div>

          <div className="flex gap-2 ml-auto">
            <Button onClick={handleSearch} disabled={loading} size="sm">
              查询
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={loading} size="sm">
              <RotateCcw className="w-4 h-4 mr-1" />
              重置
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>操作人ID</TableHead>
                  <TableHead>动作</TableHead>
                  <TableHead>目标类型</TableHead>
                  <TableHead>目标ID</TableHead>
                  <TableHead>IP地址</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead className="text-right">详情</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24 text-gray-500">
                      暂无日志数据
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-gray-900">{log.id}</TableCell>
                      <TableCell>{log.operatorId}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                          {ACTIONS.find(a => a.value === log.action)?.label || log.action}
                        </span>
                      </TableCell>
                      <TableCell>
                        {TARGET_TYPES.find(t => t.value === log.targetType)?.label || log.targetType}
                      </TableCell>
                      <TableCell>{log.targetId || "-"}</TableCell>
                      <TableCell className="text-gray-500 text-xs">{log.ipAddress || "-"}</TableCell>
                      <TableCell className="text-gray-500">{formatDate(log.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Search className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[600px]">
                            <DialogHeader>
                              <DialogTitle>日志详情 #{log.id}</DialogTitle>
                            </DialogHeader>
                            <div className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-auto max-h-[400px]">
                              <pre className="text-xs font-mono">
                                {JSON.stringify(log.details || {}, null, 2)}
                              </pre>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between bg-gray-50">
            <span className="text-sm text-gray-500">
              共 {pagination.total} 条，第 {pagination.page} / {pagination.totalPages} 页
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (pagination.page > 1) fetchLogs(pagination.page - 1);
                }}
                disabled={pagination.page <= 1 || loading}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> 上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (pagination.page < pagination.totalPages) fetchLogs(pagination.page + 1);
                }}
                disabled={pagination.page >= pagination.totalPages || loading}
              >
                下一页 <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
