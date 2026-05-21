import { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, Filter } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Re-added Button import
import { getGuides, Guide } from "@/lib/api";
import Price from "@/components/Price";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation, useSearch } from "wouter";
import CitySelector from "@/components/common/CitySelector";
import EmptyState from "@/components/EmptyState";
import HomeGuideCard from "@/components/home/HomeGuideCard";

export default function Guides() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const query = new URLSearchParams(search);
  
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [keyword, setKeyword] = useState(query.get("keyword") || "");
  const [selectedCity, setSelectedCity] = useState(query.get("city") || "");
  const [userLat, setUserLat] = useState<number>();
  const [userLng, setUserLng] = useState<number>();
  const observer = useRef<IntersectionObserver | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
        },
        undefined,
        { timeout: 5000 }
      );
    }
  }, []);

  const fetchGuides = async (targetPage: number, append = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await getGuides(targetPage, 20, selectedCity, keyword, userLat, userLng);
      if (res.code === 0 && res.data) {
        const currentPage = Number((res.data.pagination as any)?.page ?? targetPage);
        const totalPages = Number(
          (res.data.pagination as any)?.totalPages ??
          (res.data.pagination as any)?.total_pages ??
          currentPage
        );

        setPage(currentPage);
        setHasMore(currentPage < totalPages);
        setGuides((prev) => {
          if (!append) return res.data.list;
          const existingIds = new Set(prev.map((g) => g.userId));
          const next = res.data.list.filter((g) => !existingIds.has(g.userId));
          return [...prev, ...next];
        });
      }
    } catch (error) {
      console.error("加载地陪列表失败:", error);
      toast.error("加载失败，请重试");
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  };

  // 初始加载和筛选条件变化时重置
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchGuides(1, false);
  }, [selectedCity, userLat, userLng]); // 坐标变化时也重新加载以更新距离

  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore || !hasMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !isFetchingRef.current && hasMore) {
        fetchGuides(page + 1, true);
      }
    }, { rootMargin: "120px" });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, page]);

  useEffect(() => {
    return () => observer.current?.disconnect();
  }, []);

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setHasMore(true);
    fetchGuides(1, false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部搜索栏 */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-10 px-4 py-3 border-b border-border/40 flex gap-3">
        {/* 城市选择器 */}
        <CitySelector
          value={selectedCity}
          onChange={(city) => {
            setSelectedCity(city);
          }}
          placeholder="城市"
          data-testid="city-selector-trigger"
          className="w-[88px] h-10 px-2 border-0 bg-secondary/50 hover:bg-secondary/70 rounded-full text-sm font-medium shadow-none"
        />

        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={keyword}
            data-testid="search-input"
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索地陪名字/简介"
            className="pl-9 bg-secondary/50 border-0 focus-visible:ring-0 rounded-full h-10 text-sm placeholder:text-muted-foreground/70"
          />
        </form>
      </div>

      {/* 列表内容 */}
      <div className="p-4 space-y-4">
        {loading ? (
          // 加载骨架屏
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-0 shadow-sm">
              <CardContent className="p-0 flex h-32">
                <Skeleton className="w-32 h-32" />
                <div className="flex-1 p-3 space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : guides.length > 0 ? (
          <>
            {guides.map((guide) => (
              <HomeGuideCard key={guide.userId} guide={guide} />
            ))}
            <div ref={loadMoreRef} className="h-1" />
            {loadingMore && (
              <div className="text-center text-sm text-muted-foreground py-2">
                加载更多中...
              </div>
            )}
          </>
        ) : (
          <EmptyState 
            icon={Search}
            title="暂无符合条件的地陪" 
            description="换个关键词或城市试试看？"
            action={
              <Button variant="outline" onClick={() => {
                setKeyword("");
                setSelectedCity("");
              }}>
                清除筛选
              </Button>
            }
          />
        )}
      </div>

      <BottomNav />
    </div>
  );
}
