import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import AdminLayout from "@/components/layouts/AdminLayout";
import { getAdminGuideDetail, updateGuideProfile, AdminGuide } from "@/lib/api";
import { GuideForm } from "@/components/admin/GuideForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ChevronLeft } from "lucide-react";

export default function GuideAudit() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/admin/guides/:id");
  const userId = params?.id ? parseInt(params.id) : 0;

  const [guide, setGuide] = useState<AdminGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        setGuide(res.data);
      }
    } catch (error) {
      toast.error("获取地陪详情失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    setSaving(true);
    try {
      const res = await updateGuideProfile(userId, data);
      if (res.code === 0) {
        toast.success("保存成功");
        setGuide(res.data || null);
      } else {
        toast.error(res.message || "保存失败");
      }
    } catch (error: any) {
      toast.error(error.message || "保存出错");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="编辑地陪资料">
        <div className="flex justify-center items-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  if (!guide) {
    return (
      <AdminLayout title="编辑地陪资料">
        <div className="text-center p-8">未找到地陪信息</div>
      </AdminLayout>
    );
  }

  // Transform tags array to string for form
  const tagsString = guide.tags?.join(", ") || "";

  return (
    <AdminLayout title="编辑地陪资料">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setLocation("/admin/guides")}>
            <ChevronLeft className="w-4 h-4 mr-2" /> 返回列表
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">认证:</span>
            {guide.isGuide ? (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">已认证</Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">待审核</Badge>
            )}
            <span className="text-sm text-gray-500 ml-2">上架:</span>
            {guide.status === 'online' ? (
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">已上架</Badge>
            ) : (
              <Badge variant="secondary" className="text-gray-500">已下架</Badge>
            )}
          </div>
        </div>

        {/* Guide Form */}
        <GuideForm 
            userId={userId}
            mode="edit"
            onSubmit={handleSubmit}
            loading={saving}
            initialData={{
                stageName: guide.stageName,
                realName: guide.realName || "",
                idNumber: guide.idNumber,
                city: guide.city,
                address: guide.address || "",
                intro: guide.intro || "",
                phone: guide.phone,
                expectedPrice: guide.expectedPrice || 0, // Pass Cents, Form will convert to Yuan
                realPrice: guide.realPrice || 0, // Pass Cents, Form will convert to Yuan
                tags: tagsString,
                avatarUrl: guide.avatarUrl,
                avatarId: guide.avatarId,
                photos: guide.photos?.map((p) => ({
                    id: p.id,
                    url: p.url,
                    // Directly use backend slot. Trust the backend.
                    // GuideForm handles filtering based on slot matching.
                    slot: p.slot
                })) as any,
                isGuide: guide.isGuide,
                status: guide.status || 'offline'
            }}
        />
      </div>
    </AdminLayout>
  );
}
