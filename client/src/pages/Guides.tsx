import { Construction } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";

export default function Guides() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav title="地陪列表" />
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Construction className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">功能开发中</h2>
        <p className="text-muted-foreground text-center">
          地陪列表功能正在开发中，敬请期待
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
