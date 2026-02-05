import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { getGuideDetail, Guide } from "@/lib/api";
import { toast } from "sonner";
import Price from "@/components/Price";
import { Loader2, MapPin, ChevronLeft, Share2, Star, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// 工具函数：计算距离 (Haversine Formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 地球半径 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
}

export default function GuideDetail() {
  const [, params] = useRoute("/guides/:id");
  const [, setLocation] = useLocation();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    // 获取用户位置用于计算距离
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log("无法获取位置信息", error);
        }
      );
    }
  }, []);

  useEffect(() => {
    if (params?.id) {
      fetchDetail(parseInt(params.id));
    }
  }, [params?.id]);

  const fetchDetail = async (id: number) => {
    try {
      const res = await getGuideDetail(id);
      if (res.code === 0 && res.data) {
        setGuide(res.data);
      } else {
        toast.error(res.message || "获取详情失败");
      }
    } catch (error) {
      toast.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-4">
        <Skeleton className="h-64 w-full rounded-xl mb-4" />
        <Skeleton className="h-8 w-1/2 mb-2" />
        <Skeleton className="h-4 w-1/3 mb-6" />
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">未找到该地陪信息</p>
        <Button onClick={() => setLocation("/guides")}>返回列表</Button>
      </div>
    );
  }

  // 计算显示距离
  let displayDistance: number | undefined = guide.distance;
  
  // 如果后端没返回 distance（详情接口目前没返回），但我们有坐标，则前端计算
  if (displayDistance === undefined && guide.latitude && guide.longitude && userLocation) {
    displayDistance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      guide.latitude,
      guide.longitude
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24 relative">
      {/* 顶部导航 */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <button 
          onClick={() => window.history.back()}
          className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-colors">
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* 照片轮播 */}
      <div className="relative h-96 bg-gray-100">
        {guide.photos && guide.photos.length > 0 ? (
          <Carousel className="w-full h-full">
            <CarouselContent>
              {guide.photos.map((photo, index) => (
                <CarouselItem key={index} className="h-96">
                  <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        ) : (
          <img 
            src={guide.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${guide.userId}`} 
            className="w-full h-full object-cover"
            alt="Default Avatar" 
          />
        )}
      </div>

      {/* 内容区域 */}
      <div className="-mt-6 relative bg-white rounded-t-3xl p-6 shadow-lg">
        {/* 标题信息 */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2" data-testid="guide-detail-name">
              {guide.stageName || guide.nickName}
              <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200">
                <ShieldCheck className="w-3 h-3 mr-1" /> 已认证
              </Badge>
            </h1>
            <div className="flex items-center text-gray-500 mt-1 text-sm">
              <MapPin className="w-4 h-4 mr-1" />
              <span data-testid="guide-detail-city">{guide.city}</span>
              {displayDistance !== undefined && (
                <>
                  <span className="mx-2">•</span>
                  <span className="text-orange-500">距您 {formatDistance(displayDistance)}</span>
                </>
              )}
              <span className="mx-2">•</span>
              <Star className="w-4 h-4 text-gray-300 mr-1" />
              新入驻
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-orange-500" data-testid="guide-detail-price">
              {guide.price ? `¥${guide.price}` : "面议"}
              <span className="text-sm text-gray-400 font-normal">/小时</span>
            </div>
          </div>
        </div>

        {/* 标签 */}
        {guide.tags && guide.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {guide.tags.map(tag => (
              <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 简介 */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">关于我</h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-line">
            {guide.intro || "这个地陪很懒，还没有写简介~"}
          </p>
        </div>

        {/* 服务保障 - 静态展示 */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">服务保障</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-3 bg-blue-50 border-blue-100 flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-blue-500" />
              <div>
                <div className="font-medium text-blue-900 text-sm">平台认证</div>
                <div className="text-xs text-blue-700">实名身份核验</div>
              </div>
            </Card>
            <Card className="p-3 bg-green-50 border-green-100 flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-green-500" />
              <div>
                <div className="font-medium text-green-900 text-sm">资金托管</div>
                <div className="text-xs text-green-700">确认服务后打款</div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* 底部悬浮按钮 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg flex items-center gap-4 z-20">
        <div className="flex-1">
          <p className="text-xs text-gray-500">参考总价 (8小时)</p>
          <p className="text-xl font-bold text-orange-500">
            {guide.price ? <Price amount={guide.price * 8} /> : "¥0"}
            <span className="text-xs text-gray-400 font-normal">/天</span>
          </p>
        </div>
        <Button 
          size="lg" 
          className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-200"
          onClick={() => setLocation(`/orders/create?guideId=${guide.userId}`)}
        >
          立即预订
        </Button>
      </div>
    </div>
  );
}
