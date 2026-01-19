import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, CheckCircle, CreditCard, Calendar, MapPin, FileText, Banknote } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { createOrder, payOrder } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// 步骤定义
const STEPS = ["填写需求", "确认信息", "支付订金"];

export default function Custom() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  // 表单数据
  const [formData, setFormData] = useState({
    service_date: "",
    city: "",
    content: "",
    budget: "",
    requirements: "",
  });

  // 订单数据 (创建后)
  const [orderId, setOrderId] = useState<number | null>(null);

  // 1. 提交需求 -> 创建订单
  const handleCreateOrder = async () => {
    // 简单校验
    if (!formData.service_date || !formData.city || !formData.content || !formData.budget) {
      toast.error("请填写完整信息");
      return;
    }

    setLoading(true);
    try {
      const res = await createOrder({
        ...formData,
        budget: Number(formData.budget),
      });
      
      if (res.code === 0 && res.data) {
        setOrderId(res.data.order_id);
        setStep(2); // 进入确认页
      } else {
        toast.error(res.message || "创建订单失败");
      }
    } catch (error: any) {
      console.error("创建订单错误:", error);
      toast.error(error.message || "创建失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 2. 确认支付 -> 调用支付接口
  const handlePayment = async () => {
    if (!orderId) return;

    setLoading(true);
    try {
      // 模拟微信支付
      const res = await payOrder(orderId, "wechat");
      
      if (res.code === 0) {
        toast.success("支付成功！");
        setStep(3); // 进入成功页
      } else {
        toast.error(res.message || "支付失败");
      }
    } catch (error: any) {
      console.error("支付错误:", error);
      toast.error(error.message || "支付失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 渲染步骤指示器
  const renderSteps = () => (
    <div className="flex justify-between items-center px-8 py-6 bg-white border-b">
      {STEPS.map((s, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step > i + 1
                ? "bg-green-500 text-white"
                : step === i + 1
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {step > i + 1 ? <CheckCircle className="w-5 h-5" /> : i + 1}
          </div>
          <span className={`text-xs ${step === i + 1 ? "text-black font-medium" : "text-gray-400"}`}>
            {s}
          </span>
        </div>
      ))}
    </div>
  );

  // 渲染表单页 (Step 1)
  const renderForm = () => (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="date">服务日期</Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            id="date"
            type="date"
            className="pl-9"
            value={formData.service_date}
            onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">服务城市</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            id="city"
            placeholder="例如：北京市朝阳区"
            className="pl-9"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">需求内容</Label>
        <div className="relative">
          <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Textarea
            id="content"
            placeholder="描述您想去的地方、想体验的项目..."
            className="pl-9 min-h-[100px]"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          />
        </div>
        <p className="text-xs text-gray-500 text-right">{formData.content.length}/200</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget">预算 (元)</Label>
        <div className="relative">
          <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            id="budget"
            type="number"
            placeholder="建议范围 150-300"
            className="pl-9"
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="requirements">特殊要求 (可选)</Label>
        <Textarea
          id="requirements"
          placeholder="例如：需要会开车、懂摄影..."
          value={formData.requirements}
          onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
        />
      </div>

      <Button className="w-full mt-6" size="lg" onClick={handleCreateOrder} disabled={loading}>
        {loading ? "提交中..." : "下一步：确认信息"}
      </Button>
    </div>
  );

  // 渲染确认页 (Step 2)
  const renderConfirm = () => (
    <div className="p-4 space-y-6">
      <Card className="border-none shadow-sm bg-gray-50">
        <CardContent className="p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">日期</span>
            <span className="font-medium">{formData.service_date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">城市</span>
            <span className="font-medium">{formData.city}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">预算</span>
            <span className="font-medium">¥{formData.budget}</span>
          </div>
          <div className="pt-2 border-t">
            <span className="text-gray-500 block mb-1">需求内容</span>
            <p className="text-gray-900">{formData.content}</p>
          </div>
        </CardContent>
      </Card>

      <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-orange-800 font-medium">需付订金</span>
          <span className="text-2xl font-bold text-orange-600">¥150.00</span>
        </div>
        <p className="text-xs text-orange-600/80 flex items-center gap-1">
          <CreditCard className="w-3 h-3" />
          支付后若无地陪接单，订金将原路退回
        </p>
      </div>

      <div className="space-y-3">
        <Button className="w-full bg-[#07C160] hover:bg-[#06AD56]" size="lg" onClick={handlePayment} disabled={loading}>
          {loading ? "支付处理中..." : "微信支付 ¥150.00"}
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setStep(1)} disabled={loading}>
          返回修改
        </Button>
      </div>
    </div>
  );

  // 渲染成功页 (Step 3)
  const renderSuccess = () => (
    <div className="flex flex-col items-center justify-center p-8 pt-20 text-center space-y-6">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
        <CheckCircle className="w-10 h-10" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold text-gray-900">支付成功</h2>
        <p className="text-gray-500 mt-2">您的定制需求已发布，正在等待地陪接单</p>
      </div>

      <div className="w-full pt-8 space-y-3">
        <Button className="w-full" size="lg" onClick={() => setLocation("/")}>
          返回首页
        </Button>
        <Button variant="outline" className="w-full" onClick={() => orderId && setLocation(`/orders/${orderId}`)}>
          查看订单
        </Button>
      </div>
    </div>
  );

  // 未登录拦截
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">请先登录后使用定制功能</p>
        <Button onClick={() => setLocation("/login")}>去登录</Button>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* 顶部导航 */}
      <div className="bg-white sticky top-0 z-10 px-4 py-3 border-b flex items-center">
        {step === 1 && (
          <Button variant="ghost" size="icon" className="-ml-2 mr-2" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <h1 className="text-lg font-bold">高端定制</h1>
      </div>

      {step < 3 && renderSteps()}

      {step === 1 && renderForm()}
      {step === 2 && renderConfirm()}
      {step === 3 && renderSuccess()}

      {/* 步骤3时不显示底部导航，避免干扰 */}
      {step < 3 && <BottomNav />}
    </div>
  );
}
