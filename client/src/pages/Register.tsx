import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Smartphone, Lock, User } from "lucide-react";
import TopNav from "@/components/TopNav";
import { register } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function Register() {
  const [, setLocation] = useLocation();
  const { login: authLogin } = useAuth();
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
    confirmPassword: "",
    nickname: "",
    agreedToTerms: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 表单验证
    if (!formData.phone || !formData.password || !formData.nickname) {
      toast.error("请填写所有必填项");
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      toast.error("请输入正确的手机号");
      return;
    }

    // 密码验证：8-20位，包含字母和数字
    if (formData.password.length < 8 || formData.password.length > 20) {
      toast.error("密码长度应为8-20位");
      return;
    }
    
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(formData.password)) {
      toast.error("密码必须包含字母和数字");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    if (!formData.agreedToTerms) {
      toast.error("请阅读并同意用户协议和隐私政策");
      return;
    }

    setIsLoading(true);

    try {
      // 调用注册API
      const response = await register({
        phone: formData.phone,
        password: formData.password,
        nickname: formData.nickname,
      });

      if (response.code === 0 && response.data) {
        // 注册成功，保存Token并跳转到首页
        await authLogin(response.data.token);
        toast.success("注册成功！");
        setLocation("/");
      } else {
        toast.error(response.message || "注册失败");
      }
    } catch (error: any) {
      const errorMessage = error?.message || "注册失败，请稍后重试";
      toast.error(errorMessage);
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav title="注册" showBack />

      <div className="container max-w-md mx-auto pt-8 pb-20 px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">欢迎加入陪你</h2>
          <p className="text-muted-foreground">填写信息完成注册</p>
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

          {/* 昵称 */}
          <div className="space-y-2">
            <Label htmlFor="nickname">昵称</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="nickname"
                type="text"
                placeholder="请输入昵称"
                value={formData.nickname}
                onChange={(e) =>
                  setFormData({ ...formData, nickname: e.target.value })
                }
                className="pl-10"
                maxLength={20}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* 设置密码 */}
          <div className="space-y-2">
            <Label htmlFor="password">设置密码</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="请设置8-20位密码，包含字母和数字"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="pl-10"
                maxLength={20}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* 确认密码 */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认密码</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                className="pl-10"
                maxLength={20}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* 用户协议 */}
          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={formData.agreedToTerms}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, agreedToTerms: checked as boolean })
              }
              disabled={isLoading}
            />
            <label
              htmlFor="terms"
              className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
            >
              我已阅读并同意{" "}
              <span className="text-primary">《用户协议》</span> 和{" "}
              <span className="text-primary">《隐私政策》</span>
            </label>
          </div>

          {/* 注册按钮 */}
          <Button
            type="submit"
            className="w-full h-12 text-base"
            disabled={isLoading}
          >
            {isLoading ? "注册中..." : "注册"}
          </Button>

          {/* 已有账号 */}
          <div className="text-center text-sm text-muted-foreground">
            已有账号？{" "}
            <Link href="/login">
              <span className="text-primary font-medium">立即登录</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
