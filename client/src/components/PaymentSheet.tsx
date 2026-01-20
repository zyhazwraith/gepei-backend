
import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { payOrder } from "@/lib/api";
import { Loader2, CheckCircle } from "lucide-react";

interface PaymentSheetProps {
  orderId: number | null;
  amount: string | number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentSheet({ orderId, amount, isOpen, onClose, onSuccess }: PaymentSheetProps) {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("wechat");

  const handlePay = async () => {
    if (!orderId) return;

    setLoading(true);
    try {
      const res = await payOrder(orderId, "wechat");
      
      if (res.code === 0) {
        toast.success("支付成功");
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || "支付失败");
      }
    } catch (error) {
      toast.error("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="text-center text-lg">确认付款</DrawerTitle>
          </DrawerHeader>
          
          <div className="p-4 pb-0">
            <div className="flex flex-col items-center justify-center py-6 border-b">
              <span className="text-3xl font-bold">¥{Number(amount).toFixed(2)}</span>
            </div>
            
            <div className="py-6">
              <p className="text-sm text-gray-500 mb-4">选择支付方式</p>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center justify-between space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setPaymentMethod("wechat")}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#07C160] rounded flex items-center justify-center text-white">
                      <span className="font-bold text-xs">微信</span>
                    </div>
                    <Label htmlFor="wechat" className="cursor-pointer font-medium">微信支付</Label>
                  </div>
                  <RadioGroupItem value="wechat" id="wechat" />
                </div>
              </RadioGroup>
            </div>
          </div>

          <DrawerFooter>
            <Button 
              className="w-full bg-[#07C160] hover:bg-[#06AD56] h-12 text-base" 
              onClick={handlePay} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  支付处理中...
                </>
              ) : (
                "立即支付"
              )}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">取消</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
