import { useState, useEffect } from "react";
import { Search, MapPin, Filter } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getGuides, Guide } from "@/lib/api";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

import { useLocation } from "wouter";

// 热门城市
const HOT_CITIES = ["北京", "上海", "广州", "成都", "西安", "杭州"];

export default function Guides() {
  const [, setLocation] = useLocation();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [showCityFilter, setShowCityFilter] = useState(false);
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
      <div className="bg-white sticky top-0 z-10 px-4 py-3 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索地陪名字/简介"
              className="pl-9 bg-gray-100 border-none h-10"
            />
          </div>
          <Button
            type="button"
            variant={selectedCity ? "default" : "outline"}
            onClick={() => setShowCityFilter(!showCityFilter)}
            className="h-10 px-3"
          >
            <Filter className="w-4 h-4 mr-1" />
            {selectedCity || "城市"}
          </Button>
        </form>

        {/* 城市筛选区 */}
        {showCityFilter && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={!selectedCity ? "default" : "outline"}
                className="cursor-pointer py-1.5 px-3"
                onClick={() => {
                  setSelectedCity("");
                  setShowCityFilter(false);
                }}
              >
                全部
              </Badge>
              {HOT_CITIES.map((city) => (
                <Badge
                  key={city}
                  variant={selectedCity === city ? "default" : "outline"}
                  className="cursor-pointer py-1.5 px-3"
                  onClick={() => {
                    setSelectedCity(city);
                    setShowCityFilter(false);
                  }}
                >
                  {city}
                </Badge>
              ))}
            </div>
          </div>
        )}
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
          guides.map((guide) => (
            <Card 
              key={guide.guideId} 
              className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setLocation(`/guides/${guide.guideId}`)}
            >
              <CardContent className="p-0 flex">
                {/* 左侧头像/封面 */}
                <div className="w-32 h-32 relative bg-gray-200 shrink-0">
                  <img
                    src={guide.photos && guide.photos.length > 0 ? guide.photos[0] : `https://api.dicebear.com/7.x/avataaars/svg?seed=${guide.userId}`}
                    alt={guide.nickName}
                    className="w-full h-full object-cover"
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
                      <h3 className="font-bold text-gray-900 line-clamp-1">{guide.nickName}</h3>
                      <span className="text-orange-500 font-bold text-sm">
                        {guide.hourlyPrice ? `¥${guide.hourlyPrice}/h` : "面议"}
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
          ))
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
