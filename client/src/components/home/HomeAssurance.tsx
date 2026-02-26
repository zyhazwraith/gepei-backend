import { ShieldCheck, HeartHandshake, Headphones, BadgeCheck } from "lucide-react";

export default function HomeAssurance() {
  const items = [
    { icon: BadgeCheck, text: "实名认证", color: "text-orange-500" },
    { icon: ShieldCheck, text: "安全保障", color: "text-red-500" },
    { icon: HeartHandshake, text: "服务承诺", color: "text-pink-500" },
    { icon: Headphones, text: "专业售后", color: "text-orange-500" },
  ];

  return (
    <div className="px-4 mb-8">
      <div className="flex justify-between items-center">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="flex items-center gap-1">
              <Icon className={`w-4 h-4 ${item.color}`} />
              <span className="text-xs text-slate-500 font-medium">{item.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
