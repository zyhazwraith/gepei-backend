import { useState, useEffect } from "react";
import { getGuides, Guide } from "@/lib/api";
import { Users, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import BottomNav from "@/components/BottomNav";
import HomeHeader from "@/components/home/HomeHeader";
import HomeSearchBar from "@/components/home/HomeSearchBar";
import HomeAssurance from "@/components/home/HomeAssurance";
import HomeFeatureGrid from "@/components/home/HomeFeatureGrid";
import HomeStrategySection from "@/components/home/HomeStrategySection";
import HomeGuideCard from "@/components/home/HomeGuideCard";

export default function Home() {
  const [, setLocation] = useLocation();
  const [recommendedGuides, setRecommendedGuides] = useState<Guide[]>([]);
  const [userLat, setUserLat] = useState<number>();
  const [userLng, setUserLng] = useState<number>();

  useEffect(() => {
    // 尝试获取位置以显示距离
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
        },
        (err) => console.log("Location access denied or error:", err),
        { timeout: 5000 }
      );
    }
  }, []);

  useEffect(() => {
    fetchRecommendedGuides();
  }, [userLat, userLng]);

  const fetchRecommendedGuides = async () => {
    try {
      // 获取第一页数据作为推荐，带上坐标
      const res = await getGuides(1, 4, undefined, undefined, userLat, userLng);
      if (res.code === 0 && res.data) {
        setRecommendedGuides(res.data.list);
      }
    } catch (error) {
      console.error("Failed to fetch guides:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* 1. Header & Search */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm">
        <HomeHeader />
        <div className="-mt-3">
          <HomeSearchBar />
        </div>
      </div>

      {/* 2. Assurance */}
      <HomeAssurance />

      {/* 3. Feature Grid (Bento) */}
      <HomeFeatureGrid />

      {/* 4. Strategy Section */}
      <HomeStrategySection />

      {/* 5. Recommended Guides */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">推荐地陪</h3>
          <button
            onClick={() => setLocation("/guides")}
            className="text-xs text-slate-400 flex items-center gap-1 hover:text-slate-600 transition-colors"
          >
            查看更多
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-3">
          {recommendedGuides.map((guide) => (
            <HomeGuideCard key={guide.userId} guide={guide} />
          ))}
          
          {recommendedGuides.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Users className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">暂无推荐地陪</p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
