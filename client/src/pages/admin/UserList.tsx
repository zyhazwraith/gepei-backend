import { useState, useEffect } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { getAdminUsers, AdminUser, Pagination, unbanUser } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight, User as UserIcon, Shield, Search, Ban, CheckCircle, AlertTriangle } from "lucide-react";
import BanUserDialog from "@/components/admin/BanUserDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminUserList() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [searchTrigger, setSearchTrigger] = useState(0); // 用于触发搜索
  
  // Ban/Unban Dialog State
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    fetchUsers(page);
  }, [page, searchTrigger]);

  const fetchUsers = async (p: number) => {
    setLoading(true);
    try {
      const res = await getAdminUsers(p, 20, keyword);
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

  const handleSearch = () => {
    setPage(1); // 重置到第一页
    setSearchTrigger(prev => prev + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };
  
  const handleOpenBan = (user: AdminUser) => {
    setSelectedUser(user);
    setBanDialogOpen(true);
  };
  
  const handleUnban = async (user: AdminUser) => {
    // if (!confirm(`确认要解封用户 ${user.nickName} 吗？`)) return;
    setSelectedUser(user);
    setUnbanDialogOpen(true);
  };

  const confirmUnban = async () => {
    if (!selectedUser) return;
    
    try {
      const res = await unbanUser(selectedUser.id);
      if (res.code === 0) {
        toast.success("用户已解封");
        setUnbanDialogOpen(false);
        fetchUsers(page); // Refresh list
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error("操作失败");
    }
  };

  return (
    <AdminLayout title="用户管理">
      <div className="bg-white text-slate-900 rounded-lg border shadow-sm flex flex-col h-full">
        {/* 工具栏 */}
        <div className="p-4 border-b flex items-center gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="搜索手机号或昵称..."
              className="pl-9"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button onClick={handleSearch}>搜索</Button>
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
                  <TableHead>ID</TableHead>
                  <TableHead>用户信息</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>身份</TableHead>
                  <TableHead>余额</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-gray-500">#{user.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{user.nickName}</span>
                        <span className="text-xs text-gray-500">{user.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.role === 'admin' ? (
                        <Badge variant="default" className="bg-purple-600 hover:bg-purple-700 text-white flex w-fit items-center gap-1">
                          <Shield className="w-3 h-3" /> 管理员
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex w-fit items-center gap-1 bg-gray-100 text-gray-800">
                          <UserIcon className="w-3 h-3" /> 普通用户
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.isGuide ? (
                        <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
                          认证地陪
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">¥{(parseInt(user.balance || '0') / 100).toFixed(2)}</TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {user.status === 'banned' ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="destructive" className="flex w-fit items-center gap-1">
                            <Ban className="w-3 h-3" /> 封禁中
                          </Badge>
                          {user.banReason && (
                            <span className="text-xs text-red-500 max-w-[150px] truncate" title={user.banReason}>
                              {user.banReason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          正常
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.role !== 'admin' && (
                          <>
                            {user.status === 'banned' ? (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8"
                                onClick={() => handleUnban(user)}
                              >
                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> 解封
                              </Button>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                                onClick={() => handleOpenBan(user)}
                              >
                                <Ban className="w-3.5 h-3.5 mr-1" /> 封禁
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24 text-gray-500">
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
        
        {/* 封禁弹窗 */}
        <BanUserDialog 
          userId={selectedUser?.id || null}
          userNickname={selectedUser?.nickName || selectedUser?.phone || `ID:${selectedUser?.id}`}
          isOpen={banDialogOpen}
          onClose={() => setBanDialogOpen(false)}
          onSuccess={() => fetchUsers(page)}
        />

        {/* 解封确认弹窗 */}
        <Dialog open={unbanDialogOpen} onOpenChange={setUnbanDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                解封用户
              </DialogTitle>
              <DialogDescription>
                您确定要解封用户 <span className="font-bold text-slate-900">{selectedUser?.nickName || selectedUser?.phone || `ID:${selectedUser?.id}`}</span> 吗？
                该用户将恢复正常登录权限。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUnbanDialogOpen(false)}>
                取消
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white" 
                onClick={confirmUnban}
              >
                确认解封
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
