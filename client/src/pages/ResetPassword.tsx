import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Smartphone, Lock, MessageSquare } from "lucide-react";
import { resetPassword, sendVerificationCode } from "@/lib/api";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    phone: "",
    code: "",
    newPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
      await sendVerificationCode({ phone: formData.phone, usage: "reset_password" });
      toast.success("验证码已发送");
      setCountdown(60);
    } catch (error: any) {
      toast.error(error.message || "发送失败，请稍后重试");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.phone || !formData.code || !formData.newPassword) {
      toast.error("请填写完整信息");
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      toast.error("请输入正确的手机号");
      return;
    }
    
    // 密码强度校验: 8-20位，包含字母和数字
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/.test(formData.newPassword)) {
        toast.error("密码必须为8-20位，包含字母和数字");
        return;
    }

    setIsLoading(true);

    try {
      const response = await resetPassword({
        phone: formData.phone,
        code: formData.code,
        newPassword: formData.newPassword,
      });

      if (response.code === 0) {
        toast.success("密码重置成功，请登录");
        setLocation("/login");
      } else {
        toast.error(response.message || "重置失败");
      }
    } catch (error: any) {
      const errorMessage = error?.message || "重置失败，请检查输入";
      toast.error(errorMessage);
      console.error("Reset password error:", error);
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
          <h1 className="text-4xl font-bold mb-4">重置密码</h1>
          <p className="text-base opacity-90">找回您的账号密码</p>
        </div>
      </div>

      {/* 表单卡片 */}
      <div className="container max-w-md mx-auto px-4" style={{ marginTop: "-40px" }}>
        <div className="bg-background rounded-2xl shadow-lg p-8">
          
          <form onSubmit={handleSubmit} className="space-y-4">
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

            {/* 新密码 */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">新密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="8-20位，包含字母和数字"
                  value={formData.newPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, newPassword: e.target.value })
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

            {/* 提交按钮 */}
            <Button
              type="submit"
              className="w-full h-12 text-base mt-4"
              disabled={isLoading}
            >
              {isLoading ? "重置中..." : "确认重置"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}