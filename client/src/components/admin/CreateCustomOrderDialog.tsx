import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { createCustomOrder } from "@/lib/api";
import { Loader2 } from "lucide-react";

// Form Schema
const formSchema = z.object({
  userPhone: z.string().length(11, "用户手机号必须是11位"),
  guidePhone: z.string().length(11, "地陪手机号必须是11位"),
  priceYuan: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "请输入有效的单价"),
  duration: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0 && Number.isInteger(Number(val)), "时长必须为正整数"),
  serviceStartTime: z.string().min(1, "请选择服务开始时间"),
  serviceAddress: z.string().min(1, "请输入服务地点"),
  content: z.string().min(1, "请输入服务内容"),
  requirements: z.string().optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newOrderId: number) => void;
}

export default function CreateCustomOrderDialog({ open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userPhone: "",
      guidePhone: "",
      priceYuan: "",
      duration: "",
      serviceStartTime: "",
      serviceAddress: "",
      content: "",
      requirements: "",
    },
  });

  const priceYuan = form.watch("priceYuan");
  const duration = form.watch("duration");
  const totalAmountYuan = (Number(priceYuan) || 0) * (Number(duration) || 0);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      // Format time to ISO 8601 with offset
      const startTime = new Date(values.serviceStartTime).toISOString();
      
      // Convert Yuan to Cents
      const priceInCents = Math.round(Number(values.priceYuan) * 100);

      const res = await createCustomOrder({
        userPhone: values.userPhone,
        guidePhone: values.guidePhone,
        pricePerHour: priceInCents,
        duration: Number(values.duration),
        serviceStartTime: startTime,
        serviceAddress: values.serviceAddress,
        content: values.content,
        requirements: values.requirements,
      });

      if (res.code === 0 && res.data) {
        toast.success("定制订单创建成功");
        onOpenChange(false);
        form.reset();
        onSuccess(res.data.orderId);
      } else {
        toast.error(res.message || "创建失败");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>创建定制订单</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4" data-testid="create-custom-order-form">
            {/* User & Guide */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="userPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用户手机号</FormLabel>
                    <FormControl>
                      <Input placeholder="输入用户手机号" maxLength={11} {...field} data-testid="input-user-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="guidePhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>地陪手机号</FormLabel>
                    <FormControl>
                      <Input placeholder="输入地陪手机号" maxLength={11} {...field} data-testid="input-guide-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Price & Duration */}
            <div className="grid grid-cols-3 gap-4 items-end">
              <FormField
                control={form.control}
                name="priceYuan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>时薪 (元)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" min="0" step="1" {...field} data-testid="input-price-yuan" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>时长 (小时)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="8" min="1" step="1" {...field} data-testid="input-duration" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pb-2 text-sm">
                总价: <span className="text-lg font-bold text-orange-600">¥{totalAmountYuan.toFixed(2)}</span>
              </div>
            </div>

            {/* Time & Location */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serviceStartTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>服务开始时间</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} data-testid="input-service-start-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serviceAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>服务地点</FormLabel>
                    <FormControl>
                      <Input placeholder="例如: 北京首都机场T3" {...field} data-testid="input-service-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>服务内容</FormLabel>
                  <FormControl>
                    <Textarea placeholder="描述具体服务内容..." className="h-24" {...field} data-testid="input-content" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Requirements */}
            <FormField
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注 (可选)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="特殊要求或备注..." className="h-16" {...field} data-testid="input-requirements" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
              <Button type="submit" disabled={loading} data-testid="submit-create-order-btn">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                创建订单
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
