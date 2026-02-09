import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, User, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { CreateGuideDTO } from "@/lib/api";

// Schema (Matches Backend DTO)
const guideFormSchema = z.object({
  stageName: z.string().min(1, "请输入艺名"),
  realName: z.string().min(1, "请输入真实姓名"),
  idNumber: z.string().min(1, "请输入身份证号"),
  phone: z.string().optional(), // Read-only for display
  city: z.string().min(1, "请输入城市"),
  address: z.string().optional(),
  intro: z.string().optional(),
  expectedPrice: z.coerce.number().min(0, "价格不能为负"),
  realPrice: z.coerce.number().min(0, "价格不能为负"),
  tags: z.string().optional(), // Comma separated string for input
  avatarUrl: z.string().optional(),
  avatarId: z.number().optional(),
  // Photos: Array of objects or IDs? 
  // We manage photos by slot independently, but we need to track them to update the guide.
  // Actually, upload API updates attachments. 
  // Guide update API expects `photoIds`.
  // So we need to maintain a map of slot -> photoId.
  photos: z.array(z.object({
      id: z.number(),
      url: z.string(),
      slot: z.number()
  })).optional(),
  isGuide: z.boolean().default(false),
  status: z.enum(['online', 'offline']).default('offline'),
});

type GuideFormValues = z.infer<typeof guideFormSchema>;

interface GuideFormProps {
  userId: number;
  initialData?: Partial<GuideFormValues>;
  mode: "create" | "edit";
  onSubmit: (data: any) => Promise<void>;
  loading?: boolean;
}

