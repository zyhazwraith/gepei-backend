import { useState, useMemo } from "react";
import { Search, MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// 热门城市
const HOT_CITIES = ["北京", "上海", "广州", "深圳", "杭州", "成都", "重庆", "西安", "南京", "武汉"];

// 省份数据 (简化版，实际项目可能需要完整数据)
const PROVINCES = [
  { name: "直辖市", cities: ["北京", "上海", "天津", "重庆"] },
  { name: "广东", cities: ["广州", "深圳", "东莞", "佛山", "珠海", "惠州", "中山"] },
  { name: "浙江", cities: ["杭州", "宁波", "温州", "嘉兴", "绍兴", "金华"] },
  { name: "江苏", cities: ["南京", "苏州", "无锡", "常州", "南通", "扬州", "徐州"] },
  { name: "四川", cities: ["成都", "绵阳", "德阳", "乐山", "宜宾"] },
  { name: "陕西", cities: ["西安", "咸阳", "宝鸡"] },
  { name: "湖北", cities: ["武汉", "宜昌", "襄阳"] },
  { name: "湖南", cities: ["长沙", "株洲", "湘潭", "张家界"] },
  { name: "福建", cities: ["福州", "厦门", "泉州"] },
  { name: "山东", cities: ["济南", "青岛", "烟台", "潍坊"] },
  { name: "云南", cities: ["昆明", "大理", "丽江"] },
  { name: "海南", cities: ["海口", "三亚"] },
  // ... 其他省份可按需补充
];

// 扁平化所有城市用于搜索
const ALL_CITIES_FLAT = Array.from(new Set([
  ...HOT_CITIES,
  ...PROVINCES.flatMap(p => p.cities)
]));

interface CitySelectorProps {
  value: string;
  onChange: (city: string) => void;
  className?: string;
  placeholder?: string;
}

export default function CitySelector({ 
  value, 
  onChange, 
  className,
  placeholder = "选择城市",
  ...props
}: CitySelectorProps & { 'data-testid'?: string }) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");

  const handleSelect = (city: string) => {
    onChange(city);
    setOpen(false);
    setKeyword("");
  };

  const filteredCities = useMemo(() => {
    if (!keyword) return [];
    return ALL_CITIES_FLAT.filter(c => c.includes(keyword));
  }, [keyword]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          type="button" // 防止表单提交
          data-testid={props['data-testid']}
          className={`w-full justify-start text-left font-normal ${!value && "text-muted-foreground"} ${className}`}
        >
          <MapPin className="w-4 h-4 mr-2" />
          {value || placeholder}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md h-[80vh] flex flex-col p-0 gap-0" data-testid="city-selector-dialog">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle>选择城市</DialogTitle>
        </DialogHeader>
        
        {/* 搜索栏 */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={keyword}
              data-testid="city-search-input"
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索城市名 (如: 北京)"
              className="pl-9 bg-gray-50"
            />
            {keyword && (
              <button 
                type="button"
                onClick={() => setKeyword("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* 替换 ScrollArea 为原生 div 滚动 */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* 搜索结果 */}
            {keyword ? (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">搜索结果</h3>
                {filteredCities.length > 0 ? (
                  <div className="grid grid-cols-4 gap-3">
                    {filteredCities.map(city => (
                      <Button
                        key={city}
                        variant="outline"
                        size="sm"
                        type="button"
                        data-testid={`city-option-${city}`}
                        onClick={() => handleSelect(city)}
                      >
                        {city}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">未找到相关城市</p>
                )}
              </div>
            ) : (
              <>
                {/* 热门城市 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">热门城市</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {HOT_CITIES.map(city => (
                      <Button
                        key={city}
                        variant={value === city ? "default" : "outline"}
                        size="sm"
                        type="button"
                        onClick={() => handleSelect(city)}
                        className={value === city ? "bg-orange-500 hover:bg-orange-600 border-orange-500" : ""}
                      >
                        {city}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 按省份展示 */}
                <div className="space-y-4">
                  {PROVINCES.map(province => (
                    <div key={province.name}>
                      <h3 className="text-sm font-medium text-gray-900 bg-gray-50 px-2 py-1 rounded mb-2">
                        {province.name}
                      </h3>
                      <div className="grid grid-cols-4 gap-3 px-2">
                        {province.cities.map(city => (
                          <div 
                            key={city}
                            onClick={() => handleSelect(city)}
                            className={`text-sm py-1 cursor-pointer hover:text-orange-500 ${value === city ? "text-orange-500 font-medium" : "text-gray-600"}`}
                          >
                            {city}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
