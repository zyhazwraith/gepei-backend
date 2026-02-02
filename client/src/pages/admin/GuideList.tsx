import { useState, useEffect } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { getAdminGuides, AdminGuide, Pagination } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight, Search, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GuideList() {
  const [, setLocation] = useLocation();
  const [guides, setGuides] = useState<AdminGuide[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all"); // all, pending, verified
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [jumpPage, setJumpPage] = useState("");

  useEffect(() => {
    fetchGuides(page);
  }, [page, searchTrigger, activeTab]);

  const fetchGuides = async (p: number) => {
    setLoading(true);
    try {
      // Map tab to isGuide param
      let isGuide: boolean | undefined = undefined;
      if (activeTab === 'pending') isGuide = false;
      if (activeTab === 'verified') isGuide = true;

      const res = await getAdminGuides(p, 20, keyword, undefined, isGuide);
      if (res.code === 0 && res.data) {
        setGuides(res.data.list);
        setPagination(res.data.pagination);
        setJumpPage(""); // Reset jump input on successful fetch
      }
    } catch (error) {
      toast.error("获取向导列表失败");
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

  const handleJumpPage = () => {
    if (!pagination) return;
    const p = parseInt(jumpPage);
    if (isNaN(p) || p < 1 || p > pagination.total_pages) {
      toast.error("请输入有效的页码");
      return;
    }
    setPage(p);
  };

  return (
    <AdminLayout title="向导管理">
      <div className="bg-white text-slate-900 rounded-lg border shadow-sm flex flex-col h-full min-h-[600px]">
        {/* 工具栏 */}
        <div className="p-4 border-b flex flex-col gap-4">
          <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setPage(1); }}>
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="pending">待审核</TabsTrigger>
              <TabsTrigger value="verified">已认证</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-4">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="搜索艺名、简介..."
                className="pl-9"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button onClick={handleSearch}>搜索</Button>
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
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>艺名</TableHead>
                  <TableHead>手机号</TableHead>
                  <TableHead>城市</TableHead>
                  <TableHead>期望价格</TableHead>
                  <TableHead>系统价格</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guides.map((guide) => (
                  <TableRow key={guide.userId}>
                    <TableCell className="font-mono text-gray-500">#{guide.userId}</TableCell>
                    <TableCell className="font-medium">{guide.stageName}</TableCell>
                    <TableCell>{guide.phone || '-'}</TableCell>
                    <TableCell>{guide.city}</TableCell>
                    <TableCell>¥{guide.expectedPrice || 0}</TableCell>
                    <TableCell className="font-bold text-green-600">¥{guide.realPrice || 0}</TableCell>
                    <TableCell>
                      {guide.isGuide ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">已认证</Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">待审核</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setLocation(`/admin/guides/${guide.userId}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" /> 审核/查看
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {guides.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24 text-gray-500">
                      暂无数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* 分页器 */}
        {pagination && (
          <div className="p-4 border-t flex items-center justify-between bg-gray-50 mt-auto">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                共 {pagination.total} 条，第 {pagination.page} / {pagination.total_pages} 页
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">跳转到</span>
                <Input 
                  className="w-16 h-8 text-center" 
                  value={jumpPage}
                  onChange={(e) => setJumpPage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJumpPage()}
                />
                <Button variant="outline" size="sm" onClick={handleJumpPage} className="h-8">Go</Button>
              </div>
            </div>

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
