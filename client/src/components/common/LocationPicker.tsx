import { useState, useEffect, useRef } from 'react';
import { loadTencentMap } from '@/lib/tencent-map';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import jsonp from 'jsonp';

interface LocationPickerProps {
  value?: string;
  lat?: number;
  lng?: number;
  onChange: (data: { address: string; lat: number; lng: number; city?: string }) => void;
  className?: string;
}

const TENCENT_KEY = import.meta.env.VITE_TENCENT_MAP_KEY || '';
const SEARCH_URL = 'https://apis.map.qq.com/ws/place/v1/search';
const GEOCODER_URL = 'https://apis.map.qq.com/ws/geocoder/v1/';
const IP_LOC_URL = 'https://apis.map.qq.com/ws/location/v1/ip';

export function LocationPicker({ value, lat, lng, onChange, className }: LocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tempAddress, setTempAddress] = useState(value || '');
  const [tempCity, setTempCity] = useState('');
  const [defaultCity, setDefaultCity] = useState('北京'); // Default city for search
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat, lng } : null
  );

  // Refs for TMap instances
  const mapInstanceRef = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (lat && lng) {
        setCurrentPos({ lat, lng });
        setTempAddress(value || '');
      }
      // If map exists, recenter
      if (mapInstanceRef.current && lat && lng) {
         const center = new window.TMap.LatLng(lat, lng);
         mapInstanceRef.current.setCenter(center);
         updateMarker(center);
      }
    } else {
        // Destroy map when dialog closes to prevent context issues on reopen
        if (mapInstanceRef.current) {
            mapInstanceRef.current.destroy();
            mapInstanceRef.current = null;
            markerLayerRef.current = null;
        }
    }
  }, [isOpen, lat, lng, value]);

  // Initialize Map
  useEffect(() => {
    if (isOpen && !mapInstanceRef.current) {
      setLoading(true);
      // Load GL version without 'service' library (not needed for WebService API)
      loadTencentMap(TENCENT_KEY).then(() => {
        setLoading(false);
        if (!mapContainerRef.current) return;
        
        // 1. Init Map
        const center = new window.TMap.LatLng(lat || 39.9042, lng || 116.4074);
        const map = new window.TMap.Map(mapContainerRef.current, {
          center,
          zoom: 13,
          pitch: 0, // 2D view by default
        });
        mapInstanceRef.current = map;

        // 2. Init Marker Layer
        const layer = new window.TMap.MultiMarker({
            map: map,
            geometries: [] // Start empty, use default style
        });
        markerLayerRef.current = layer;

        // 3. Initial Marker Position
        if (lat && lng) {
             updateMarker(center);
        } else {
            // IP Location if no coords provided
            jsonp(`${IP_LOC_URL}?key=${TENCENT_KEY}&output=jsonp`, { param: 'callback' }, (err, data) => {
                if (!err && data.status === 0 && data.result) {
                    const loc = data.result.location;
                    const city = data.result.ad_info.city;
                    if (city) setDefaultCity(city);
                    if (mapInstanceRef.current) {
                        const newCenter = new window.TMap.LatLng(loc.lat, loc.lng);
                        mapInstanceRef.current.setCenter(newCenter);
                        // Optional: don't set marker yet, let user click? 
                        // Or set marker to current loc? Let's just center map.
                    }
                }
            });
        }

        // 4. Click Listener
        map.on('click', (event: any) => {
          handleMapClick(event.latLng);
        });
        
        // Resize map after a short delay to ensure dialog animation is done
        setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.resize();
            }
        }, 200);

      }).catch(err => {
        console.error("Failed to load map", err);
        setLoading(false);
        toast.error("地图加载失败，请检查网络");
      });
    }
    
    // Cleanup on unmount
    return () => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.destroy();
            mapInstanceRef.current = null;
        }
    };
  }, [isOpen]);

  // Handle map click
  const handleMapClick = (latLng: any) => {
      updateMarker(latLng);
      // Reverse Geocoding via JSONP
      const url = `${GEOCODER_URL}?location=${latLng.lat},${latLng.lng}&key=${TENCENT_KEY}&output=jsonp`;
      jsonp(url, { param: 'callback' }, (err, data) => {
          if (err) {
              console.error("Geocoder JSONP error:", err);
              return;
          }
          if (data.status === 0 && data.result) {
              const addr = data.result.address;
              const comp = data.result.address_component;
              setTempAddress(addr);
              if (comp && comp.city) {
                  setTempCity(comp.city);
              }
          } else {
              console.error("Geocoder API error:", data);
              // Don't show toast for silent failures unless critical
          }
      });
  };

  // Update marker position (visual only)
  const updateMarker = (latLng: any) => {
      if (markerLayerRef.current) {
          markerLayerRef.current.setGeometries([
              {
                  id: 'main_marker',
                  position: latLng,
              }
          ]);
      }
      setCurrentPos({ lat: latLng.lat, lng: latLng.lng });
  };

  // Handle Search
  const handleSearch = () => {
      if (!searchKeyword) return;

      // Search via JSONP
      // Use boundary region(city, 1) based on defaultCity (from IP or default '北京')
      // Or if tempCity is set (user selected a point), use that.
      const searchCity = tempCity || defaultCity || '北京';
      const boundary = `region(${searchCity},1)`;
      
      const url = `${SEARCH_URL}?keyword=${encodeURIComponent(searchKeyword)}&boundary=${encodeURIComponent(boundary)}&key=${TENCENT_KEY}&output=jsonp`;
      
      jsonp(url, { param: 'callback' }, (err, data) => {
          if (err) {
              console.error("Search JSONP error:", err);
              setSearchResults([]);
              return;
          }
          if (data.status === 0 && data.data) {
              setSearchResults(data.data);
          } else {
              console.error("Search API error:", data);
              setSearchResults([]);
              toast.info(data.message || "未找到相关地点");
          }
      });
  };

  const handleSelectPoi = (poi: any) => {
      if (!mapInstanceRef.current) return;
      
      const center = new window.TMap.LatLng(poi.location.lat, poi.location.lng);
      mapInstanceRef.current.setCenter(center);
      
      if (poi.ad_info && poi.ad_info.city) {
        setTempCity(poi.ad_info.city);
      }
      
      updateMarker(center);
      setTempAddress(poi.address || poi.title);
      setSearchResults([]); 
  };

  const handleConfirm = () => {
    if (currentPos) {
      onChange({
        address: tempAddress,
        lat: currentPos.lat,
        lng: currentPos.lng,
        city: tempCity
      });
    }
    setIsOpen(false);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <div className="relative flex-1">
        <Input 
          value={value || ''} 
          readOnly 
          placeholder="请选择服务地点" 
          className="cursor-pointer pr-10"
          onClick={() => setIsOpen(true)}
        />
        <MapPin className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>选择服务地点</DialogTitle>
            <DialogDescription>
              支持搜索地点或直接在地图上点击选择。
            </DialogDescription>
          </DialogHeader>

          {/* Search Box */}
          <div className="flex gap-2 mb-2 relative">
              <Input 
                placeholder="搜索地点..." 
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} size="sm">搜索</Button>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                  <div className="absolute top-10 left-0 w-full bg-white border rounded shadow-lg z-20 max-h-[200px] overflow-y-auto">
                      {searchResults.map((poi, idx) => (
                          <div 
                            key={idx} 
                            className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onClick={() => handleSelectPoi(poi)}
                          >
                              <p className="font-medium">{poi.title}</p>
                              <p className="text-xs text-gray-500">{poi.address}</p>
                          </div>
                      ))}
                  </div>
              )}
          </div>
          
          <div className="relative h-[400px] w-full bg-gray-100 rounded-md overflow-hidden">
             <div ref={mapContainerRef} className="w-full h-full" />
             {loading && (
               <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                 <Loader2 className="h-8 w-8 animate-spin" />
               </div>
             )}
             <div className="absolute top-2 left-2 z-10 bg-white p-2 rounded shadow max-w-[80%]">
                <p className="text-sm font-medium">当前选中: {tempAddress || '点击地图选择'}</p>
             </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>取消</Button>
            <Button onClick={handleConfirm} disabled={!currentPos}>确认选择</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
