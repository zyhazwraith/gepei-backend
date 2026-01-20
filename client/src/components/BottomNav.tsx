import { Home, Users, MessageCircle, Sparkles, User } from "lucide-react";
import { Link, useLocation } from "wouter";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "首页", path: "/" },
  { icon: Users, label: "地陪", path: "/guides" },
  { icon: Sparkles, label: "定制", path: "/custom" },
  { icon: MessageCircle, label: "订单", path: "/orders" }, // 暂时替换消息入口
  { icon: User, label: "我的", path: "/profile" },
];

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
            <Link key={item.path} href={item.path}>
              <button
                className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-xs">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
