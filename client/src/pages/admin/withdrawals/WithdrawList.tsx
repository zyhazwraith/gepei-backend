import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import AdminLayout from '@/components/layouts/AdminLayout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { 
  getAdminWithdrawals, 
  auditWithdrawal, 
  AdminWithdrawal 
} from '@/lib/api';
import Price from "@/components/Price";

const WithdrawList: React.FC = () => {
  // URL Sync Logic
  const [location, setLocation] = useLocation();
  
  const getSearchParams = useCallback(() => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    return {
      page: parseInt(params.get('page') || '1'),
      status: params.get('status') || 'pending',
      keyword: params.get('keyword') || '',
    };
  }, []);

  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  
  // Local state for search input to avoid excessive re-renders/fetches while typing
  const [keywordInput, setKeywordInput] = useState('');

  // Audit Dialog State
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<AdminWithdrawal | null>(null);
  const [auditAction, setAuditAction] = useState<'completed' | 'rejected' | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Initial sync from URL
  useEffect(() => {
    const params = getSearchParams();
    setKeywordInput(params.keyword);
  }, [getSearchParams]);

  const fetchWithdrawals = async () => {
    setLoading(true);
    const { page, status, keyword } = getSearchParams();
    
    try {
      const res = await getAdminWithdrawals({
        page,
        limit: 10,
        status: status === 'all' ? undefined : status,
        keyword: keyword || undefined,
      });
      if (res.data) {
        setWithdrawals(res.data.list);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (error) {
      toast.error('获取提现列表失败');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when URL changes
  useEffect(() => {
    fetchWithdrawals();
  }, [location]); // Note: wouter's location doesn't include query params, so we might need to listen to popstate or just rely on manual updates?
  // Wouter's useLocation only returns path. 
  // For query params change to trigger effect, we need a custom hook or just dependency on window.location.search?
  // React Router solves this, but wouter is minimal.
  // Best practice with wouter:
  // We can just rely on our updateUrl function to trigger fetch, 
  // BUT browser back button won't work perfectly without a listener.
  // For MVP, we'll add a listener for popstate.
  
  useEffect(() => {
    const handlePopState = () => fetchWithdrawals();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);


  const updateUrl = (updates: Partial<{ page: number; status: string; keyword: string }>) => {
    const current = getSearchParams();
    const newParams = { ...current, ...updates };
    const searchParams = new URLSearchParams();
    searchParams.set('page', newParams.page.toString());
    searchParams.set('status', newParams.status);
    if (newParams.keyword) searchParams.set('keyword', newParams.keyword);
    
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, '', newUrl);
    
    // Manually trigger fetch since we are bypassing wouter for query params
    fetchWithdrawals();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ page: 1, keyword: keywordInput });
  };

  const handleTabChange = (val: string) => {
    updateUrl({ page: 1, status: val });
  };

  const handlePageChange = (newPage: number) => {
    updateUrl({ page: newPage });
  };

  const handleAudit = async () => {
    if (!selectedWithdrawal || !auditAction) return;
    
    if (auditAction === 'rejected' && !adminNote.trim()) {
      toast.error('驳回时必须填写理由');
      return;
    }

    setSubmitting(true);
    try {
      await auditWithdrawal(selectedWithdrawal.id, auditAction, adminNote);
      toast.success(auditAction === 'completed' ? '已通过并核销' : '已驳回并退款');
      setSelectedWithdrawal(null);
      fetchWithdrawals(); // Refresh list
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openAuditDialog = (w: AdminWithdrawal) => {
    setSelectedWithdrawal(w);
    setAuditAction('completed'); // Default to approve
    setAdminNote('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200">待审核</Badge>;
      case 'completed': return <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">已完成</Badge>;
      case 'rejected': return <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200">已驳回</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const { page, status } = getSearchParams();

  return (
    <AdminLayout title="提现审核">
      <div className="bg-white text-slate-900 rounded-lg border shadow-sm flex flex-col h-full">
        {/* Header & Filters */}
        <div className="p-4 border-b space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <Tabs value={status} onValueChange={handleTabChange} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="pending">待审核</TabsTrigger>
                <TabsTrigger value="completed">已完成</TabsTrigger>
                <TabsTrigger value="rejected">已驳回</TabsTrigger>
                <TabsTrigger value="all">全部</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSearch} className="flex gap-2 w-full sm:max-w-xs">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="搜索手机号 / UID"
                  className="pl-9 h-9"
                />
              </div>
              <Button type="submit" size="sm">搜索</Button>
            </form>
          </div>
        </div>

        {/* Table Content */}
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
                  <TableHead>申请人</TableHead>
                  <TableHead>提现金额</TableHead>
                  <TableHead>收款信息</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>申请时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono text-xs">{w.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{w.userPhone}</span>
                          <span className="text-xs text-muted-foreground">UID: {w.userId}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-base">
                        ¥{formatMoney(w.amount)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={w.userNote}>
                        {w.userNote}
                      </TableCell>
                      <TableCell>{getStatusBadge(w.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(w.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {w.status === 'pending' && (
                          <Button size="sm" onClick={() => openAuditDialog(w)}>
                            审核
                          </Button>
                        )}
                        {w.status !== 'pending' && (
                          <span className="text-xs text-muted-foreground">
                            {w.adminNote || '-'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination - Always visible to ensure bottom border */}
        <div className="p-4 border-t flex items-center justify-between bg-gray-50">
          <span className="text-sm text-gray-500">
            第 {page} / {totalPages} 页
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> 上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || loading}
            >
              下一页 <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Audit Dialog */}
      <Dialog open={!!selectedWithdrawal} onOpenChange={(open) => !open && setSelectedWithdrawal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>审核提现申请</DialogTitle>
          </DialogHeader>
          
          {selectedWithdrawal && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">申请金额</Label>
                  <div className="text-2xl font-bold mt-1"><Price amount={selectedWithdrawal.amount} /></div>
                </div>
                <div>
                  <Label className="text-muted-foreground">申请人</Label>
                  <div className="mt-1">{selectedWithdrawal.userPhone}</div>
                </div>
                <div className="col-span-2 bg-slate-50 p-3 rounded-md">
                  <Label className="text-muted-foreground">收款信息</Label>
                  <div className="mt-1 font-medium">{selectedWithdrawal.userNote}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>审核结果</Label>
                  <div className="flex gap-4 mt-2">
                    <Button 
                      variant={auditAction === 'completed' ? 'default' : 'outline'}
                      className={auditAction === 'completed' ? 'bg-green-600 hover:bg-green-700' : ''}
                      onClick={() => setAuditAction('completed')}
                    >
                      通过 (已打款)
                    </Button>
                    <Button 
                      variant={auditAction === 'rejected' ? 'destructive' : 'outline'}
                      onClick={() => setAuditAction('rejected')}
                    >
                      驳回 (退款)
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    {auditAction === 'rejected' ? '驳回理由 (必填)' : '转账备注 (选填)'}
                  </Label>
                  <Textarea 
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder={auditAction === 'rejected' ? '请输入驳回理由，如：收款账号错误' : '请输入转账流水号等备注信息'}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedWithdrawal(null)} disabled={submitting}>
              取消
            </Button>
            <Button 
              onClick={handleAudit} 
              disabled={submitting || (auditAction === 'rejected' && !adminNote.trim())}
              className={auditAction === 'completed' ? 'bg-green-600 hover:bg-green-700' : (auditAction === 'rejected' ? 'bg-red-600 hover:bg-red-700' : '')}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                '确认提交'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default WithdrawList;
