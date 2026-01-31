import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { getPublicConfigs, updateSystemConfigs } from "@/lib/api";
import { ImageUploader } from "@/components/ui/image-uploader";

// Form Schema
// PRD 5.3.1 Only mentions QR Code
const formSchema = z.object({
  cs_qrcode_url: z.string().optional(),
});

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cs_qrcode_url: "",
    },
  });

  // Fetch configs on mount
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const res = await getPublicConfigs();
        if (res.code === 0 && res.data) {
          form.reset({
            cs_qrcode_url: res.data.cs_qrcode_url || "",
          });
        } else {
          toast.error("加载配置失败");
        }
      } catch (error) {
        toast.error("网络错误");
      } finally {
        setInitialLoading(false);
      }
    };
    fetchConfigs();
  }, [form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const configs = [
        { key: "cs_qrcode_url", value: values.cs_qrcode_url || "" },
      ];

      const res = await updateSystemConfigs({ configs });
      if (res.code === 0) {
        toast.success("配置已保存");
      } else {
        toast.error(res.message || "保存失败");
      }
    } catch (error) {
      toast.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">系统设置</h1>
        <p className="text-muted-foreground">管理平台全局参数与联系方式。</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="system-config-form">
          
          {/* Card 1: 联系方式 */}
          <Card>
            <CardHeader>
              <CardTitle>客服联系方式</CardTitle>
              <CardDescription>设置前台展示的微信二维码。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <FormField
                  control={form.control}
                  name="cs_qrcode_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>客服微信二维码</FormLabel>
                      <FormControl>
                        <div data-testid="image-uploader-wrapper">
                          <ImageUploader 
                            value={field.value} 
                            onChange={field.onChange}
                            usage="system" // Must match backend enum
                            slot="qrcode"  // Must match backend slot
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading} size="lg" data-testid="submit-config-btn">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              保存配置
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}
