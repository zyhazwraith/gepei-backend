import { useState } from "react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { GuideForm } from "@/components/admin/GuideForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { getAdminUsers, AdminUser, createGuideProfile } from "@/lib/api";

export default function GuideCreate() {
  const [, setLocation] = useLocation();
  
  // Step 1: User Lookup State
  const [searchPhone, setSearchPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Step 2: Form Submission State
  const [submitting, setSubmitting] = useState(false);

  const handleSearchUser = async () => {
    if (!searchPhone || searchPhone.length < 4) {
      toast.error("请输入至少4位手机号");
      return;
    }

    setSearching(true);
    try {
      // Use existing admin user list API to find user
      const res = await getAdminUsers(1, 10, searchPhone);
      if (res.code === 0 && res.data?.list?.length > 0) {
        // Find exact match if possible, or take first
        const exact = res.data.list.find(u => u.phone === searchPhone);
        if (exact) {
           if (exact.isGuide) {
             toast.info("该用户已经是向导，正在跳转到编辑页面...");
             setTimeout(() => {
                 setLocation(`/admin/guides/${exact.id}`);
             }, 1000);
             return;
           }
           setSelectedUser(exact);
           toast.success("已找到用户");
        } else {
           toast.error("未找到精确匹配的用户，请检查手机号");
        }
      } else {
        toast.error("未找到用户");
      }
    } catch (error) {
      toast.error("查询失败");
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (data: any) => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
        const res = await createGuideProfile(data);
        if (res.code === 0) {
            toast.success("创建成功");
            setLocation("/admin/guides");
        } else {
            toast.error(res.message || "创建失败");
        }
    } catch (error: any) {
        toast.error(error.message || "创建出错");
    } finally {
        setSubmitting(false);
    }
  };

  return (
    <AdminLayout title="新建地陪档案">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => setLocation("/admin/guides")} className="pl-0">
            <ArrowLeft className="w-4 h-4 mr-2" /> 返回列表
        </Button>

        {/* Step 1: User Lookup */}
        {!selectedUser ? (
            <Card>
                <CardHeader>
                    <CardTitle>第一步：关联用户</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-gray-500">请输入已注册用户的手机号。只有已注册的用户才能成为地陪。</p>
                    <div className="flex gap-4">
                        <Input 
                            placeholder="输入用户手机号..." 
                            value={searchPhone}
                            onChange={(e) => setSearchPhone(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                            data-testid="input-search-phone"
                        />
                        <Button onClick={handleSearchUser} disabled={searching} data-testid="btn-search-user">
                            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                            查找用户
                        </Button>
                    </div>
                </CardContent>
            </Card>
        ) : (
            <div className="space-y-6">
                {/* Selected User Banner */}
                <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between border border-blue-100">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold">
                            {selectedUser.nickName?.[0] || "U"}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">{selectedUser.nickName || "未设置昵称"}</p>
                            <p className="text-sm text-gray-500">{selectedUser.phone}</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedUser(null)}>
                        更换用户
                    </Button>
                </div>

                {/* Step 2: Guide Form */}
                <GuideForm 
                    userId={selectedUser.id}
                    mode="create"
                    onSubmit={handleSubmit}
                    loading={submitting}
                    initialData={{
                        // Pre-fill phone for display (read-only in form)
                        phone: selectedUser.phone
                    }}
                />
            </div>
        )}
      </div>
    </AdminLayout>
  );
}
