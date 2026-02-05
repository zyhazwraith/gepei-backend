import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { getCSPerformance, getPlatformFinance, CSPerformanceData, PlatformFinanceData } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, DollarSign, CreditCard, HelpCircle } from 'lucide-react';

export default function AdminStats() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('month');
  const [loading, setLoading] = useState(false);
  const [csData, setCsData] = useState<CSPerformanceData | null>(null);
  const [financeData, setFinanceData] = useState<PlatformFinanceData | null>(null);

  const fetchCSData = async () => {
    try {
      setLoading(true);
      const res = await getCSPerformance({ timeRange });
      if (res.code === 0 && res.data) {
        setCsData(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const res = await getPlatformFinance({ timeRange });
      if (res.code === 0 && res.data) {
        setFinanceData(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCSData();
    // Only fetch finance data if admin
    if (user?.role === 'admin') {
      fetchFinanceData();
    }
  }, [timeRange, user?.role]);

  return (
    <AdminLayout title="统计报表">
      <div className="flex justify-end mb-6">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700 text-white">
            <SelectValue placeholder="选择时间范围" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700 text-white">
            <SelectItem value="week">最近一周</SelectItem>
            <SelectItem value="month">本月</SelectItem>
            <SelectItem value="year">本年</SelectItem>
            <SelectItem value="all">全部</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="cs" className="space-y-4">
        <TabsList className="bg-slate-900 border border-slate-700">
          <TabsTrigger value="cs" className="data-[state=active]:bg-indigo-600 text-slate-300">客服业绩</TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger value="finance" className="data-[state=active]:bg-indigo-600 text-slate-300">平台收支</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="cs" className="space-y-4">
          {loading && !csData ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>
          ) : csData ? (
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader>
                <CardTitle>客服结算单量看板</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-slate-800/50">
                      <TableHead className="text-slate-400">排名</TableHead>
                      <TableHead className="text-slate-400">客服</TableHead>
                      <TableHead className="text-slate-400 text-right">已结算单量</TableHead>
                      <TableHead className="text-slate-400 text-right">总业绩 (元)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csData.list.map((item, index) => (
                      <TableRow key={item.csId} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{item.csName}</TableCell>
                        <TableCell className="text-right font-bold text-indigo-400">{item.orderCount}</TableCell>
                        <TableCell className="text-right text-slate-300">
                          ¥{(item.totalAmount / 100).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {csData.list.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-24 text-slate-500">
                          暂无数据
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="finance" className="space-y-4">
          {loading && !financeData ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>
          ) : financeData ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-slate-900 border-slate-800 text-slate-100">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-medium text-slate-400">总收入 (流水)</CardTitle>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-3 w-3 text-slate-500" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200">
                            <p>统计口径: 订单服务结束时间</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <DollarSign className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">¥{(financeData.summary.totalIncome / 100).toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800 text-slate-100">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-medium text-slate-400">总提现支出</CardTitle>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-3 w-3 text-slate-500" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-slate-800 border-slate-700 text-slate-200">
                            <p>统计口径: 提现审核通过时间</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <CreditCard className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">¥{(financeData.summary.totalWithdraw / 100).toFixed(2)}</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-slate-900 border-slate-800 text-slate-100">
                <CardHeader>
                  <CardTitle>收支趋势 (元)</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={financeData.chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#94a3b8" />
                        <YAxis 
                          stroke="#94a3b8" 
                          tickFormatter={(value) => `¥${(value / 100).toFixed(0)}`}
                        />
                        <RechartsTooltip 
                           contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                           formatter={(value: number) => [`¥${(value / 100).toFixed(2)}`, '']}
                        />
                        <Legend />
                        {/* type="linear" makes it a straight line (折线) */}
                        <Line type="linear" dataKey="income" name="收入" stroke="#eab308" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="linear" dataKey="withdraw" name="提现" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
