import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { banUser } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

interface BanUserDialogProps {
  userId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userNickname?: string;
}

export default function BanUserDialog({ 
  userId, 
  isOpen, 
  onClose, 
  onSuccess,
  userNickname 
}: BanUserDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!userId) return;
    if (!reason.trim()) {
      toast.error("请输入封禁原因");
      return;
    }

    setLoading(true);
    try {
      const res = await banUser(userId, reason);
      if (res.code === 0) {
        toast.success("用户已封禁");
        onSuccess();
        onClose();
        setReason(""); // Reset reason
      } else {
        toast.error(res.message || "操作失败");
      }
    } catch (error: any) {
      toast.error(error.message || "网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            封禁用户
          </DialogTitle>
          <DialogDescription>
            您正在封禁用户 <span className="font-bold text-slate-900">{userNickname || userId}</span>。
            该用户将立即无法登录。
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label htmlFor="reason" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              封禁原因 <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="reason"
              placeholder="请输入违规原因，如：发布虚假广告..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            确认封禁
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
