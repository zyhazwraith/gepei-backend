import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

// 模拟推荐地陪数据
const recommendedGuides = [
  {
    id: 1,
    name: "小雨",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=xiayu",
    rating: 4.9,
    city: "未知",
    price: 200,
    verified: true,
    recentOrder: true,
  },
  {
    id: 2,
    name: "晓晓",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoxiao",
    rating: 4.8,
    city: "未知",
    price: 180,
    verified: true,
    recentOrder: true,
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const quickActions = [
    {
      icon: Users,
      title: "找地陪",
      subtitle: "海量优质地陪",
      color: "bg-purple-500",
      path: "/guides",
    },
    {
      icon: Sparkles,
      title: "高端定制",
      subtitle: "专属VIP服务",
      color: "bg-yellow-500",
      path: "/custom",
    },
    {
      icon: MapPin,
      title: "我的订单",
      subtitle: "订单管理",
      color: "bg-primary",
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
      {/* 顶部导航栏 */}
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">陪你</h1>
        <div className="flex items-center gap-3">
          <button className="p-1.5 hover:bg-primary-foreground/10 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button
            onClick={() => setLocation("/profile")}
            className="p-1.5 hover:bg-primary-foreground/10 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Hero 区域 */}
      <div className="bg-primary text-primary-foreground px-8 pt-6 pb-10 text-center">
        <h2 className="text-4xl font-bold mb-2">陪你</h2>
        <p className="text-sm mb-1">高品质地陪伴游服务</p>
        <p className="text-xs opacity-80">连接高净值客户与高颜值地陪</p>
      </div>

      {/* 快捷入口卡片 */}
      <div className="px-4 -mt-8 mb-6">
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Card
                key={index}
                className="p-4 flex flex-col items-center gap-2 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setLocation(action.path)}
              >
                <div className={`${action.color} w-12 h-12 rounded-full flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">{action.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.subtitle}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 平台保障 */}
      <div className="px-4 mb-5">
        <h3 className="text-lg font-semibold text-foreground mb-3">平台保障</h3>
        <div className="grid grid-cols-2 gap-2">
          {guarantees.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="bg-muted/50 rounded-lg px-3 py-2.5 flex items-center gap-2"
              >
                <Icon className="w-4 h-4 text-green-500" />
                <span className="text-sm text-foreground">{item.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 推荐地陪 */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">推荐地陪</h3>
          <button
            onClick={() => setLocation("/guides")}
            className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
          >
            查看更多
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {recommendedGuides.map((guide) => (
            <Card
              key={guide.id}
              className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setLocation(`/guides/${guide.id}`)}
            >
              <Avatar className="w-15 h-15">
                <AvatarImage src={guide.avatar} alt={guide.name} />
                <AvatarFallback>{guide.name[0]}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground">{guide.name}</span>
                  {guide.verified && (
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                      认证
                    </Badge>
                  )}
                  {guide.recentOrder && (
                    <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-0">
                      最近接单
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {guide.rating}
                  </span>
                  <span>{guide.city}</span>
                </div>

                <p className="text-sm font-semibold text-primary">
                  ¥{guide.price}/小时
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
