import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title = "Dashboard" }: AdminLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location, setLocation] = useLocation();

  // 权限守卫
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        setLocation("/admin/login");
      } else if (user?.role !== "admin") {
        // 如果已登录但不是管理员，跳转到普通用户首页或提示页
        setLocation("/");
        // 可选：登出当前非管理员账号
        // logout();
      }
    }
  }, [loading, isAuthenticated, user, setLocation]);

  if (loading || !user || user.role !== "admin") {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>;
  }

  const navItems = [
    { label: "控制台", icon: LayoutDashboard, path: "/admin/dashboard" },
    { label: "订单管理", icon: ShoppingBag, path: "/admin/orders" },
    { label: "用户管理", icon: Users, path: "/admin/users" },
    { label: "系统设置", icon: Settings, path: "/admin/settings" },
  ];

  const handleLogout = () => {
    logout();
    setLocation("/admin/login");
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-300">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center text-sm">G</span>
          Gepei Admin
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "hover:bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
            {user.nickName?.[0] || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.nickName}</p>
            <p className="text-xs text-slate-500 truncate">管理员</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-slate-800"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          退出登录
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 h-screen sticky top-0">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-20 bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">Gepei Admin</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-300">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-slate-900 border-slate-800 w-64">
              <Sidebar />
            </SheetContent>
          </Sheet>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white">{title}</h2>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
