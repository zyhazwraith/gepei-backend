import { useState } from "react";
import { Search } from "lucide-react";
import { useLocation } from "wouter";
import CitySelector from "@/components/common/CitySelector";

export default function HomeSearchBar() {
  const [, setLocation] = useLocation();
  const [selectedCity, setSelectedCity] = useState("北京市");

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    // Navigate to guides with params
    setLocation(`/guides?city=${encodeURIComponent(selectedCity)}`);
  };

  return (
    <div className="px-4 mb-6">
      <div className="flex items-center h-12 bg-white rounded-full shadow-[0_2px_15px_-5px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden pl-1">
        {/* City Selector */}
        <div className="shrink-0 relative flex items-center">
          <CitySelector 
            value={selectedCity} 
            onChange={setSelectedCity}
            className="border-none shadow-none bg-transparent hover:bg-transparent px-3 text-base font-bold text-slate-900 w-auto min-w-[80px]"
          />
          <div className="w-[1px] h-5 bg-slate-200 absolute right-0 top-1/2 -translate-y-1/2" />
        </div>

        {/* Search Input Trigger */}
        <div 
          className="flex-1 flex items-center h-full px-3 cursor-pointer group"
          onClick={() => handleSearch()}
        >
          <Search className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors mr-2" />
          <span className="text-slate-400 text-sm group-hover:text-slate-600 transition-colors">搜索服务</span>
        </div>
      </div>
    </div>
  );
}
