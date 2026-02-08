import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import Price from "@/components/Price";
import { OrderDetailResponse, User, OrderStatus } from "@/lib/api";

interface UserActionsProps {
  order: OrderDetailResponse;
  currentUser: User | null;
  onShowPayment: () => void;
  onRequestOvertime: () => void;
}

export default function UserActions({ order, currentUser, onShowPayment, onRequestOvertime }: UserActionsProps) {
  const canRequestOvertime = order.status === OrderStatus.IN_SERVICE && currentUser?.userId === order.userId;
  const isPending = order.status === OrderStatus.PENDING;

  if (!isPending && !canRequestOvertime) {
    return null;
  }

  return (
    <>
      {isPending && (
        <Button 
          className="w-full bg-[#07C160] hover:bg-[#06AD56]" 
          size="lg"
          onClick={onShowPayment}
        >
          微信支付 <Price amount={order.amount} className="ml-1" />
        </Button>
      )}
      
      {/* User Overtime Request Button */}
      {canRequestOvertime && (
          <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white mb-3"
              onClick={onRequestOvertime}
          >
              <Clock className="w-4 h-4 mr-2" />
              申请加时服务
          </Button>
      )}
    </>
  );
}