export function GuideForm({ userId, initialData, mode, onSubmit, loading }: GuideFormProps) {
  const form = useForm<GuideFormValues>({
    resolver: zodResolver(guideFormSchema),
    defaultValues: {
      stageName: "",
      realName: "",
      idNumber: "",
      city: "",
      address: "",
      intro: "",
      expectedPrice: initialData?.expectedPrice ? initialData.expectedPrice / 100 : 0,
      realPrice: initialData?.realPrice ? initialData.realPrice / 100 : 0,
      tags: "",
      avatarUrl: "",
      photos: [],
      isGuide: false,
      status: "offline",
      ...initialData,
      // Override price if passed in initialData (which is usually merged last)
      // But we need to divide by 100.
      // So explicit keys above might be overridden by ...initialData if it contains them.
      // Let's refine this.
    },
  });

  // Re-set defaults if initialData changes or we need to ensure conversion
  useEffect(() => {
     if (initialData) {
         // Deep merge or just set specific fields
         // Price conversion Cents -> Yuan
         if (initialData.expectedPrice !== undefined) form.setValue("expectedPrice", initialData.expectedPrice / 100);
         if (initialData.realPrice !== undefined) form.setValue("realPrice", initialData.realPrice / 100);
     }
  }, [initialData, form]);

  // Watch isGuide to disable status
  const isGuide = form.watch("isGuide");
  useEffect(() => {
      if (!isGuide) {
          form.setValue("status", "offline");
      }
  }, [isGuide, form]);

  const handleSubmit = async (values: GuideFormValues) => {
    // Transform tags string to array
    const tagsArray = values.tags 
        ? values.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean) 
        : [];
    
    // Transform photos to photoIds
    // We assume the parent component or API handles the actual linkage if we pass IDs.
    // However, the backend might expect just `photoIds` array.
    // The photo slot logic relies on the attachment upload `slot` param.
    // But does the Guide model store explicit slots? 
    // Yes, the `photos` field in Guide model is enriched from attachments.
    // When updating guide, we pass `photoIds`. 
    // We should pass ALL current photo IDs.
    const photoIds = values.photos?.map(p => p.id) || [];

    // Price conversion Yuan -> Cents
    const expectedPriceCents = Math.round(values.expectedPrice * 100);
    const realPriceCents = Math.round(values.realPrice * 100);

    await onSubmit({
        ...values,
        userId, // Ensure userId is passed
        tags: tagsArray,
        photoIds,
        expectedPrice: expectedPriceCents,
        realPrice: realPriceCents
    });
  };

  const handlePhotoUpload = (url: string, id: number | undefined, slotIndex: number) => {
      if (!id) return; // Should not happen on success
      const currentPhotos = form.getValues("photos") || [];
      // Remove existing photo at this slot
      const filtered = currentPhotos.filter(p => p.slot !== slotIndex);
      // Add new
      form.setValue("photos", [...filtered, { id, url, slot: slotIndex }]);
  };

  const handlePhotoRemove = (slotIndex: number) => {
      const currentPhotos = form.getValues("photos") || [];
      form.setValue("photos", currentPhotos.filter(p => p.slot !== slotIndex));
  };

  const getPhotoAtSlot = (slotIndex: number) => {
      return form.watch("photos")?.find(p => p.slot === slotIndex);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" data-testid="guide-form">
        
        {/* 1. Basic Info & Avatar */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" /> 基本信息
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left: Avatar */}
                <div className="md:col-span-1 flex flex-col items-center gap-4">
                    <FormField
                        control={form.control}
                        name="avatarUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>头像</FormLabel>
                                <FormControl>
                                    <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-100">
                                        <ImageUploader 
                                            usage="avatar"
                                            value={field.value}
                                            contextId={userId}
                                            onChange={(url, id) => {
                                                field.onChange(url);
                                                if (id) form.setValue("avatarId", id);
                                            }}
                                            className="w-full h-full"
                                            minimal
                                            data-testid="avatar-uploader"
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    {/* Status Switches */}
                    <div className="w-full space-y-4 bg-gray-50 p-4 rounded-lg">
                        <FormField
                            control={form.control}
                            name="isGuide"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-white">
                                    <div className="space-y-0.5">
                                        <FormLabel>认证状态</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            data-testid="switch-is-guide"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-white">
                                    <div className="space-y-0.5">
                                        <FormLabel>上架状态</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value === 'online'}
                                            onCheckedChange={(val) => field.onChange(val ? 'online' : 'offline')}
                                            disabled={!isGuide}
                                            data-testid="switch-status"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Right: Inputs */}
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="stageName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>艺名 (必填)</FormLabel>
                                <FormControl>
                                    <Input {...field} data-testid="input-stage-name" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="realName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>真实姓名</FormLabel>
                                <FormControl>
                                    <Input {...field} data-testid="input-real-name" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="idNumber"
                        render={({ field }) => (
                            <FormItem className="col-span-2">
                                <FormLabel>身份证号</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>城市</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>详细地址</FormLabel>
                                <FormControl>
                                    <Input {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="expectedPrice"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>期望价格 (元)</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="realPrice"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>系统价格 (元)</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} className="font-bold text-orange-600" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="intro"
                        render={({ field }) => (
                            <FormItem className="col-span-2">
                                <FormLabel>个人简介</FormLabel>
                                <FormControl>
                                    <Textarea {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                            <FormItem className="col-span-2">
                                <FormLabel>标签 (逗号分隔)</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="如: 活泼, 商务, 英语好" value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </CardContent>
        </Card>

        {/* 2. Photo Wall (5 Slots) */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" /> 照片墙 (5张)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-5 gap-4">
                    {[0, 1, 2, 3, 4].map((slot) => {
                        const photo = getPhotoAtSlot(slot);
                        return (
                            <div key={slot} className="aspect-[3/4] relative">
                                <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded z-10">
                                    #{slot + 1}
                                </div>
                                <ImageUploader
                                    usage="guide_photo"
                                    slot={String(slot)} // Important: Pass slot
                                    contextId={userId}
                                    value={photo?.url}
                                    onChange={(url, id) => {
                                        if (url && id) {
                                            handlePhotoUpload(url, id, slot);
                                        } else {
                                            handlePhotoRemove(slot);
                                        }
                                    }}
                                    className="w-full h-full rounded-lg border-2 border-dashed border-gray-200"
                                />
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
            <Button type="submit" disabled={loading} size="lg" data-testid="btn-save-guide">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                保存地陪资料
            </Button>
        </div>
      </form>
    </Form>
  );
}
