import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { uploadAttachment, checkInOrder, OrderDetailResponse, OrderStatus } from "@/lib/api";

interface GuideActionsProps {
  order: OrderDetailResponse;
  onOrderUpdated: (orderId: number) => void;
}

export default function GuideActions({ order, onOrderUpdated }: GuideActionsProps) {
  const [checkingIn, setCheckingIn] = useState(false);
  const [uploadedAttachmentId, setUploadedAttachmentId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canStartService = order.status === OrderStatus.WAITING_SERVICE;
  const canEndService = order.status === OrderStatus.IN_SERVICE;
  const isServiceEnded = order.status === OrderStatus.SERVICE_ENDED;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !order) return;

    setIsUploading(true);
    const toastId = toast.loading("正在上传图片...");

    try {
      // Determine slot based on status
      const slot = order.status === OrderStatus.WAITING_SERVICE ? 'start' : 'end';
      const uploadRes = await uploadAttachment(file, 'check_in', order.id.toString(), slot);
      if (uploadRes.code !== 0) throw new Error(uploadRes.message || '图片上传失败');
      
      setUploadedAttachmentId(uploadRes.data.id);
      setPreviewUrl(uploadRes.data.url);
      toast.success("图片上传成功", { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "上传失败", { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleCheckInSubmit = async () => {
    if (!order || !uploadedAttachmentId) {
      toast.error("请先上传打卡照片");
      return;
    }

    setCheckingIn(true);
    const toastId = toast.loading("正在获取位置并提交打卡...");

    try {
      // Get Location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) reject(new Error('浏览器不支持定位'));
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });

      // Submit Check-in
      const type = order.status === OrderStatus.WAITING_SERVICE ? 'start' : 'end';
      const checkInRes = await checkInOrder(order.id, {
        type,
        attachmentId: uploadedAttachmentId,
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });

      if (checkInRes.code === 0) {
        toast.success(type === 'start' ? '开始服务打卡成功' : '结束服务打卡成功', { id: toastId });
        // Reset state
        setUploadedAttachmentId(null);
        setPreviewUrl(null);
        onOrderUpdated(order.id);
      } else {
        throw new Error(checkInRes.message || '打卡提交失败');
      }

    } catch (error: any) {
      console.error(error);
      let msg = error.message;
      if (error instanceof GeolocationPositionError) {
        msg = "无法获取位置信息，请确保已授权定位权限";
      }
      toast.error(msg, { id: toastId });
    } finally {
      setCheckingIn(false);
    }
  };

  if (isServiceEnded) {
    return (
      <Button className="w-full" variant="secondary" disabled>
        等待系统结算中...
      </Button>
    );
  }

  if (!canStartService && !canEndService) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 1. 照片上传区域 */}
      <div className="flex justify-center">
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileChange}
          capture="environment" 
        />
        
        <div 
          className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors relative overflow-hidden"
          onClick={handlePhotoClick}
        >
          {isUploading ? (
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          ) : previewUrl ? (
             <>
               <img src={previewUrl} alt="Check-in" className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                 <Camera className="w-8 h-8 text-white" />
               </div>
             </>
          ) : (
             <div className="flex flex-col items-center text-gray-400">
               <Camera className="w-8 h-8 mb-2" />
               <span className="text-xs">点击拍摄/上传</span>
             </div>
          )}
        </div>
      </div>

      {/* 2. 确认按钮 */}
      <Button 
        className={`w-full ${canStartService ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
        size="lg"
        onClick={handleCheckInSubmit}
        disabled={checkingIn || !uploadedAttachmentId}
      >
        {checkingIn ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            正在提交...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5 mr-2" />
            {canStartService ? '确认开始服务' : '确认结束服务'}
          </>
        )}
      </Button>
    </div>
  );
}
