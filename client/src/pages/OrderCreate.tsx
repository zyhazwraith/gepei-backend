import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, Calendar, Clock, Info, MapPin, ShieldCheck, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createOrder, getGuideDetail, Guide, CreateOrderRequest } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationPicker } from "@/components/common/LocationPicker";
import Price from "@/components/Price";

export default function OrderCreate() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const query = new URLSearchParams(search);
  // Fix: support both guideId (camelCase) and guide_id (snake_case)
  const guideId = query.get("guideId") || query.get("guide_id");
  const { user } = useAuth();

  const [guide, setGuide] = useState<Guide | null>(null);
  const [loadingGuide, setLoadingGuide] = useState(!!guideId);
  const [submitting, setSubmitting] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    serviceDate: new Date().toISOString().split('T')[0], // Default to today
    serviceTime: "09:00",
    serviceHours: 8, // default 8 hours (普通单)
    serviceAddress: "",
    serviceLat: 0,
    serviceLng: 0,
    requirements: "", // 通用 (原 remark)
    content: "", // 服务内容
  });

  useEffect(() => {
    if (guideId) {
      fetchGuide(parseInt(guideId));
    } else {
      // If no guideId is present, this page should not be accessed directly for custom orders anymore.
      // Redirect to home or guides list.
      // toast.error("无效的订单请求");
      // setLocation("/guides");
      setLoadingGuide(false);
    }
  }, [guideId]);

  const fetchGuide = async (id: number) => {
    try {
      const res = await getGuideDetail(id);
      if (res.code === 0 && res.data) {
        setGuide(res.data);
      } else {
        toast.error("地陪信息获取失败");
        setLocation("/guides");
      }
    } catch (error) {
      toast.error("网络错误");
    } finally {
      setLoadingGuide(false);
    }
  };

  // 优先使用 guide.price (通常等于 realPrice) 或 realPrice，兜底 expectedPrice
  const unitPrice = guide ? (guide.price || guide.realPrice || guide.expectedPrice || 0) : 0;
  
  const totalPrice = unitPrice * formData.serviceHours;

  const handleSubmit = async () => {
    if (!user) {
      setLocation("/login");
      return;
    }

    if (!formData.serviceDate) {
      toast.error("请选择服务日期");
      return;
    }

    if (!formData.serviceAddress || !formData.serviceLat) {
        toast.error("请选择服务地点");
        return;
    }
    
    if (!guideId) {
        toast.error("请选择地陪");
        return;
    }

    if (!formData.content) {
      toast.error("请填写服务内容");
      return;
    }

    setSubmitting(true);
    try {
      const serviceStartTime = new Date(`${formData.serviceDate}T${formData.serviceTime}:00`).toISOString();

      const payload: CreateOrderRequest = {
        type: 'normal',
        serviceStartTime,
        duration: Number(formData.serviceHours),
        serviceAddress: formData.serviceAddress,
        serviceLat: Number(formData.serviceLat),
        serviceLng: Number(formData.serviceLng),
        guideId: parseInt(guideId),
        requirements: formData.requirements,
        content: formData.content, // Separate content field
      };

      const res = await createOrder(payload);

      if (res.code === 0) {
        toast.success("下单成功，请尽快支付");
        // 跳转到订单详情页
        setLocation(`/orders/${res.data.orderId}`);
      } else {
        toast.error(res.message || "预订失败");
      }
    } catch (error: any) {
      toast.error(error.message || "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingGuide) {
    return <div className="p-4"><Skeleton className="h-64 w-full" /></div>;
  }

  // Fallback if no guide found (though we redirect in effect)
  if (!guide) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <p className="text-gray-500">无效的下单请求</p>
            <Button onClick={() => setLocation("/guides")}>去选择地陪</Button>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm px-4 py-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="icon" className="-ml-2 hover:bg-slate-100 rounded-full" onClick={() => window.history.back()}>
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </Button>
          <h1 className="text-lg font-bold text-slate-900">确认订单</h1>
          <div className="w-10"></div> {/* Spacer for center alignment */}
        </div>
        
        {/* Guide Card - Clean Style */}
        {guide && (
          <div className="flex items-center gap-4 bg-white border-none shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] rounded-2xl p-4 mt-2">
             <img 
                src={guide.avatarUrl || (guide.photos && guide.photos.length > 0 ? guide.photos[0] : `https://api.dicebear.com/7.x/avataaars/svg?seed=${guide.userId}`)}
                className="w-14 h-14 rounded-full object-cover border border-slate-100" 
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-900">{guide.stageName || guide.nickName}</h3>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-none px-2 py-0.5 text-[10px] font-medium rounded-full">
                    <ShieldCheck className="w-3 h-3 mr-1" /> 已认证
                  </Badge>
                </div>
                <div className="flex items-center text-slate-500 text-xs mt-1 font-medium">
                  <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                  {guide.city}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-rose-500"><Price amount={unitPrice} /></div>
                <div className="text-[10px] text-slate-400">/小时</div>
              </div>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Form Container */}
        <div className="bg-white p-5 rounded-2xl shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] space-y-5 border-none">
          
          <div className="space-y-2">
            <Label className="text-slate-600 text-xs font-bold uppercase tracking-wider">服务时间</Label>
            <div className="flex gap-3">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="date"
                    className="pl-9 bg-slate-50 border-transparent focus:bg-white focus:border-orange-200 rounded-xl h-11 transition-all"
                    min={new Date().toISOString().split("T")[0]}
                    value={formData.serviceDate}
                    onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
                  />
                </div>
                <div className="w-36">
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="time"
                      className="pl-9 bg-slate-50 border-transparent focus:bg-white focus:border-orange-200 rounded-xl h-11 transition-all"
                      value={formData.serviceTime}
                      onChange={(e) => setFormData({ ...formData, serviceTime: e.target.value })}
                    />
                  </div>
                </div>
            </div>
          </div>

          {/* Location Picker */}
          <div className="space-y-2">
            <Label className="text-slate-600 text-xs font-bold uppercase tracking-wider">集合地点</Label>
            <LocationPicker 
              value={formData.serviceAddress}
              lat={formData.serviceLat || undefined}
              lng={formData.serviceLng || undefined}
              onChange={(loc) => setFormData({
                ...formData,
                serviceAddress: loc.address,
                serviceLat: loc.lat,
                serviceLng: loc.lng,
              })}
            />
          </div>

          {/* 服务内容 (New Field) */}
          <div className="space-y-2">
            <Label className="text-slate-600 text-xs font-bold uppercase tracking-wider">服务内容</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Textarea 
                placeholder="例如：市内一日游、机场接送、商务翻译..."
                className="pl-9 min-h-[80px] bg-slate-50 border-transparent focus:bg-white focus:border-orange-200 rounded-xl resize-none transition-all"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </div>
          </div>

          {/* 服务时长 */}
          <div className="space-y-2">
            <Label className="text-slate-600 text-xs font-bold uppercase tracking-wider">服务时长 (小时)</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="number"
                min={1}
                max={24}
                className="pl-9 bg-slate-50 border-transparent focus:bg-white focus:border-orange-200 rounded-xl h-11 transition-all"
                value={formData.serviceHours}
                onChange={(e) => setFormData({ ...formData, serviceHours: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-600 text-xs font-bold uppercase tracking-wider">备注 (可选)</Label>
            <div className="relative">
              <Info className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Textarea
                placeholder="其他特殊要求..."
                className="pl-9 min-h-[80px] bg-slate-50 border-transparent focus:bg-white focus:border-orange-200 rounded-xl resize-none transition-all"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t border-slate-100 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] flex items-center gap-4 z-20 pb-8">
        <div className="flex-1">
          <div className="flex items-baseline gap-1">
             <span className="text-[10px] text-slate-400 font-bold uppercase">Total</span>
             <Price amount={totalPrice} className="text-2xl font-black text-rose-500" />
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
             <Price amount={unitPrice} /> x {formData.serviceHours}小时
          </div>
        </div>
        <Button 
          size="lg" 
          className="flex-[2] h-12 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white shadow-lg shadow-orange-200 text-base font-bold border-none"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "提交中..." : "提交订单"}
        </Button>
      </div>
    </div>
  );
}
