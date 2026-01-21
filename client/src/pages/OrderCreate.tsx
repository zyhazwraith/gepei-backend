
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

export default function OrderCreate() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const query = new URLSearchParams(search);
  const guideId = query.get("guide_id");
  const { user } = useAuth();

  const [guide, setGuide] = useState<Guide | null>(null);
  const [loadingGuide, setLoadingGuide] = useState(!!guideId);
  const [submitting, setSubmitting] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    serviceDate: "",
    serviceHours: 8, // default 8 hours (普通单)
    city: "", // 定制单
    content: "", // 定制单
    budget: "", // 定制单
    remark: "", // 通用
  });

  const isCustom = !guideId;

  useEffect(() => {
    if (guideId) {
      fetchGuide(parseInt(guideId));
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
    ? (guide.hourlyPrice * formData.serviceHours).toFixed(2) 
    : "0.00";

  const handleSubmit = async () => {
    if (!user) {
      setLocation("/login");
      return;
    }

    if (!formData.serviceDate) {
      toast.error("请选择服务日期");
      return;
    }

    if (isCustom) {
      // 验证定制单必填项
      if (!formData.city) {
        toast.error("请输入目的地城市");
        return;
      }
      if (!formData.budget) {
        toast.error("请输入预算");
        return;
      }
      if (!formData.content) {
        toast.error("请输入服务内容");
        return;
      }
    }

    setSubmitting(true);
    try {
      let payload: CreateOrderRequest;

      if (isCustom) {
        payload = {
          type: 'custom',
          serviceDate: formData.serviceDate,
          city: formData.city,
          content: formData.content,
          budget: Number(formData.budget),
          requirements: formData.remark, // Map remark to requirements for Custom Order
        };
      } else {
        payload = {
          type: 'normal',
          serviceDate: formData.serviceDate,
          guideId: parseInt(guideId!),
          serviceHours: Number(formData.serviceHours),
          remark: formData.remark, // Use remark for Normal Order
        };
      }

      const res = await createOrder(payload);

      if (res.code === 0) {
        toast.success("预订成功！");
        // 跳转到订单详情页 (或列表页如果详情页未开发)
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

  // 如果是普通单但没加载到地陪信息，返回空
  if (!isCustom && !guide) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Nav */}
      <div className="bg-white sticky top-0 z-10 px-4 py-3 border-b flex items-center shadow-sm">
        <Button variant="ghost" size="icon" className="-ml-2 mr-2" onClick={() => window.history.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">{isCustom ? "定制行程" : "预订下单"}</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Guide Card (Only for Normal Order) */}
        {!isCustom && guide && (
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0 flex h-24">
              <img 
                src={guide.photos?.[0] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${guide.userId}`} 
                className="w-24 h-24 object-cover" 
              />
              <div className="p-3 flex flex-col justify-center">
                <h3 className="font-bold text-gray-900">{guide.nickName}</h3>
                <p className="text-sm text-gray-500">{guide.city}</p>
                <p className="text-orange-500 font-bold mt-1">¥{guide.hourlyPrice}/小时</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form */}
        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
          
          {/* 定制单特有字段：城市 */}
          {isCustom && (
            <div className="space-y-2">
              <Label>目的地城市</Label>
              <Input
                placeholder="例如：北京、上海"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>服务日期</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="date"
                className="pl-9"
                min={new Date().toISOString().split("T")[0]}
                value={formData.serviceDate}
                onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
              />
            </div>
          </div>

          {/* 普通单特有字段：时长 */}
          {!isCustom && (
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
          )}

          {/* 定制单特有字段：预算和服务内容 */}
          {isCustom && (
            <>
              <div className="space-y-2">
                <Label>预估预算 (元)</Label>
                <Input
                  type="number"
                  placeholder="请输入您的预算"
                  min={0}
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>服务内容需求</Label>
                <Textarea
                  placeholder="例如：想去故宫、长城，需要导游讲解，包车服务..."
                  className="min-h-[100px]"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>备注 (可选)</Label>
            <div className="relative">
              <Info className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Textarea
                placeholder="其他特殊要求..."
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
            <p className="text-2xl font-bold text-orange-600">
              {isCustom ? (formData.budget ? `¥${formData.budget}` : "待定") : `¥${totalPrice}`}
            </p>
          </div>
          <Button 
            size="lg" 
            className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "提交中..." : (isCustom ? "发布需求" : "提交订单")}
          </Button>
        </div>
      </div>
    </div>
  );
}
