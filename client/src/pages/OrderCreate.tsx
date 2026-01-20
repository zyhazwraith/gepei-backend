
import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, Calendar, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { createOrder, getGuideDetail, Guide } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrderCreate() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const query = new URLSearchParams(search);
  const guideId = query.get("guide_id");
  const { user } = useAuth();

  const [guide, setGuide] = useState<Guide | null>(null);
  const [loadingGuide, setLoadingGuide] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    service_date: "",
    service_hours: 8, // default 8 hours
    remark: "",
  });

  useEffect(() => {
    if (!guideId) {
      toast.error("无效的地陪ID");
      setLocation("/guides");
      return;
    }
    fetchGuide(parseInt(guideId));
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

  const totalPrice = guide && guide.hourly_price 
    ? (guide.hourly_price * formData.service_hours).toFixed(2) 
    : "0.00";

  const handleSubmit = async () => {
    if (!user) {
      setLocation("/login");
      return;
    }

    if (!formData.service_date) {
      toast.error("请选择服务日期");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createOrder({
        guide_id: parseInt(guideId!),
        service_date: formData.service_date,
        service_hours: Number(formData.service_hours),
        remark: formData.remark,
      });

      if (res.code === 0) {
        toast.success("预订成功！");
        // 跳转到订单详情页 (或列表页如果详情页未开发)
        setLocation(`/orders/${res.data.order_id}`);
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

  if (!guide) return null;

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
        <Card className="border-none shadow-sm overflow-hidden">
          <CardContent className="p-0 flex h-24">
            <img 
              src={guide.photos?.[0] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${guide.user_id}`} 
              className="w-24 h-24 object-cover" 
            />
            <div className="p-3 flex flex-col justify-center">
              <h3 className="font-bold text-gray-900">{guide.name}</h3>
              <p className="text-sm text-gray-500">{guide.city}</p>
              <p className="text-orange-500 font-bold mt-1">¥{guide.hourly_price}/小时</p>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
          <div className="space-y-2">
            <Label>服务日期</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="date"
                className="pl-9"
                min={new Date().toISOString().split("T")[0]}
                value={formData.service_date}
                onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>服务时长 (小时)</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="number"
                min={1}
                max={24}
                className="pl-9"
                value={formData.service_hours}
                onChange={(e) => setFormData({ ...formData, service_hours: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>备注需求 (可选)</Label>
            <div className="relative">
              <Info className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Textarea
                placeholder="例如：想去故宫，需要讲解..."
                className="pl-9 min-h-[80px]"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Price & Submit */}
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t flex items-center gap-4 z-20">
          <div className="flex-1">
            <p className="text-xs text-gray-500">总计</p>
            <p className="text-2xl font-bold text-orange-600">¥{totalPrice}</p>
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
