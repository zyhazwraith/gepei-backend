import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { getPublicConfigs } from "@/lib/api";
import { toast } from "sonner";

interface ContactCSDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export default function ContactCSDialog({ isOpen, onClose, title = "联系客服" }: ContactCSDialogProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !qrCodeUrl) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await getPublicConfigs();
      if (res.code === 0 && res.data && res.data.cs_qrcode_url) {
        setQrCodeUrl(res.data.cs_qrcode_url);
      }
    } catch (error) {
      console.error("Failed to fetch CS config", error);
      toast.error("获取客服信息失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center py-8 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm">加载中...</p>
            </div>
          ) : qrCodeUrl ? (
            <>
              <div className="relative w-64 h-64 bg-gray-100 rounded-lg overflow-hidden border">
                <img 
                  src={qrCodeUrl} 
                  alt="客服二维码" 
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-gray-500 text-center">
                请使用微信扫描上方二维码<br/>添加客服微信沟通
              </p>
            </>
          ) : (
             <div className="text-center py-8 text-gray-500">
                <p>暂无客服二维码信息</p>
                <p className="text-xs mt-2">请稍后再试</p>
             </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
