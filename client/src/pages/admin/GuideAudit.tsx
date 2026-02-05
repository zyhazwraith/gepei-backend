import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import AdminLayout from "@/components/layouts/AdminLayout";
import { getAdminGuideDetail, updateAdminGuideStatus, AdminGuide } from "@/lib/api";
import Price from "@/components/Price";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ChevronLeft, Save, MapPin, User, Phone, Calendar } from "lucide-react";

export default function GuideAudit() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/admin/guides/:id");
  const userId = params?.id ? parseInt(params.id) : 0;

  const [guide, setGuide] = useState<AdminGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [realPrice, setRealPrice] = useState("");
  const [isGuide, setIsGuide] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchGuide();
    }
  }, [userId]);

  const fetchGuide = async () => {
    setLoading(true);
    try {
      const res = await getAdminGuideDetail(userId);
      if (res.code === 0 && res.data) {
        const data = res.data;
        setGuide(data);
        // Convert cents to yuan for display/input
        setRealPrice(data.realPrice ? (data.realPrice / 100).toString() : "");
        setIsGuide(data.isGuide);
      }
    } catch (error) {
      toast.error("获取地陪详情失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const priceYuan = parseFloat(realPrice);
      if (isNaN(priceYuan) || priceYuan < 0) {
        toast.error("请输入有效的系统价格");
        setSaving(false);
        return;
      }
      
      const priceCents = Math.round(priceYuan * 100);

      const res = await updateAdminGuideStatus(userId, {
        isGuide,
        realPrice: priceCents
      });

      if (res.code === 0) {
        toast.success("保存成功");
        fetchGuide(); // Refresh
      }
    } catch (error) {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="审核地陪">
        <div className="flex justify-center items-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  if (!guide) {
    return (
      <AdminLayout title="审核地陪">
        <div className="text-center p-8">未找到地陪信息</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="审核地陪">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setLocation("/admin/guides")}>
            <ChevronLeft className="w-4 h-4 mr-2" /> 返回列表
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">当前状态:</span>
            {guide.isGuide ? (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">已认证</Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">待审核</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Profile Info (2/3) */}
          <div className="md:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" /> 基本信息
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex items-center gap-4">
                  <img 
                    src={guide.avatarUrl || "https://placehold.co/100x100?text=Avatar"} 
                    alt="Avatar" 
                    className="w-20 h-20 rounded-full object-cover border"
                  />
                  <div>
                    <h3 className="text-xl font-bold">{guide.stageName}</h3>
                    <p className="text-sm text-gray-500">ID: {guide.userId}</p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-gray-500">手机号</Label>
                  <div className="font-mono flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {guide.phone || "-"}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-gray-500">常住城市</Label>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {guide.city}
                  </div>
                </div>

                <div className="space-y-1 col-span-2">
                  <Label className="text-gray-500">详细地址</Label>
                  <div className="text-gray-900">{guide.address || "-"}</div>
                </div>

                <div className="space-y-1 col-span-2">
                  <Label className="text-gray-500">个人简介</Label>
                  <div className="p-3 bg-gray-50 rounded-md text-sm leading-relaxed">
                    {guide.intro || "暂无简介"}
                  </div>
                </div>

                <div className="space-y-1 col-span-2">
                  <Label className="text-gray-500">技能标签</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {guide.tags && guide.tags.length > 0 ? (
                      guide.tags.map(tag => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">无标签</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Photos Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" /> 照片墙 ({guide.photos?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {guide.photos && guide.photos.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {guide.photos
                      .sort((a: any, b: any) => (a.slot ?? 99) - (b.slot ?? 99))
                      .map((photo: any) => (
                      <div key={photo.id} className="aspect-square relative group">
                        <img 
                          src={photo.url} 
                          alt={`Guide Photo Slot ${photo.slot}`} 
                          className="w-full h-full object-cover rounded-lg border hover:scale-105 transition-transform cursor-pointer"
                          onClick={() => window.open(photo.url, '_blank')}
                        />
                        {photo.slot !== undefined && (
                          <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded backdrop-blur-sm">
                            #{photo.slot + 1}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">
                    暂无照片
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Audit Actions (1/3) */}
          <div className="md:col-span-1 space-y-6">
            <Card className="border-orange-200 shadow-md">
              <CardHeader className="bg-orange-50 border-b border-orange-100">
                <CardTitle className="text-orange-800 flex items-center gap-2">
                  <Save className="w-5 h-5" /> 审核操作
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                
                {/* Expected Price Display */}
                <div className="space-y-2">
                  <Label className="text-gray-500">用户期望时薪</Label>
                  <div className="text-2xl font-bold text-gray-400">
                    <Price amount={guide.expectedPrice || 0} />
                  </div>
                </div>

                {/* Real Price Input */}
                <div className="space-y-2">
                  <Label htmlFor="realPrice">系统定价 (展示给用户)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">¥</span>
                    <Input 
                      id="realPrice"
                      type="number" 
                      className="pl-7 font-bold text-lg"
                      value={realPrice}
                      onChange={(e) => setRealPrice(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    设置此价格将覆盖期望价格，并在前台展示。
                  </p>
                </div>

                {/* Status Switch */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label className="text-base">认证状态</Label>
                    <p className="text-xs text-gray-500">
                      开启后将在前台列表展示
                    </p>
                  </div>
                  <Switch 
                    checked={isGuide}
                    onCheckedChange={setIsGuide}
                  />
                </div>

                {/* Save Button */}
                <Button 
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  size="lg"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 保存中...</>
                  ) : (
                    "保存审核结果"
                  )}
                </Button>

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
