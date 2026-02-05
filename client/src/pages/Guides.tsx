import { useState, useEffect } from "react";
import { Search, MapPin, Filter } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Re-added Button import
import { getGuides, Guide } from "@/lib/api";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import CitySelector from "@/components/common/CitySelector";
import EmptyState from "@/components/EmptyState";

export default function Guides() {
  const [, setLocation] = useLocation();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [userLat, setUserLat] = useState<number>();
  const [userLng, setUserLng] = useState<number>();

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

  // 加载数据
  const fetchGuides = async () => {
    setLoading(true);
    try {
      const res = await getGuides(1, 20, selectedCity, keyword, userLat, userLng);
      if (res.code === 0 && res.data) {
        setGuides(res.data.list);
      }
    } catch (error) {
      console.error("加载地陪列表失败:", error);
      toast.error("加载失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和筛选条件变化时加载
  useEffect(() => {
    fetchGuides();
  }, [selectedCity, userLat, userLng]); // 坐标变化时也重新加载以更新距离

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGuides();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部搜索栏 */}
      <div className="bg-white sticky top-0 z-10 px-4 py-3 shadow-sm flex gap-2">
        {/* 城市选择器 */}
        <CitySelector
          value={selectedCity}
          onChange={(city) => {
            setSelectedCity(city);
          }}
          placeholder="城市"
          data-testid="city-selector-trigger"
          className="w-auto px-2 border-none shadow-none bg-transparent hover:bg-gray-100 min-w-[80px]"
        />

        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={keyword}
            data-testid="search-input"
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索地陪名字/简介"
            className="pl-9 bg-gray-100 border-none h-10"
          />
        </form>
      </div>

      {/* 列表内容 */}
      <div className="p-4 space-y-4">
        {loading ? (
          // 加载骨架屏
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-none shadow-sm">
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
          guides.map((guide) => {
            console.log('Rendering guide:', guide); // Debug log
            return (
            <Card 
              key={guide.userId} 
              className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setLocation(`/guides/${guide.userId}`)}
            >
              <CardContent className="p-0 flex">
                {/* 左侧头像/封面 */}
                <div className="w-32 h-32 relative bg-gray-200 shrink-0">
                  <img
                    src={guide.avatarUrl || (guide.photos && guide.photos.length > 0 ? guide.photos[0].url : `https://api.dicebear.com/7.x/avataaars/svg?seed=${guide.userId}`)}
                    alt={guide.stageName || guide.nickName}
                    className="w-full h-full object-cover"
                    data-testid={`guide-avatar-${guide.userId}`}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                    <div className="flex items-center text-white text-xs">
                      <MapPin className="w-3 h-3 mr-0.5" />
                      {guide.city}
                      {guide.distance !== undefined && (
                        <span className="ml-1">
                          • {guide.distance < 1 ? `${Math.round(guide.distance * 1000)}m` : `${guide.distance}km`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 右侧信息 */}
                <div className="flex-1 p-3 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-gray-900 line-clamp-1" data-testid={`guide-name-${guide.userId}`}>
                        {guide.stageName || guide.nickName}
                      </h3>
                      <span className="text-orange-500 font-bold text-sm">
                        {guide.price ? <><Price amount={guide.price} />/h</> : "面议"}
                      </span>
                    </div>
                    
                    {/* 标签 */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {guide.tags?.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                      {guide.intro || "暂无简介"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })
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
