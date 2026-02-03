import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { createOvertime } from "@/lib/api";
import { Clock, Calculator } from "lucide-react";

interface OvertimeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  pricePerHour: number; // Unit: cents (fen)
  onSuccess: (overtimeId: number, amount: number) => void;
}

export default function OvertimeDialog({ 
  isOpen, 
  onClose, 
  orderId, 
  pricePerHour,
  onSuccess 
}: OvertimeDialogProps) {
  const [duration, setDuration] = useState(1); // Default 1 hour
  const [loading, setLoading] = useState(false);

  const totalAmount = duration * pricePerHour; // cents

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await createOvertime(orderId, duration);
      if (res.code === 0 && res.data) {
        toast.success("加时申请创建成功，请支付");
        onSuccess(res.data.overtimeId, res.data.fee);
        onClose();
      } else {
        toast.error(res.message || "申请失败");
      }
    } catch (error: any) {
      toast.error(error.message || "网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>申请加时服务</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-5 h-5" />
                <span className="font-medium">加时时长</span>
             </div>
             <span className="text-2xl font-bold text-blue-600">{duration} 小时</span>
          </div>

          <Slider 
            value={[duration]} 
            onValueChange={(vals) => setDuration(vals[0])} 
            min={1} 
            max={8} 
            step={1}
            className="py-4"
          />
          
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-gray-500">小时单价</span>
                <span>¥{(pricePerHour / 100).toFixed(2)}/小时</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-medium flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    预估费用
                </span>
                <span className="text-xl font-bold text-orange-600">
                    ¥{(totalAmount / 100).toFixed(2)}
                </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1 sm:flex-none">
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1 sm:flex-none">
            {loading ? "提交中..." : "确认申请"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
