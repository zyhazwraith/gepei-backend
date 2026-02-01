import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import apiClient from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export default function GuideList() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [guides, setGuides] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const pageSize = 10;

  const fetchGuides = async () => {
    setLoading(true);
    try {
      // Use Admin API
      const res = await apiClient.get("/admin/guides", {
        params: {
          page,
          page_size: pageSize,
          keyword: search || undefined,
          status: status !== "all" ? status : undefined,
        },
      });

      if ((res as any).code === 0) {
        setGuides((res as any).data.list);
        setTotal((res as any).data.pagination.total);
      }
    } catch (error) {
      console.error("Fetch guides error:", error);
      toast.error("获取地陪列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuides();
  }, [page, status]);

  const handleSearch = () => {
    setPage(1);
    fetchGuides();
  };

  const getStatusBadge = (isGuide: boolean) => {
    if (isGuide) {
      return <Badge className="bg-green-500">已认证</Badge>;
    }
    return <Badge variant="secondary">待审核</Badge>;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">地陪管理</h1>
        <div className="flex gap-4">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="verified">已认证</SelectItem>
              <SelectItem value="pending">待审核</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              placeholder="搜索地陪名称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[200px]"
            />
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">头像</TableHead>
              <TableHead>地陪名称</TableHead>
              <TableHead>用户昵称</TableHead>
              <TableHead>城市</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>期望/展示价格</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : guides.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              guides.map((guide) => (
                <TableRow key={guide.userId}>
                  <TableCell>
                    <Avatar>
                      <AvatarImage src={guide.avatarUrl} />
                      <AvatarFallback>
                        {(guide.stageName || guide.nickName)?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">
                    {guide.stageName || "-"}
                  </TableCell>
                  <TableCell>{guide.userNickName || guide.nickName}</TableCell>
                  <TableCell>{guide.city}</TableCell>
                  <TableCell>{getStatusBadge(guide.isGuide)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                       <span className="text-gray-500">期望: ¥{guide.expectedPrice || 0}</span>
                       <span className="font-bold text-orange-600">展示: ¥{guide.realPrice || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/admin/guides/${guide.userId}/audit`)}
                    >
                      审核/详情
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          上一页
        </Button>
        <div className="flex items-center px-2 text-sm text-gray-500">
          第 {page} 页 / 共 {Math.ceil(total / pageSize)} 页
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= Math.ceil(total / pageSize)}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}
