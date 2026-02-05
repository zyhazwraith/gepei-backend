import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, Calendar, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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

  const totalPrice = guide && guide.hourlyPrice 
    ? guide.hourlyPrice * formData.serviceHours
    : 0;

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
      };

      const res = await createOrder(payload);

      if (res.code === 0) {
        toast.success("预订成功！");
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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Nav */}
      <div className="bg-white sticky top-0 z-10 px-4 py-3 border-b flex items-center shadow-sm">
        <Button variant="ghost" size="icon" className="-ml-2 mr-2" onClick={() => window.history.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">预订下单</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Guide Card */}
        {guide && (
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0 flex h-24">
              <img 
                src={guide.avatarUrl || (guide.photos && guide.photos.length > 0 ? guide.photos[0] : `https://api.dicebear.com/7.x/avataaars/svg?seed=${guide.userId}`)}
                className="w-24 h-24 object-cover" 
              />
              <div className="p-3 flex flex-col justify-center">
                <h3 className="font-bold text-gray-900">{guide.stageName || guide.nickName}</h3>
                <p className="text-sm text-gray-500">{guide.city}</p>
                <div className="text-orange-500 font-bold mt-1"><Price amount={guide.hourlyPrice} />/小时</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form */}
        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
          
          <div className="space-y-2">
            <Label>服务时间</Label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="date"
                    className="pl-9"
                    min={new Date().toISOString().split("T")[0]}
                    value={formData.serviceDate}
                    onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
                  />
                </div>
                <div className="w-32">
                  <Input
                    type="time"
                    value={formData.serviceTime}
                    onChange={(e) => setFormData({ ...formData, serviceTime: e.target.value })}
                  />
                </div>
            </div>
          </div>

          {/* Location Picker (Unified) */}
          <div className="space-y-2">
            <Label>服务地点</Label>
            <LocationPicker 
              value={formData.serviceAddress}
              lat={formData.serviceLat || undefined}
              lng={formData.serviceLng || undefined}
              onChange={(loc) => setFormData({
                ...formData,
                serviceAddress: loc.address,
                serviceLat: loc.lat,
                serviceLng: loc.lng,
                // city: loc.city // Not needed for normal order unless stored
              })}
            />
          </div>

          {/* 服务时长 */}
          <div className="space-y-2">
            <Label>服务时长 (小时)</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="number"
                min={1}
                max={24}
                className="pl-9"
                value={formData.serviceHours}
                onChange={(e) => setFormData({ ...formData, serviceHours: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>备注 (可选)</Label>
            <div className="relative">
              <Info className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Textarea
                placeholder="其他特殊要求..."
                className="pl-9 min-h-[80px]"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Price & Submit */}
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t flex items-center gap-4 z-20">
          <div className="flex-1">
            <p className="text-xs text-gray-500">总计</p>
            <Price amount={totalPrice} className="text-2xl font-bold text-orange-600" />
          </div>
          <Button 
            size="lg" 
            className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "提交中..." : "提交订单"}
          </Button>
        </div>
      </div>
    </div>
  );
}
