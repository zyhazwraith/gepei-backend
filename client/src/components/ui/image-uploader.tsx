import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api";

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  usage: "system" | "avatar" | "chat";
  slot?: string;
  className?: string;
}

export function ImageUploader({
  value,
  onChange,
  usage,
  slot,
  className,
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
    formData.append("usage", usage);
    if (slot) formData.append("slot", slot);

    try {
      // Use axios directly or via apiClient wrapper if it supports FormData
      // Assuming apiClient handles headers automatically
      const res = await apiClient.post("/attachments/system", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.code === 0 && res.data?.url) {
        onChange(res.data.url);
        toast.success("上传成功");
      } else {
        toast.error(res.message || "上传失败");
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

  const handleRemove = () => {
    onChange("");
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Preview Area */}
      {value ? (
        <div className="relative w-40 h-40 border rounded-lg overflow-hidden group">
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              variant="destructive"
              size="icon"
              onClick={handleRemove}
              type="button"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="w-40 h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <>
              <Upload className="w-8 h-8 mb-2" />
              <span className="text-sm">点击上传</span>
            </>
          )}
        </div>
      )}

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
