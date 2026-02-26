import { Guide } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import Price from "@/components/Price";
import { User } from "lucide-react";

interface HomeGuideCardProps {
  guide: Guide;
}

export default function HomeGuideCard({ guide }: HomeGuideCardProps) {
  const [, setLocation] = useLocation();

  // MOCK DATA GENERATION
  // To keep consistent visual for same guide, use ID to seed simple randoms
  const seed = guide.userId;
  const mockTransactions = 90 + (seed % 10); // 90-99
  const mockPositiveRate = 95 + (seed % 5); // 95-99%
  const mockTotalHours = 100 + (seed % 200); // 100-300h

  return (
    <Card
      className="p-3 flex flex-row gap-3 hover:shadow-md transition-shadow cursor-pointer border-none shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden bg-white"
      onClick={() => setLocation(`/guides/${guide.userId}`)}
    >
      {/* Left: Large Portrait */}
      <div className="w-24 h-32 shrink-0 rounded-xl overflow-hidden relative bg-slate-100 shadow-inner">
        <img
          src={guide.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${guide.userId}`}
          alt={guide.stageName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right: Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1 h-32">
        {/* Header: Name + Gender + Status */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-bold text-slate-900 truncate max-w-[100px]">
                {guide.stageName}
              </h3>
              {/* Gender Icon (Mocked Female as requested) */}
              <User className="w-3.5 h-3.5 text-pink-500" />
            </div>
            
            {/* Online Status (Mocked) */}
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] text-slate-500">在线</span>
            </div>
          </div>

          {/* Stats Line */}
          <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-2">
            <span>好评率{mockPositiveRate}%</span>
            <span className="w-[1px] h-2 bg-slate-200" />
            <span>成交量{mockTransactions}+</span>
          </div>

          {/* Intro/Description */}
          <p className="text-xs text-slate-600 line-clamp-2 mb-2 leading-relaxed">
            {guide.intro || "超级厉害，唱歌也超级好听~~ 这里的风景我最熟悉，带你玩遍大街小巷！"}
          </p>
        </div>

        {/* Footer: Price + Hours */}
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl font-bold text-red-500 font-sans tracking-tight">
              <Price amount={guide.price || 0} />
            </span>
            {/* We hide /hour here to match design visual which focuses on big red number */}
          </div>
          
          <div className="text-[10px] text-slate-400">
            总时间:{mockTotalHours}小时
            {/* Removed Deposit as requested */}
          </div>
        </div>
      </div>
    </Card>
  );
}
