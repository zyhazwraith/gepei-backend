import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  FileText,
  Wallet,
  UserCog,
  ShieldCheck,
  ListOrdered,
  ChevronRight,
  LogOut,
  Settings,
  HelpCircle,
  Info,
  User as UserIcon,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Badge } from "@/components/ui/badge";

export default function Profile() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    toast.success("已退出登录");
    setLocation("/login");
  };

  const isGuide = user?.isGuide;
  const isAdmin = user?.role === 'admin';

  // 格式化手机号（隐藏中间4位）
  const formatPhone = (phone: string) => {
    if (!phone) return "";
    return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
  };

  const handleBecomeGuide = () => {
    if (!isAuthenticated) {
      toast.error("请先登录");
      setLocation("/login");
      return;
    }
    // 跳转到地陪资料编辑页面
    setLocation("/guides/profile");
  };

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
            <AvatarImage src={user?.avatarUrl || ""} />
            <AvatarFallback className="bg-primary-foreground/10 text-primary-foreground text-2xl">
              {user?.nickName?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          
          <h2 className="text-primary-foreground text-xl font-semibold mb-1">
            {user?.nickName || "用户"}
          </h2>
          <p className="text-primary-foreground/80 text-sm mb-4">
            {formatPhone(user?.phone || "")}
          </p>

          {/* 认证为地陪按钮 */}
          <button
            onClick={handleBecomeGuide}
            className="border-2 border-primary-foreground/80 text-primary-foreground px-8 py-2 rounded-full hover:bg-primary-foreground/10 transition-colors font-medium"
          >
            {user?.isGuide ? "管理地陪资料" : "认证为地陪"}
          </button>
        </div>
      </div>

      {/* 菜单列表 */}
      <div className="px-4 -mt-4 relative z-20 space-y-4">
        {/* 主要功能卡片 */}
        <Card className="border-0 shadow-lg shadow-black/5 overflow-hidden">
          <CardContent className="p-0">
             <div className="divide-y divide-border/50">
                <button
                  onClick={() => setLocation("/orders")}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <ListOrdered className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm">我的订单</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                </button>

                <button
                  onClick={() => setLocation("/wallet")}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm">我的钱包</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                </button>

                <button
                  onClick={() => setLocation("/guides/profile")}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                      <UserCog className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-sm">
                        {isGuide ? "地陪资料管理" : "成为地陪"}
                      </div>
                      {!isGuide && (
                        <div className="text-[10px] text-muted-foreground">
                          认证后可接单赚钱
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isGuide ? (
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-[10px]">已认证</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal border-border/50">未认证</Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                </button>
             </div>
          </CardContent>
        </Card>

        {/* 常用功能 */}
        <Card className="border-0 shadow-lg shadow-black/5 overflow-hidden">
           <CardContent className="p-0">
             <div className="divide-y divide-border/50">
               <button
                  onClick={() => toast.info("功能开发中")}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
               >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-pink-50 flex items-center justify-center text-pink-600">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm">个人资料</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
               </button>

               <button
                  onClick={() => toast.info("功能开发中")}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
               >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-600">
                      <Settings className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm">设置</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
               </button>
             </div>
           </CardContent>
        </Card>

        {/* 其他服务 */}
        <Card className="border-0 shadow-lg shadow-black/5 overflow-hidden">
           <CardContent className="p-0">
             <div className="divide-y divide-border/50">
               <button
                  onClick={() => toast.info("功能开发中")}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
               >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm">帮助中心</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
               </button>

               <button
                  onClick={() => toast.info("功能开发中")}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
               >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Info className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm">关于我们</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
               </button>
             </div>
           </CardContent>
        </Card>

        {/* 系统功能 */}
        <Card className="border-0 shadow-lg shadow-black/5 overflow-hidden">
           <CardContent className="p-0">
             <div className="divide-y divide-border/50">
               {isAdmin && (
                  <button
                    onClick={() => window.location.href = "/admin/dashboard"}
                    className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-sm">后台管理</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                  </button>
               )}
               
               <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-4 hover:bg-red-50/50 transition-colors group"
               >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-100 transition-colors">
                      <LogOut className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm text-red-600">退出登录</span>
                  </div>
               </button>
             </div>
           </CardContent>
        </Card>
        
        <div className="text-center pt-4">
          <p className="text-[10px] text-muted-foreground/40">Gepei v2.0.0</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
