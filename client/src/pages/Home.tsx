import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getGuides, Guide } from "@/lib/api";
import Price from "@/components/Price";
import {
  MapPin,
  Star,
  Users,
  Sparkles,
  Bell,
  Settings,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useLocation } from "wouter";
import BottomNav from "@/components/BottomNav";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [recommendedGuides, setRecommendedGuides] = useState<Guide[]>([]);
  const [userLat, setUserLat] = useState<number>();
  const [userLng, setUserLng] = useState<number>();

  useEffect(() => {
    // 尝试获取位置以显示距离
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
        },
        (err) => console.log("Location access denied or error:", err),
        { timeout: 5000 }
      );
    }
  }, []);

  useEffect(() => {
    fetchRecommendedGuides();
  }, [userLat, userLng]);

  const fetchRecommendedGuides = async () => {
    try {
      // 获取第一页数据作为推荐，带上坐标
      const res = await getGuides(1, 4, undefined, undefined, userLat, userLng);
      if (res.code === 0 && res.data) {
        setRecommendedGuides(res.data.list);
      }
    } catch (error) {
      console.error("Failed to fetch guides:", error);
    }
  };
  const quickActions = [
    {
      icon: Users,
      title: "找地陪",
      subtitle: "海量优质地陪",
      color: "bg-orange-50",
      iconColor: "text-primary",
      path: "/guides",
    },
    {
      icon: Sparkles,
      title: "高端定制",
      subtitle: "专属VIP服务",
      color: "bg-orange-50",
      iconColor: "text-primary",
      path: "/custom",
    },
    {
      icon: MapPin,
      title: "我的订单",
      subtitle: "订单管理",
      color: "bg-orange-50",
      iconColor: "text-primary",
      path: "/profile",
    },
  ];

  const guarantees = [
    { icon: CheckCircle2, text: "实名认证" },
    { icon: CheckCircle2, text: "安全保障" },
    { icon: CheckCircle2, text: "服务承诺" },
    { icon: CheckCircle2, text: "7×24客服" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero 区域 (Merged Header) */}
      <div className="bg-primary text-primary-foreground px-4 pt-4 pb-16 relative">
        {/* Top Buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button
            onClick={() => setLocation("/profile")}
            className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Content */}
        <div className="text-center mt-8">
          <h1 className="text-4xl font-bold mb-3 tracking-tight">陪你</h1>
          <p className="text-base font-medium mb-1 opacity-95">高品质地陪伴游服务</p>
          <p className="text-xs opacity-80">连接高净值客户与高颜值地陪</p>
        </div>
      </div>

      {/* 快捷入口卡片 */}
      <div className="px-4 -mt-12 mb-8 relative z-10">
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Card
                key={index}
                className="p-4 flex flex-col items-center gap-2 hover:shadow-lg transition-shadow cursor-pointer border-none shadow-md"
                onClick={() => setLocation(action.path)}
              >
                <div className={`${action.color} w-12 h-12 rounded-full flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${action.iconColor}`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-foreground">{action.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{action.subtitle}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 平台保障 */}
      <div className="px-4 mb-8">
        <div className="grid grid-cols-4 gap-2">
          {guarantees.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="flex flex-col items-center justify-center gap-1.5 text-center"
              >
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{item.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 推荐地陪 */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">推荐地陪</h3>
          <button
            onClick={() => setLocation("/guides")}
            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors"
          >
            查看更多
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-3">
          {recommendedGuides.map((guide) => (
            <Card
              key={guide.userId}
              className="p-3 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer border-slate-100"
              onClick={() => setLocation(`/guides/${guide.userId}`)}
            >
              <Avatar className="w-14 h-14 border border-slate-100">
                <AvatarImage src={guide.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${guide.userId}`} alt={guide.stageName || guide.nickName} />
                <AvatarFallback>{(guide.stageName || guide.nickName)?.[0] || 'G'}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-900 truncate">{guide.stageName || guide.nickName}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-orange-50 text-orange-600 border-orange-100">
                    认证
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    4.9
                  </span>
                  <span>{guide.city}</span>
                  {guide.distance !== undefined && (
                    <span className="text-orange-500 font-medium">
                      {guide.distance < 1 ? `${Math.round(guide.distance * 1000)}m` : `${guide.distance}km`}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-red-500">
                    <Price amount={guide.price || guide.realPrice || 0} />
                  </span>
                  <span className="text-xs text-slate-400">/小时</span>
                </div>
              </div>
            </Card>
          ))}
          {recommendedGuides.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Users className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">暂无推荐地陪</p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
