import { useState, useEffect, useRef } from 'react';
import { loadTencentMap } from '@/lib/tencent-map';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationPickerProps {
  value?: string;
  lat?: number;
  lng?: number;
  onChange: (data: { address: string; lat: number; lng: number }) => void;
  className?: string;
}

const TENCENT_KEY = import.meta.env.VITE_TENCENT_MAP_KEY || '';

export function LocationPicker({ value, lat, lng, onChange, className }: LocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat, lng } : null
  );
  const [tempAddress, setTempAddress] = useState(value || '');
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen && !map) {
      setLoading(true);
      loadTencentMap(TENCENT_KEY).then(() => {
        setLoading(false);
        if (!mapRef.current) return;
        
        const center = new window.qq.maps.LatLng(lat || 39.9042, lng || 116.4074);
        const initialMap = new window.qq.maps.Map(mapRef.current, {
          center,
          zoom: 13,
        });

        setMap(initialMap);

        // Initial marker
        if (lat && lng) {
             updateMarker(initialMap, center, false);
        }

        // Click listener
        window.qq.maps.event.addListener(initialMap, 'click', (event: any) => {
          updateMarker(initialMap, event.latLng, true);
        });
      }).catch(err => {
        console.error("Failed to load map", err);
        setLoading(false);
      });
    }
  }, [isOpen]);

  const updateMarker = (mapInstance: any, latLng: any, fetchAddress: boolean) => {
      if (!markerRef.current) {
          markerRef.current = new window.qq.maps.Marker({
              position: latLng,
              map: mapInstance
          });
      } else {
          markerRef.current.setPosition(latLng);
      }
      
      const newLat = latLng.getLat();
      const newLng = latLng.getLng();
      setCurrentPos({ lat: newLat, lng: newLng });

      if (fetchAddress) {
        const geocoder = new window.qq.maps.Geocoder({
            complete: (result: any) => {
                setTempAddress(result.detail.address);
            }
        });
        geocoder.getAddress(latLng);
      }
  };

  const handleConfirm = () => {
    if (currentPos) {
      onChange({
        address: tempAddress,
        lat: currentPos.lat,
        lng: currentPos.lng
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
          </DialogHeader>
          
          <div className="relative h-[400px] w-full bg-gray-100 rounded-md overflow-hidden">
             <div ref={mapRef} className="w-full h-full" />
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
