import { Link } from "wouter";
import { Users, Crown, Gamepad2 } from "lucide-react";
import { toast } from "sonner";

export default function HomeFeatureGrid() {
  return (
    <div className="px-4 mb-8">
      <div className="grid grid-cols-2 gap-3 h-48">
        {/* Left: Find Guide (Large) */}
        <Link href="/guides">
          <div className="h-full bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl p-4 relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
            <div className="relative z-10">
              <h3 className="text-white text-xl font-black italic tracking-wide mb-1">找地陪</h3>
              <div className="inline-block bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                <span className="text-white text-[10px] font-medium">海量优质地陪</span>
              </div>
            </div>
            
            {/* 3D Asset Placeholder */}
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-orange-300/30 rounded-full blur-xl" />
            <Users className="absolute bottom-2 right-2 w-24 h-24 text-white/20 -rotate-12" />
          </div>
        </Link>

        {/* Right Column */}
        <div className="flex flex-col gap-3">
          {/* Top: Custom (Small) */}
          <Link href="/custom">
            <div className="flex-1 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-2xl p-3 relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow flex flex-col justify-center">
              <div className="relative z-10">
                <h3 className="text-slate-900 text-lg font-black italic tracking-wide mb-1">高端定制</h3>
                <div className="inline-block bg-yellow-500/10 px-2 py-0.5 rounded-full">
                  <span className="text-yellow-700 text-[10px] font-bold">多重好礼</span>
                </div>
              </div>
              <Crown className="absolute bottom-1 right-1 w-12 h-12 text-yellow-500/20 -rotate-12" />
            </div>
          </Link>

          {/* Bottom: Game (Small) */}
          <div 
            onClick={() => toast.info("敬请期待", { description: "游戏陪玩功能即将上线" })}
            className="flex-1 bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl p-3 relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow flex flex-col justify-center"
          >
            <div className="relative z-10">
              <h3 className="text-slate-900 text-lg font-black italic tracking-wide mb-1">游戏陪玩</h3>
              <div className="inline-block bg-pink-500/10 px-2 py-0.5 rounded-full">
                <span className="text-pink-600 text-[10px] font-bold">敬请期待</span>
              </div>
            </div>
            <Gamepad2 className="absolute bottom-1 right-1 w-12 h-12 text-pink-500/20 -rotate-12" />
          </div>
        </div>
      </div>
    </div>
  );
}
