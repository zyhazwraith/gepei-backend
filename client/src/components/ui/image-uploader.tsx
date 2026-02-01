import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api";

export interface ImageValue {
  id?: number;
  url: string;
}

interface ImageUploaderProps {
  value?: ImageValue[];
  onChange: (values: ImageValue[]) => void;
  usage: "system" | "avatar" | "chat" | "guide_photo";
  slot?: string;
  className?: string;
  maxCount?: number;
}

export function ImageUploader({
  value = [],
  onChange,
  usage,
  slot,
  className,
  maxCount = 1,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      toast.error("请上传图片文件");
      return;
    }

    // Validate size (e.g. 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("图片大小不能超过 5MB");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    // Backend expects 'usage' param to route to correct bucket/folder
    // We map 'guide_photo' to 'guide' or similar if needed, or backend handles it.
    // Assuming backend handles 'guide_photo' or we use 'guide'
    // Let's use the usage passed in.
    formData.append("usage", usage);
    if (slot) formData.append("slot", slot);

    try {
      // Use axios directly or via apiClient wrapper if it supports FormData
      // Assuming apiClient handles headers automatically
      const res = await apiClient.post("/attachments/" + usage, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if ((res as any).code === 0 && (res as any).data?.url) {
        const newItem = {
            id: (res as any).data.id, // Now backend returns ID
            url: (res as any).data.url
        };
        onChange([...value, newItem]);
        toast.success("上传成功");
      } else {
        // Fallback for different API structure if needed
        // Some endpoints might return { url: ... } directly
        const url = (res as any).data?.url || (res as any).url;
        const id = (res as any).data?.id;
        
        if (url) {
            onChange([...value, { id, url }]);
            toast.success("上传成功");
        } else {
            toast.error((res as any).message || "上传失败");
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("上传出错");
    } finally {
      setUploading(false);
      // Reset input so same file can be selected again if needed
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = (index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap gap-4">
        {/* Preview Area */}
        {value.map((item, index) => (
            <div key={index} className="relative w-24 h-24 border rounded-lg overflow-hidden group">
            <img
                src={item.url}
                alt={`Preview ${index}`}
                className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleRemove(index)}
                type="button"
                >
                <X className="w-4 h-4" />
                </Button>
            </div>
            </div>
        ))}

        {/* Upload Button */}
        {value.length < maxCount && (
            <div
            className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => inputRef.current?.click()}
            >
            {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
                <>
                <Upload className="w-6 h-6 mb-1" />
                <span className="text-xs">上传</span>
                </>
            )}
            </div>
        )}
      </div>

      {/* Hidden Input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
    </div>
  );
}
