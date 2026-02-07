import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, Link } from 'wouter';
import { useInView } from 'react-intersection-observer';
import {
  Wallet,
  ArrowUp,
  ArrowDown,
  History,
  Loader2,
  ChevronLeft,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  getWalletSummary, 
  getWalletLogs, 
  WalletSummary, 
  WalletLog 
} from '../../lib/api';
import { WithdrawDialog } from '../../components/wallet/WithdrawDialog';
import Price from '@/components/Price';

const WalletPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [logs, setLogs] = useState<WalletLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Details Dialog
  const [selectedLog, setSelectedLog] = useState<WalletLog | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  // Infinite Scroll Hook
  const { ref: observerRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px', // Preload when 100px before end
  });

  const fetchSummary = async () => {
    try {
      const res = await getWalletSummary();
      if (res.data) setSummary(res.data);
    } catch (error) {
      console.error('Failed to load wallet summary:', error);
    }
  };

  // Only fetch data, do not manage page increment logic here
  const fetchLogs = async (pageNum: number, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const res = await getWalletLogs(pageNum, PAGE_SIZE);
      
      if (res.data) {
        const newLogs = res.data.list;
        if (isLoadMore) {
          setLogs(prev => [...prev, ...newLogs]);
        } else {
          setLogs(newLogs);
        }
        
        const hasMoreData = pageNum < res.data.pagination.totalPages;
        setHasMore(hasMoreData);
      }
    } catch (error) {
      console.error('Failed to load wallet logs:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchLogs(1); // Initial load
  }, []);

  // Handle Infinite Scroll
  useEffect(() => {
    if (inView && !loadingMore && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchLogs(nextPage, true);
    }
  }, [inView, loadingMore, hasMore, loading]);

  const handleWithdrawSuccess = () => {
    fetchSummary();
    fetchLogs(1); // Refresh logs
    setPage(1);
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'income':
      case 'withdraw_unfreeze':
        return <ArrowUp className="h-5 w-5 text-red-600" />;
      case 'withdraw_freeze':
        return <ArrowDown className="h-5 w-5 text-gray-900" />;
      case 'withdraw_success':
        return <ArrowDown className="h-5 w-5 text-gray-900" />;
      default:
        return <History className="h-5 w-5 text-gray-500" />;
    }
  };

  const getLogTitle = (log: WalletLog) => {
    switch (log.type) {
      case 'income': return '订单收入';
      case 'withdraw_freeze': return '提现申请';
      case 'withdraw_unfreeze': return '提现驳回';
      case 'withdraw_success': return '提现成功';
      default: return '未知交易';
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 space-y-6 pb-20">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="-ml-2">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center space-x-2">
          <Wallet className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">我的钱包</h1>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="bg-primary text-primary-foreground border-none shadow-lg">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-primary-foreground/80 text-sm font-medium">可用余额 (元)</p>
              <h2 className="text-4xl font-bold">
                <Price amount={summary?.balance} showSymbol={false} />
              </h2>
            </div>
            <Button 
              variant="secondary" 
              size="lg"
              onClick={() => setWithdrawOpen(true)}
              disabled={!summary || summary.balance <= 0}
              className="font-semibold shadow-sm"
            >
              提现
            </Button>
          </div>
          
          <div className="mt-8 flex gap-8">
            <div className="space-y-1">
              <p className="text-primary-foreground/80 text-xs">冻结中 (元)</p>
              <p className="text-xl font-semibold">
                <Price amount={summary?.frozen_amount} showSymbol={false} />
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold px-1">最近交易</h2>
        
        {logs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              暂无交易记录
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <Card 
                key={log.id} 
                className="overflow-hidden active:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setSelectedLog(log)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      {getLogIcon(log.type)}
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2">
                        {getLogTitle(log)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className={`text-lg font-bold ${
                    (log.type === 'income' || log.type === 'withdraw_unfreeze') ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {log.amount > 0 ? '+' : ''}<Price amount={log.amount} showSymbol={false} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Infinite Scroll Loader / End Message */}
        <div ref={observerRef} className="flex justify-center pt-4 min-h-[40px]">
          {loadingMore ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-xs text-muted-foreground">加载中...</span>
            </>
          ) : (
             hasMore && logs.length > 0 && (
                <p className="text-center text-xs text-muted-foreground opacity-50">上拉加载更多</p>
             )
          )}
          
          {!hasMore && !loadingMore && logs.length > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              没有更多记录了
            </p>
          )}
        </div>
      </div>

      {/* Withdraw Dialog */}
      <WithdrawDialog 
        open={withdrawOpen} 
        onClose={() => setWithdrawOpen(false)}
        onSuccess={handleWithdrawSuccess}
        balance={summary?.balance || 0}
      />

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>交易详情</DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-6 pt-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">{getLogTitle(selectedLog)}</p>
                <h3 className={`text-4xl font-bold ${
                  (selectedLog.type === 'income' || selectedLog.type === 'withdraw_unfreeze') ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {selectedLog.amount > 0 ? '+' : ''}<Price amount={selectedLog.amount} showSymbol={false} />
                </h3>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">交易时间</span>
                  <span>{new Date(selectedLog.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">流水号</span>
                  <span className="font-mono text-xs">{selectedLog.id}</span>
                </div>
                
                {/* 收入关联订单 */}
                {selectedLog.orderNumber && (
                   <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">关联订单</span>
                    <span className="font-medium">{selectedLog.orderNumber}</span>
                  </div>
                )}

                {/* 驳回理由 */}
                {selectedLog.adminNote && selectedLog.type === 'withdraw_unfreeze' && (
                  <div className="bg-red-50 p-3 rounded-md text-sm text-red-700 space-y-1">
                    <p className="font-semibold">驳回理由</p>
                    <p>{selectedLog.adminNote}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {selectedLog.orderNumber && (
                <Link href={`/orders/${selectedLog.relatedId}`}>
                  <Button className="w-full mt-2">
                    查看订单详情 <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletPage;
