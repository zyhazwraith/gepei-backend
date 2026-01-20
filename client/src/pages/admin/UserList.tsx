import { useState, useEffect } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { getAdminUsers, AdminUser, Pagination } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight, User as UserIcon, Shield } from "lucide-react";

export default function AdminUserList() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchUsers(page);
  }, [page]);

  const fetchUsers = async (p: number) => {
    setLoading(true);
    try {
      const res = await getAdminUsers(p);
      if (res.code === 0 && res.data) {
        setUsers(res.data.list);
        setPagination(res.data.pagination);
      }
    } catch (error) {
      toast.error("获取用户列表失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="用户管理">
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
                  <TableHead>ID</TableHead>
                  <TableHead>用户信息</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>身份</TableHead>
                  <TableHead>余额</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-gray-500">#{user.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.nickname}</span>
                        <span className="text-xs text-gray-400">{user.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.role === 'admin' ? (
                        <Badge variant="default" className="bg-purple-600 hover:bg-purple-700 flex w-fit items-center gap-1">
                          <Shield className="w-3 h-3" /> 管理员
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex w-fit items-center gap-1">
                          <UserIcon className="w-3 h-3" /> 普通用户
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.isGuide === 1 ? (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                          认证地陪
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">¥{user.balance}</TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        正常
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-gray-500">
                      暂无用户数据
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
      </div>
    </AdminLayout>
  );
}
