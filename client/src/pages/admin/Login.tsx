import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Lock, Phone } from "lucide-react";

export default function AdminLogin() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { login, logout } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 发送登录请求
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password }),
      });
      
      const data = await response.json();

      if (!response.ok || data.code !== 0) {
        throw new Error(data.message || '登录失败');
      }
      
      const { token, ...userInfo } = data.data;

      // 登录并更新状态
      const user = await login(token, userInfo);
      
      // 检查是否为管理员
      if (user && user.role === 'admin') {
        toast.success("管理员登录成功");
        setLocation("/admin/dashboard");
      } else {
        // 如果不是管理员，登出并提示
        logout(); // 清除本地可能的 token
        toast.error("无权限：该账号不是管理员");
      }
    } catch (error: any) {
      toast.error(error.message || "登录失败，请检查账号密码");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-950 text-slate-100">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-white">牵寻伴 管理系统</CardTitle>
          <CardDescription className="text-center text-slate-400">
            后台管理系统登录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">手机号</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="请输入管理员手机号"
                  className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:ring-slate-700"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:ring-slate-700"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" 
              disabled={loading}
            >
              {loading ? "登录中..." : "登 录"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
