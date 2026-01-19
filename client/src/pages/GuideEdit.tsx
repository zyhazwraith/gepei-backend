import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ChevronLeft, Plus, X, Upload, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// 预定义的服务技能标签
const SKILL_TAGS = [
  '景点导览',
  '拍照服务',
  '行程规划',
  '美食推荐',
  '商务陪同',
  '翻译服务',
];

// 中国主要城市列表（支持搜索）
const ALL_CITIES = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '西安', '重庆', '南京', '武汉',
  '天津', '苏州', '郑州', '长沙', '东莞', '沈阳', '青岛', '合肥', '佛山', '济南',
  '哈尔滨', '福州', '长春', '石家庄', '常州', '泉州', '南宁', '贵阳', '南昌', '昆明',
  '温州', '无锡', '厦门', '大连', '宁波', '太原', '兰州', '海口', '银川', '西宁',
  '呼和浩特', '乌鲁木齐', '拉萨',
];

export default function GuideEdit() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // 表单状态
  const [idNumber, setIdNumber] = useState('');
  const [name, setName] = useState(''); // 真实姓名
  const [idError, setIdError] = useState('');
  const [city, setCity] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [hourlyPrice, setHourlyPrice] = useState('');
  const [intro, setIntro] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 上传状态
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 加载现有地陪信息
  useEffect(() => {
    loadGuideProfile();
  }, []);

  const loadGuideProfile = async () => {
    try {
      const response = await apiClient.get('/guides/profile');
      if (response.data.code === 0) {
        const data = response.data.data;
        setIdNumber(data.id_number || '');
        setName(data.name || '');
        setCity(data.city || '');
        setCitySearch(data.city || '');
        setPhotos(data.photos || []);
        setHourlyPrice(data.hourly_price ? String(data.hourly_price) : '');
        setIntro(data.intro || '');
        setSelectedTags(data.tags || []);
      }
    } catch (error: any) {
      // 如果是404错误，说明还没有地陪信息，使用默认值
      if (error.response?.data?.code !== 1003) {
        console.error('加载地陪信息失败:', error);
      }
    }
  };

  // 城市搜索过滤
  const filteredCities = ALL_CITIES.filter((c) =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  // 选择城市
  const handleCitySelect = (selectedCity: string) => {
    setCity(selectedCity);
    setCitySearch(selectedCity);
    setShowCityDropdown(false);
  };

  // 照片上传
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 检查照片数量
    if (photos.length + files.length > 5) {
      toast.error('最多上传5张照片');
      return;
    }

    setIsUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        // 验证文件类型
        if (!file.type.startsWith('image/')) {
          throw new Error('请上传图片文件');
        }

        // 验证文件大小（最大5MB）
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('图片大小不能超过5MB');
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await apiClient.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        return response.data.data.url;
      });

      const urls = await Promise.all(uploadPromises);
      setPhotos([...photos, ...urls]);
      toast.success('照片上传成功');
    } catch (error: any) {
      console.error('照片上传失败:', error);
      toast.error(error.message || '照片上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  // 删除照片
  const handlePhotoRemove = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // 切换技能标签
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // 身份证号校验
  const validateIdNumber = () => {
    if (!idNumber) {
      setIdError('');
      return;
    }
    if (!/^\d{17}[\dXx]$/.test(idNumber)) {
      setIdError('身份证号格式不正确（需18位）');
    } else {
      setIdError('');
    }
  };

  // 保存修改
  const handleSave = async () => {
    // 验证必填字段
    if (!idNumber.trim()) {
      toast.error('请输入身份证号');
      return;
    }

    if (idError) {
      toast.error(idError);
      return;
    }

    if (!name.trim()) {
      toast.error('请输入真实姓名');
      return;
    }

    if (!city) {
      toast.error('请选择所在城市');
      return;
    }

    // 验证身份证号格式（18位）
    if (!/^\d{17}[\dXx]$/.test(idNumber)) {
      toast.error('身份证号格式不正确');
      return;
    }

    // 验证价格
    const price = Number(hourlyPrice);
    if (hourlyPrice && (isNaN(price) || price < 0)) {
      toast.error('请输入有效的服务价格');
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiClient.post('/guides/profile', {
        id_number: idNumber,
        name: name.trim(),
        city,
        photos: photos.length > 0 ? photos : undefined,
        hourly_price: hourlyPrice ? Number(hourlyPrice) : undefined,
        intro: intro.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });

      if (response.data.code === 0) {
        toast.success('地陪资料保存成功');
        // 跳转到个人中心
        setTimeout(() => {
          setLocation('/profile');
        }, 1000);
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
        {/* 身份证号 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            身份证号 <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={idNumber}
            onChange={(e) => {
              setIdNumber(e.target.value);
              if (idError) setIdError(''); // 输入时清除错误
            }}
            onBlur={validateIdNumber}
            placeholder="请输入18位身份证号"
            maxLength={18}
            className={idError ? "border-red-500" : ""}
          />
          {idError && <p className="text-xs text-red-500 mt-1">{idError}</p>}
        </div>

        {/* 真实姓名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            真实姓名 <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入真实姓名"
            maxLength={20}
          />
          <p className="text-xs text-gray-500 mt-1">用于身份认证，不会公开显示</p>
        </div>

        {/* 所在城市（搜索） */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            所在城市 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Input
              type="text"
              value={citySearch}
              onChange={(e) => {
                setCitySearch(e.target.value);
                setShowCityDropdown(true);
              }}
              onFocus={() => setShowCityDropdown(true)}
              placeholder="搜索城市"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
          {showCityDropdown && filteredCities.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredCities.map((c) => (
                <button
                  key={c}
                  onClick={() => handleCitySelect(c)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 我的照片 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            我的照片（最多5张）
          </label>
          <div className="grid grid-cols-3 gap-3">
            {photos.map((photo, index) => (
              <div key={index} className="relative aspect-square">
                <img
                  src={photo}
                  alt={`照片${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  onClick={() => handlePhotoRemove(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  disabled={isUploading}
                  className="hidden"
                />
                {isUploading ? (
                  <span className="text-sm text-gray-400">上传中...</span>
                ) : (
                  <>
                    <Plus className="w-8 h-8 text-gray-400" />
                    <span className="text-xs text-gray-400 mt-1">添加照片</span>
                  </>
                )}
              </label>
            )}
          </div>
        </div>

        {/* 服务价格 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            服务价格（¥/小时）
          </label>
          <Input
            type="number"
            value={hourlyPrice}
            onChange={(e) => setHourlyPrice(e.target.value)}
            placeholder="请输入小时价格"
            min="0"
          />
        </div>

        {/* 个人简介 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            个人简介（最多200字）
          </label>
          <Textarea
            value={intro}
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
      </div>

      {/* 底部保存按钮 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-base"
        >
          {isSaving ? '保存中...' : '保存修改'}
        </Button>
      </div>
    </div>
  );
}
