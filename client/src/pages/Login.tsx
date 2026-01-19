import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Smartphone, Lock } from "lucide-react";
import TopNav from "@/components/TopNav";
import { login } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: authLogin } = useAuth();
  const [activeTab, setActiveTab] = useState<"password" | "code">("password");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 表单验证
    if (!formData.phone || !formData.password) {
      toast.error("请填写手机号和密码");
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      toast.error("请输入正确的手机号");
      return;
    }

    setIsLoading(true);

    try {
      // 调用登录API
      const response = await login({
        phone: formData.phone,
        password: formData.password,
      });

      if (response.code === 0 && response.data) {
        // 登录成功，保存Token并跳转到首页
        await authLogin(response.data.token);
        toast.success("登录成功");
        setLocation("/");
      } else {
        toast.error(response.message || "登录失败");
      }
    } catch (error: any) {
      const errorMessage = error?.message || "登录失败，请检查手机号和密码";
      toast.error(errorMessage);
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部橙色区域 */}
      <div className="bg-primary text-primary-foreground relative" style={{ height: "280px" }}>
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 left-4 p-2 hover:bg-primary-foreground/10 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex flex-col items-center justify-center h-full">
          <h1 className="text-5xl font-bold mb-4">陪你</h1>
          <p className="text-base">高品质地陪伴游服务</p>
        </div>
      </div>

      {/* 表单卡片 */}
      <div className="container max-w-md mx-auto px-4" style={{ marginTop: "-40px" }}>
        <div className="bg-background rounded-2xl shadow-lg p-8">
          {/* Tab 切换 */}
          <div className="flex border-b mb-6">
            <button
              className={`flex-1 pb-3 text-center font-medium transition-colors relative ${
                activeTab === "password"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
              onClick={() => setActiveTab("password")}
            >
              密码登录
              {activeTab === "password" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              className={`flex-1 pb-3 text-center font-medium transition-colors relative ${
                activeTab === "code"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
              onClick={() => {
                setActiveTab("code");
                toast.info("验证码登录功能开发中");
              }}
            >
              验证码登录
              {activeTab === "code" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 手机号 */}
          <div className="space-y-2">
            <Label htmlFor="phone">手机号</Label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="请输入手机号"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="pl-10"
                maxLength={11}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* 密码 */}
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="请输入密码"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="pl-10 pr-10"
                maxLength={20}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* 忘记密码 */}
          <div className="flex justify-end">
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => toast.info("功能开发中")}
            >
              忘记密码？
            </button>
          </div>

          {/* 登录按钮 */}
          <Button
            type="submit"
            className="w-full h-12 text-base"
            disabled={isLoading}
          >
            {isLoading ? "登录中..." : "登录"}
          </Button>

          {/* 其他登录方式 */}
          <div className="my-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">其他登录方式</span>
              </div>
            </div>
          </div>

          {/* 微信登录 */}
          <div className="flex justify-center mb-6">
            <button
              type="button"
              onClick={() => toast.info("微信登录功能开发中")}
              className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center"
            >
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.5 9.5a1 1 0 110-2 1 1 0 010 2zm7 0a1 1 0 110-2 1 1 0 010 2zm-.5 6.5c-1.2 0-2.3-.5-3-1.3-.7.8-1.8 1.3-3 1.3-2.2 0-4-1.8-4-4 0-2.2 1.8-4 4-4 .4 0 .8.1 1.2.2C10.6 6.2 11.8 5 13.5 5c2.2 0 4 1.8 4 4 0 .4-.1.8-.2 1.2 1.1.4 1.7 1.6 1.7 2.8 0 2.2-1.8 4-4 4z"/>
              </svg>
            </button>
          </div>

          {/* 没有账号 */}
          <div className="text-center text-sm text-muted-foreground">
            还没有账号？{" "}
            <Link href="/register">
              <span className="text-primary font-medium">立即注册</span>
            </Link>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
