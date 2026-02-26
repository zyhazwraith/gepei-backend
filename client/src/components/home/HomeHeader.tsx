import { Settings, MessageCircle } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function HomeHeader() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-rose-50 via-orange-50/20 to-white/0 pb-6">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-black tracking-tighter text-slate-900 drop-shadow-sm">牵寻伴</span>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setLocation("/profile")}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <Settings className="w-6 h-6 text-slate-700" strokeWidth={1.5} />
        </button>
        <button 
          onClick={() => setLocation("/orders")} // Temporary link to orders as messages
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <MessageCircle className="w-6 h-6 text-slate-700" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
