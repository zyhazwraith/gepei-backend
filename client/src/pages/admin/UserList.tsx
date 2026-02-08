import { useState, useEffect } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { getAdminUsers, AdminUser, Pagination, unbanUser, updateUserRole } from "@/lib/api";
import Price from "@/components/Price";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Ban, 
  CheckCircle, 
  MoreHorizontal,
  Shield,
  User as UserIcon,
  MapPin,
  Headset,
  Clock
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BanUserDialog from "@/components/admin/BanUserDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Helper for relative time (e.g., "2小时前")
function formatRelativeTime(dateString?: string | null) {
  if (!dateString) return "未登录";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "刚刚";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}天前`;
  
  return date.toLocaleDateString();
}

export default function AdminUserList() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [searchTrigger, setSearchTrigger] = useState(0); 
  
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
    setPage(1); 
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
        fetchUsers(page); 
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error("操作失败");
    }
  };

  const handleRoleChange = async (user: AdminUser, newRole: 'user' | 'cs') => {
    try {
      const res = await updateUserRole(user.id, newRole);
      if (res.code === 0) {
        toast.success(newRole === 'cs' ? "已设为客服" : "已取消客服身份");
        fetchUsers(page);
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
        <div className="p-4 border-b flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="relative max-w-sm w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="搜索用户手机号或昵称..."
                className="pl-9 bg-white"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button onClick={handleSearch} variant="secondary">搜索</Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                  <TableHead className="w-[280px]">用户档案</TableHead>
                  <TableHead className="w-[180px]">身份标识</TableHead>
                  <TableHead className="text-right">账户余额</TableHead>
                  <TableHead>上次登录</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead>账号状态</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* 1. 用户档案: 头像 + 昵称 + 手机/ID */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border bg-gray-100">
                          <AvatarFallback className="text-gray-500 font-medium">
                            {user.nickName ? user.nickName.substring(0, 1).toUpperCase() : "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 truncate max-w-[150px]" title={user.nickName}>
                            {user.nickName || "未设置昵称"}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mt-0.5">
                            <span>{user.phone}</span>
                            <span className="text-gray-300">|</span>
                            <span>ID:{user.id}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* 2. 身份标识: 管理员 / 客服 / 地陪 / 普通用户 */}
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {user.role === 'admin' && (
                          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200 shadow-none gap-1 px-2">
                            <Shield className="w-3 h-3" /> 管理员
                          </Badge>
                        )}
                        {user.role === 'cs' && (
                          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200 shadow-none gap-1 px-2">
                            <Headset className="w-3 h-3" /> 客服
                          </Badge>
                        )}
                        {user.isGuide && (
                          <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 gap-1 px-2">
                            <MapPin className="w-3 h-3" /> 认证地陪
                          </Badge>
                        )}
                        {user.role === 'user' && !user.isGuide && (
                          <span className="text-sm text-gray-400">普通用户</span>
                        )}
                      </div>
                    </TableCell>

                    {/* 3. 余额: 右对齐，加粗 */}
                    <TableCell className="text-right">
                       <span className="font-semibold text-gray-900">
                         <Price amount={user.balance || 0} />
                       </span>
                    </TableCell>

                    {/* 4. 上次登录: 相对时间 */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-gray-600" title={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : ''}>
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {formatRelativeTime(user.lastLoginAt)}
                      </div>
                    </TableCell>

                    {/* 5. 注册时间: 日期 */}
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>

                    {/* 6. 账号状态: Dot Indicator */}
                    <TableCell>
                      {user.status === 'banned' ? (
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                          </span>
                          <span className="text-sm font-medium text-red-600">已封禁</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                          <span className="text-sm text-gray-600">正常</span>
                        </div>
                      )}
                    </TableCell>

                    {/* 7. 操作: 下拉菜单 */}
                    <TableCell>
                      {user.role !== 'admin' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">打开菜单</span>
                              <MoreHorizontal className="h-4 w-4 text-gray-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>操作</DropdownMenuLabel>
                            <DropdownMenuItem 
                              onClick={() => navigator.clipboard.writeText(user.phone)}
                            >
                              复制手机号
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => navigator.clipboard.writeText(user.id.toString())}
                            >
                              复制用户ID
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            {/* 客服角色管理 */}
                            {user.role === 'cs' ? (
                              <DropdownMenuItem onClick={() => handleRoleChange(user, 'user')}>
                                <UserIcon className="mr-2 h-4 w-4" /> 取消客服身份
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleRoleChange(user, 'cs')}>
                                <Headset className="mr-2 h-4 w-4" /> 设为客服
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />
                            
                            {/* 封禁管理 */}
                            {user.status === 'banned' ? (
                              <DropdownMenuItem 
                                className="text-green-600 focus:text-green-700 focus:bg-green-50"
                                onClick={() => handleUnban(user)}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" /> 解封账号
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                onClick={() => handleOpenBan(user)}
                              >
                                <Ban className="mr-2 h-4 w-4" /> 封禁账号
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-32 text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <UserIcon className="h-8 w-8 text-gray-300" />
                        <p>暂无用户数据</p>
                      </div>
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