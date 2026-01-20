import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  FileText,
  Wallet,
  User as UserIcon,
  Edit,
  Settings,
  HelpCircle,
  Info,
  ChevronRight,
  LogOut,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path?: string;
  onClick?: () => void;
}

export default function Profile() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleBecomeGuide = () => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      setLocation("/login");
      return;
    }
    // 跳转到地陪资料编辑页面
    setLocation("/guide-edit");
  };

  // 格式化手机号（隐藏中间4位）
  const formatPhone = (phone: string) => {
    if (!phone) return "";
    return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
  };

  const menuSections: MenuItem[][] = [
    [
      {
        icon: FileText,
        label: "我的订单",
        onClick: () => toast.info("功能开发中"),
      },
    ],
    [
      {
        icon: Wallet,
        label: "余额和提现",
        onClick: () => toast.info("功能开发中"),
      },
    ],
    [
      {
        icon: UserIcon,
        label: "个人资料",
        onClick: () => toast.info("功能开发中"),
      },
      {
        icon: Edit,
        label: "地陪资料编辑",
        onClick: () => setLocation("/guide-edit"),
      },
      {
        icon: Settings,
        label: "设置",
        onClick: () => toast.info("功能开发中"),
      },
    ],
    [
      {
        icon: HelpCircle,
        label: "帮助中心",
        onClick: () => toast.info("功能开发中"),
      },
      {
        icon: Info,
        label: "关于我们",
        onClick: () => toast.info("功能开发中"),
      },
    ],
    [
      {
        icon: LogOut,
        label: "退出登录",
        onClick: () => {
          logout();
          toast.success("已退出登录");
          setLocation("/login");
        },
      },
    ],
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-primary h-52 flex items-center justify-center">
          <div className="text-primary-foreground">加载中...</div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-primary h-52 flex flex-col items-center justify-center gap-4 px-4">
          <p className="text-primary-foreground text-lg">请先登录</p>
          <Button
            variant="secondary"
            onClick={() => setLocation("/login")}
            className="w-32"
          >
            去登录
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部用户信息区域 */}
      <div className="bg-primary pt-10 pb-32 px-4">
        <div className="flex flex-col items-center">
          <Avatar className="w-20 h-20 border-2 border-primary-foreground/20 mb-3">
            <AvatarImage src={user?.email || ""} />
            <AvatarFallback className="bg-primary-foreground/10 text-primary-foreground text-2xl">
              {user?.name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          
          <h2 className="text-primary-foreground text-xl font-semibold mb-1">
            {user?.name || "用户"}
          </h2>
          <p className="text-primary-foreground/80 text-sm mb-4">
            {formatPhone(user?.email || "")}
          </p>

          {/* 认证为地陪按钮 */}
          <button
            onClick={handleBecomeGuide}
            className="border-2 border-primary-foreground/80 text-primary-foreground px-8 py-2 rounded-full hover:bg-primary-foreground/10 transition-colors font-medium"
          >
            {user?.is_guide ? "管理地陪资料" : "认证为地陪"}
          </button>
        </div>
      </div>

      {/* 菜单列表 */}
      <div className="container max-w-2xl mx-auto px-4 -mt-16">
        {menuSections.map((section, sectionIndex) => (
          <Card key={sectionIndex} className="mb-2 overflow-hidden">
            {section.map((item, itemIndex) => {
              const Icon = item.icon;
              const handleClick = () => {
                if (item.onClick) {
                  item.onClick();
                } else if (item.path) {
                  setLocation(item.path);
                }
              };

              return (
                <button
                  key={itemIndex}
                  onClick={handleClick}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent transition-colors border-b last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-foreground font-medium">{item.label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              );
            })}
          </Card>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
