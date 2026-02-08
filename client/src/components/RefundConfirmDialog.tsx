import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RefundConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  hoursSincePaid: number;
}

export default function RefundConfirmDialog({ isOpen, onClose, onConfirm, hoursSincePaid }: RefundConfirmDialogProps) {
  const isPenalty = hoursSincePaid > 1;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">申请退款确认</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {isPenalty ? (
              <p>
                您距离支付已超过 1 小时。根据平台规则，申请退款将扣除 <span className="font-bold text-red-600">¥150</span> 违约金。
                <br />
                剩余金额将原路退回您的支付账户。
              </p>
            ) : (
              <p>
                您在支付 1 小时内申请退款，<span className="font-bold text-green-600">本次退款免费</span>。
                <br />
                全额资金将原路退回您的支付账户。
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              注意：退款申请提交后将立即生效，订单将自动取消。资金预计 1-3 个工作日到账。
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            确认退款
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
