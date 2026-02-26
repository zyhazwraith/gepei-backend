import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

const MOCK_STRATEGIES = [
  {
    id: 1,
    title: "苏州经典1日游",
    subtitle: "经典线路 | 人文景观",
    image: "https://images.unsplash.com/photo-1599571234909-29ed5d1321d6?q=80&w=300&auto=format&fit=crop",
  },
  {
    id: 2,
    title: "北京胡同深度游",
    subtitle: "老北京 | 传统文化",
    image: "https://images.unsplash.com/photo-1599661046289-e31897846e41?q=80&w=300&auto=format&fit=crop",
  },
  {
    id: 3,
    title: "成都火锅体验",
    subtitle: "火锅 | 熊猫",
    image: "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?q=80&w=300&auto=format&fit=crop",
  },
];

export default function HomeStrategySection() {
  return (
    <div className="mb-8">
      {/* 1. Header (px-4 保证左边距16px) */}
      <div className="px-4 flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900">旅游攻略</h3>
        <button className="text-xs text-slate-400 flex items-center gap-1 hover:text-slate-600 transition-colors">
          查看更多
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* 2. Scroll Container (全屏宽，无padding，利用Spacer占位) */}
      <div className="overflow-x-auto pb-4 flex items-start gap-3 snap-x scrollbar-hide">
        
        {/* 左侧占位符 (16px = px-4) */}
        <div className="shrink-0 w-4" aria-hidden="true" />

        {MOCK_STRATEGIES.map((item) => (
          <div key={item.id} className="snap-start shrink-0 w-[140px] flex flex-col gap-2 group cursor-pointer">
            <Card className="overflow-hidden border-none shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] rounded-2xl h-[100px] relative transition-shadow hover:shadow-md">
              <img 
                src={item.image} 
                alt={item.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </Card>
            <div>
              <h4 className="text-sm font-bold text-slate-900 truncate">{item.title}</h4>
              <p className="text-[10px] text-orange-500">{item.subtitle}</p>
            </div>
          </div>
        ))}

        {/* 右侧占位符 (16px = px-4) */}
        <div className="shrink-0 w-4" aria-hidden="true" />
      </div>
    </div>
  );
}