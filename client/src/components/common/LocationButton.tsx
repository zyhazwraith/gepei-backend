import { useState, useEffect } from "react";
import { toast } from "sonner";
import { MapPin, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationButtonProps {
  onLocationUpdate: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
  className?: string;
}

export default function LocationButton({ 
  onLocationUpdate, 
  initialLat, 
  initialLng,
  className 
}: LocationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [hasLocation, setHasLocation] = useState(!!(initialLat && initialLng));

  useEffect(() => {
    if (initialLat && initialLng) {
      setHasLocation(true);
    }
  }, [initialLat, initialLng]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("您的浏览器不支持定位功能");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onLocationUpdate(latitude, longitude);
        setHasLocation(true);
        setLoading(false);
        toast.success("定位成功");
      },
      (error) => {
        console.error("Geolocation error:", error);
        let msg = "获取位置失败";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "请允许定位权限以获取精准位置";
        } else if (error.code === error.TIMEOUT) {
          msg = "定位超时，请重试";
        }
        toast.error(msg);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <Button
      type="button"
      variant={hasLocation ? "outline" : "secondary"}
      onClick={handleGetLocation}
      disabled={loading}
      className={`w-full ${hasLocation ? "border-green-500 text-green-600 bg-green-50" : ""} ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          正在获取位置...
        </>
      ) : hasLocation ? (
        <>
          <Check className="w-4 h-4 mr-2" />
          已获取精准坐标 (点击更新)
        </>
      ) : (
        <>
          <MapPin className="w-4 h-4 mr-2" />
          获取当前位置 (推荐)
        </>
      )}
    </Button>
  );
}
