import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import CitySelector from '@/components/common/CitySelector';
import { LocationPicker } from '@/components/common/LocationPicker';
import { ImageUploader, ImageValue } from '@/components/ui/image-uploader';

// 预定义的服务技能标签
const SKILL_TAGS = [
  '景点导览',
  '拍照服务',
  '行程规划',
  '美食推荐',
  '商务陪同',
  '翻译服务',
];

export default function GuideEdit() {
  const [, setLocation] = useLocation();
  const { user, refetchUser } = useAuth();
  
  const [initialLoading, setInitialLoading] = useState(false);
  
  // 表单状态
  const [stageName, setStageName] = useState(''); // V2: Renamed from name
  const [city, setCity] = useState('');
  
  // V2: Use ImageValue objects to track ID and URL
  const [photos, setPhotos] = useState<ImageValue[]>([]);
  const [avatar, setAvatar] = useState<ImageValue[]>([]);
  
  const [hourlyPrice, setHourlyPrice] = useState('');
  const [realPrice, setRealPrice] = useState<number | undefined>(); // For display
  const [intro, setIntro] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [address, setAddress] = useState(''); // New: Residence Address
  const [ageConfirmed, setAgeConfirmed] = useState(false); // New: Age Check

  const [isSaving, setIsSaving] = useState(false);

  // 加载现有地陪信息
  useEffect(() => {
    // 1. 如果用户未认证为地陪，直接跳过请求，避免 404
    if (!user?.isGuide) {
        // 预填充部分默认值
        setStageName(user?.nickName || '');
        return;
    }
    // 强制每次进入时重新获取
    loadGuideProfile();
  }, [user?.isGuide]); // 依赖 user 状态

  const loadGuideProfile = async () => {
    setInitialLoading(true);
    try {
      const response = await apiClient.get('/guides/profile');
      if ((response as any).code === 0) {
        const data = (response as any).data;
        
        if (data.stageName) setStageName(data.stageName);
        if (data.city) setCity(data.city);
        
        // Handle Photos
        if (data.photoObjects && Array.isArray(data.photoObjects)) {
            setPhotos(data.photoObjects);
        } else if (data.photos && Array.isArray(data.photos)) {
            // Fallback for legacy or if photoObjects missing
            setPhotos(data.photos.map((url: string, index: number) => ({
                url,
                id: data.photoIds?.[index] // Try to map if order preserved
            })));
        }

        // Handle Avatar
        // Note: Backend might return avatarId and avatarUrl separately
        // We construct ImageValue[]
        if (data.avatarUrl) {
            setAvatar([{ url: data.avatarUrl, id: data.avatarId }]); // avatarId might be undefined in old response
        }

        // Map expectedPrice to input
        if (data.expectedPrice) setHourlyPrice(String(data.expectedPrice));
        // Map realPrice for display
        if (data.realPrice) setRealPrice(data.realPrice);
        
        if (data.intro) setIntro(data.intro);
        if (data.tags && Array.isArray(data.tags)) setSelectedTags(data.tags);
        if (data.latitude) setLatitude(data.latitude);
        if (data.longitude) setLongitude(data.longitude);
        if (data.address) setAddress(data.address);
      }
    } catch (error: any) {
      // 如果是 1003 (USER_NOT_FOUND) 错误，说明还没有地陪信息，这在"新增"场景下是正常的
      if (error.response?.data?.code !== 1003) {
        console.error('加载地陪信息失败:', error);
        toast.error('加载信息失败，请重试');
      }
    } finally {
      setInitialLoading(false);
    }
  };

  // 选择城市
  const handleCitySelect = (selectedCity: string) => {
    setCity(selectedCity);
  };

  // 处理常住地更新 (From LocationPicker)
  const handleAddressUpdate = (data: { address: string; lat: number; lng: number; city?: string }) => {
    setAddress(data.address);
    setLatitude(data.lat);
    setLongitude(data.lng);
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // 保存修改
  const handleSave = async () => {
    // 验证必填字段
    if (!ageConfirmed) {
      toast.error('请确认您已年满18周岁');
      return;
    }

    if (!stageName.trim()) {
      toast.error('请输入地陪展示名称');
      return;
    }

    if (!city) {
      toast.error('请选择所在城市');
      return;
    }

    // 验证价格
    const price = Number(hourlyPrice);
    if (hourlyPrice && (isNaN(price) || price < 0)) {
      toast.error('请输入有效的服务价格');
      return;
    }

    // Extract IDs
    const photoIds = photos
        .map(p => p.id)
        .filter((id): id is number => id !== undefined);
    
    const avatarId = avatar.length > 0 ? avatar[0].id : undefined;

    setIsSaving(true);
    try {
      const response = await apiClient.put('/guides/me', {
        stageName, // V2: Use stageName
        city,
        address,
        photoIds: photoIds.length > 0 ? photoIds : undefined,
        avatarId, 
        expectedPrice: hourlyPrice ? Number(hourlyPrice) : undefined,
        intro: intro.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        latitude,
        longitude,
      });

      if ((response as any).code === 0) {
        toast.success('地陪资料提交成功，等待审核');
        await refetchUser();
        setLocation('/profile');
      }
    } catch (error: any) {
      console.error('保存失败:', error);
      const message = error.response?.data?.message || '保存失败';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部导航栏 */}
      <div
        className="bg-gradient-to-r from-orange-400 to-orange-500 text-white px-4 flex items-center justify-between"
        style={{ height: '88px', paddingTop: '20px' }}
      >
        <button
          onClick={() => setLocation('/profile')}
          className="flex items-center gap-1 text-white"
        >
          <ChevronLeft className="w-6 h-6" />
          <span>返回</span>
        </button>
        <h1 className="text-xl font-semibold">地陪资料</h1>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="text-white font-medium"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>

      {/* 表单内容 */}
      <div className="p-4 space-y-4">
        
        {/* 头像上传 (使用 ImageUploader) */}
        <div className="flex flex-col items-center justify-center mb-6">
          <ImageUploader
             usage="avatar"
             value={avatar}
             onChange={setAvatar}
             maxCount={1}
          />
          <p className="text-xs text-gray-500 mt-2">点击上传个人头像</p>
        </div>

        {/* 地陪展示名称 (New in V2) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            地陪展示名称 <span className="text-red-500">*</span>
          </label>
          <Input
            value={stageName}
            onChange={(e) => setStageName(e.target.value)}
            placeholder="请输入您的地陪艺名/展示名称"
            maxLength={20}
          />
          <p className="text-xs text-gray-500 mt-1">此名称将向游客公开展示</p>
        </div>

        {/* 所在城市（搜索） */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            服务城市 <span className="text-red-500">*</span>
          </label>
          <CitySelector 
            value={city} 
            onChange={handleCitySelect} 
            data-testid="city-selector"
            placeholder="请选择您提供服务的城市"
          />
        </div>

        {/* 常住地 (LBS) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            常住地 (用于推荐)
          </label>
          <LocationPicker 
            value={address}
            lat={latitude}
            lng={longitude}
            onChange={handleAddressUpdate}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">请选择您的常住地点，便于系统为您推荐附近的订单</p>
        </div>

        {/* 我的照片 (使用 ImageUploader) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            我的照片（最多5张）
          </label>
          <ImageUploader
            usage="guide_photo"
            value={photos}
            onChange={setPhotos}
            maxCount={5}
          />
        </div>

        {/* 服务价格 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            期望时薪（¥/小时）
          </label>
          <Input
            type="number"
            value={hourlyPrice}
            data-testid="guide-price"
            onChange={(e) => setHourlyPrice(e.target.value)}
            placeholder="请输入期望价格"
            min="0"
          />
          <p className="text-xs text-gray-500 mt-1">最终展示价格由平台审核决定</p>
          {realPrice !== undefined && (
            <div className="mt-2 p-2 bg-orange-50 rounded text-sm text-orange-800 flex items-center gap-2">
              <span className="font-semibold">当前展示价格: ¥{realPrice}</span>
            </div>
          )}
        </div>

        {/* 个人简介 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            个人简介（最多200字）
          </label>
          <Textarea
            value={intro}
            data-testid="guide-intro"
            onChange={(e) => setIntro(e.target.value)}
            placeholder="介绍一下自己，让游客更了解你"
            maxLength={200}
            rows={4}
          />
          <p className="text-xs text-gray-500 mt-1 text-right">
            {intro.length}/200
          </p>
        </div>

        {/* 服务技能 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            服务技能
          </label>
          <div className="flex flex-wrap gap-2">
            {SKILL_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        
        {/* 年龄确认 */}
        <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
           <input 
             type="checkbox" 
             id="age-check"
             className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
             checked={ageConfirmed}
             onChange={(e) => setAgeConfirmed(e.target.checked)}
           />
           <label htmlFor="age-check" className="text-sm text-gray-700">
             我确认已年满 18 周岁，并对提交信息的真实性负责
           </label>
        </div>
      </div>

      {/* 底部保存按钮 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          data-testid="save-guide-profile-btn"
          className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-base"
        >
          {isSaving ? '保存中...' : '保存修改'}
        </Button>
      </div>
    </div>
  );
}
