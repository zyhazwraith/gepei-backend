import { Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderSupportBarProps {
  onContactClick: () => void;
}

export default function OrderSupportBar({ onContactClick }: OrderSupportBarProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between gap-4 border border-orange-100/50">
      <div className="flex-1">
        <h3 className="font-medium text-gray-900 text-sm">遇到问题？</h3>
        <p className="text-xs text-gray-500 mt-1">如需帮助或变更行程，请联系客服</p>
      </div>
      <Button 
        variant="outline" 
        size="sm"
        className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300"
        onClick={onContactClick}
      >
        <Headphones className="w-4 h-4 mr-2" />
        联系客服
      </Button>
    </div>
  );
}
