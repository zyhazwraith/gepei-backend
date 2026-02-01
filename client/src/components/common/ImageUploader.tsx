import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[], ids?: number[]) => void; // Support returning IDs if needed, but for now URLs are displayed
  // Ideally we should track IDs too for backend V2. 
  // Let's assume the parent manages URLs and IDs mapping, OR this component returns simple URLs 
  // and we handle ID resolution separately? 
  // Wait, backend V2 expects `photoIds` (array of numbers). 
  // The current `GuideEdit` uses `photos` (string[]).
  // The backend `updateMyProfile` expects `photoIds`.
  // So this component SHOULD return IDs (or objects with id+url).
  // But to be compatible with legacy frontend code style, let's see.
  // The backend `getMyProfile` returns `photos` as `{id, url}[]`.
  // So we should work with `{id, url}` objects.
  
  // Revised Props
  initialPhotos?: { id: number; url: string }[]; 
  maxCount?: number;
  usage?: string; // 'avatar' | 'guide_photo'
}

// Simple version handling {id, url} objects
export function ImageUploader({ 
  value = [], // Array of {id, url} or just strings? Let's make it flexible or strict.
  // Let's use strict internal state but accept props.
  // For V2 transition, let's use a controlled component approach.
  photos, 
  onPhotosChange,
  maxCount = 9,
  usage = 'guide_photo'
}: {
  photos: { id: number; url: string }[];
  onPhotosChange: (newPhotos: { id: number; url: string }[]) => void;
  maxCount?: number;
  usage?: string;
}) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (photos.length + files.length > maxCount) {
      toast.error(`最多上传${maxCount}张照片`);
      return;
    }

    setIsUploading(true);
    try {
      const newPhotos: { id: number; url: string }[] = [];

      for (const file of files) {
        // Validate
        if (!file.type.startsWith('image/')) {
          toast.error('请上传图片文件');
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error('图片大小不能超过5MB');
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        // V2 API: POST /api/v1/attachments/:usage
        // We need to pass usage in URL
        // And optional contextId if needed (backend handles auto-fill for self)
        
        const res = await apiClient.post(`/attachments/${usage}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.code === 0 && res.data) {
           newPhotos.push({
             id: res.data.id,
             url: res.data.url
           });
        }
      }

      if (newPhotos.length > 0) {
        onPhotosChange([...photos, ...newPhotos]);
        toast.success('上传成功');
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error('上传失败: ' + (error.message || '未知错误'));
    } finally {
      setIsUploading(false);
      // Clear input
      e.target.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    onPhotosChange(newPhotos);
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {photos.map((photo, index) => (
        <div key={photo.id || index} className="relative aspect-square group">
          <img
            src={photo.url}
            alt={`Photo ${index + 1}`}
            className="w-full h-full object-cover rounded-lg border border-gray-200"
          />
          <button
            onClick={() => handleRemove(index)}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      
      {photos.length < maxCount && (
        <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={isUploading}
            className="hidden"
          />
          {isUploading ? (
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          ) : (
            <>
              <Plus className="w-8 h-8 text-gray-400" />
              <span className="text-xs text-gray-400 mt-1">上传照片</span>
            </>
          )}
        </label>
      )}
    </div>
  );
}
