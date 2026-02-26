import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Smartphone, Lock, MessageSquare, X } from "lucide-react";
import { login, sendVerificationCode } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: authLogin } = useAuth();
  const [loginMode, setLoginMode] = useState<"password" | "code">("password");
  
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
    code: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // 验证码倒计时
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!formData.phone) {
      toast.error("请输入手机号");
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      toast.error("请输入正确的手机号");
      return;
    }

    try {
      await sendVerificationCode({ phone: formData.phone, usage: "login" });
      toast.success("验证码已发送");
      setCountdown(60);
    } catch (error: any) {
      toast.error(error.message || "发送失败，请稍后重试");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 基础验证
    if (!formData.phone) {
      toast.error("请输入手机号");
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      toast.error("请输入正确的手机号");
      return;
    }

    if (loginMode === "password" && !formData.password) {
      toast.error("请输入密码");
      return;
    }

    if (loginMode === "code" && !formData.code) {
      toast.error("请输入验证码");
      return;
    }

    setIsLoading(true);

    try {
      // 构造请求数据
      const payload = {
        phone: formData.phone,
        ...(loginMode === "password" ? { password: formData.password } : { code: formData.code }),
      };

      const response = await login(payload);

      if (response.code === 0 && response.data) {
        await authLogin(response.data.token);
        toast.success("登录成功");
        setLocation("/");
      } else {
        toast.error(response.message || "登录失败");
      }
    } catch (error: any) {
      const errorMessage = error?.message || "登录失败，请检查输入";
      toast.error(errorMessage);
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* 返回按钮 */}
      <button
        onClick={() => setLocation("/")}
        className="absolute top-4 left-4 z-20 p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors text-white"
      >
        <X className="w-6 h-6" />
      </button>

      {/* 顶部 Logo 区域 */}
      <div className="bg-gradient-to-br from-orange-400 to-rose-500 pt-16 pb-24 px-4 text-center">
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">牵寻伴</h1>
        <p className="text-white/80 text-sm">高品质地陪伴游服务</p>
      </div>

      <div className="px-4 -mt-16">
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] p-8">
          
          <Tabs value={loginMode} onValueChange={(v) => setLoginMode(v as "password" | "code")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="password">密码登录</TabsTrigger>
              <TabsTrigger value="code">验证码登录</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 手机号 (公共字段) */}
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

              <TabsContent value="password" className="space-y-4 mt-0">
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
                  <Link href="/reset-password">
                    <span className="text-sm text-primary hover:underline cursor-pointer">
                      忘记密码？
                    </span>
                  </Link>
                </div>
              </TabsContent>

              <TabsContent value="code" className="space-y-4 mt-0">
                 {/* 验证码 */}
                 <div className="space-y-2">
                  <Label htmlFor="code">验证码</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="code"
                        type="text"
                        placeholder="请输入验证码"
                        value={formData.code}
                        onChange={(e) =>
                          setFormData({ ...formData, code: e.target.value })
                        }
                        className="pl-10"
                        maxLength={6}
                        disabled={isLoading}
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      disabled={countdown > 0 || isLoading}
                      onClick={handleSendCode}
                      className="w-[120px]"
                    >
                      {countdown > 0 ? `${countdown}s` : "获取验证码"}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* 登录按钮 */}
              <Button
                type="submit"
                className="w-full h-12 text-base mt-2 rounded-full font-bold shadow-lg shadow-orange-200"
                disabled={isLoading}
              >
                {isLoading ? "登录中..." : "登录"}
              </Button>

              {/* 没有账号 */}
              <div className="mt-6" />
              <div className="text-center text-sm text-muted-foreground">
                还没有账号？{" "}
                <Link href="/register">
                  <span className="text-primary font-medium">立即注册</span>
                </Link>
              </div>
            </form>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
