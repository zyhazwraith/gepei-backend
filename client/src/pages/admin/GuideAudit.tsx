import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { ChevronLeft, Save, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import apiClient from '@/lib/api';
import { loadTencentMap } from '@/lib/tencent-map';

const TENCENT_KEY = (import.meta as any).env.VITE_TENCENT_MAP_KEY || '';

export default function GuideAudit() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/admin/guides/:id');
  const userId = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guide, setGuide] = useState<any>(null);

  // Form State
  const [isGuide, setIsGuide] = useState(false);
  const [realPrice, setRealPrice] = useState('');

  useEffect(() => {
    if (userId) {
      loadGuide(userId);
    }
  }, [userId]);

  // Load Map when guide is loaded with coords
  useEffect(() => {
    if (guide && guide.latitude && guide.longitude) {
      loadTencentMap(TENCENT_KEY).then(() => {
        const center = new window.TMap.LatLng(guide.latitude, guide.longitude);
        const container = document.getElementById('audit-map-container');
        if (container) {
          // Clear previous map if any? TMap doesn't have clear(), just overwrite container
          container.innerHTML = ''; 
          const map = new window.TMap.Map(container, {
            center,
            zoom: 14,
            pitch: 0,
            scrollable: false, // Static preview
            draggable: false
          });
          new window.TMap.MultiMarker({
            map,
            styles: {
                marker: new window.TMap.MarkerStyle({ 
                    width: 25, 
                    height: 35,
                    anchor: { x: 16, y: 32 }
                }) 
            },
            geometries: [{
                id: 'guide-loc',
                styleId: 'marker',
                position: center
            }]
          });
        }
      });
    }
  }, [guide]);

  const loadGuide = async (id: string) => {
    try {
      // Use Admin Detail API
      const res = await apiClient.get(`/admin/guides/${id}`);
      if ((res as any).code === 0) {
        const data = (res as any).data;
        setGuide(data);
        
        // Init form state
        setIsGuide(data.isGuide || false);
        setRealPrice(data.realPrice ? String(data.realPrice) : (data.expectedPrice ? String(data.expectedPrice) : ''));
      }
    } catch (error) {
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const res = await apiClient.put(`/admin/guides/${userId}`, {
        is_guide: isGuide,
        real_price: Number(realPrice)
      });
      if ((res as any).code === 0) {
        toast.success('审核保存成功');
        // Update local state
        setGuide({ ...guide, realPrice: Number(realPrice) });
      }
    } catch (error: any) {
      toast.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">加载中...</div>;
  if (!guide) return <div className="p-8">未找到地陪信息</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/guides')}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">审核地陪: {guide.stageName || guide.name || '未命名'}</h1>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
          <Save className="w-4 h-4 mr-2" />
          保存审核
        </Button>
      </div>

      <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Profile Preview */}
        <div className="md:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-md font-semibold mb-4 border-l-4 border-orange-500 pl-2">基本资料</h2>
            <div className="flex items-start gap-4">
               <div className="w-20 h-20 bg-gray-200 rounded-full overflow-hidden shrink-0">
                  {guide.avatarUrl ? (
                    <img src={guide.avatarUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">无头像</div>
                  )}
               </div>
               <div className="space-y-2 flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-500">昵称</label>
                        <p className="font-medium">{guide.nickname || '-'}</p>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">真实姓名</label>
                        <p className="font-medium">{guide.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">城市</label>
                        <p className="font-medium">{guide.city}</p>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">身份证号</label>
                        <p className="font-medium font-mono text-gray-600">{guide.idNumber || '-'}</p>
                    </div>
                  </div>
               </div>
            </div>
            
            <div className="mt-6">
                <label className="text-xs text-gray-500">个人简介</label>
                <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded">{guide.intro || '无简介'}</p>
            </div>

            <div className="mt-6">
                <label className="text-xs text-gray-500">照片墙</label>
                <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                    {guide.photos && guide.photos.map((url: string, idx: number) => (
                        <img key={idx} src={url} className="w-24 h-24 object-cover rounded" />
                    ))}
                    {(!guide.photos || guide.photos.length === 0) && <span className="text-sm text-gray-400">无照片</span>}
                </div>
            </div>
          </div>

          {/* LBS Info Card */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-md font-semibold mb-4 border-l-4 border-orange-500 pl-2">位置信息</h2>
            <div className="mb-4">
                <label className="text-xs text-gray-500">常住地址</label>
                <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <span className="font-medium">{guide.address || '未设置'}</span>
                </div>
            </div>
            {/* Map Container */}
            <div id="audit-map-container" className="w-full h-[300px] bg-gray-100 rounded border">
                {!guide.latitude && <div className="w-full h-full flex items-center justify-center text-gray-400">无坐标信息</div>}
            </div>
          </div>
        </div>

        {/* Right: Audit Action */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm sticky top-24">
                <h2 className="text-md font-semibold mb-4 border-l-4 border-blue-500 pl-2">审核操作</h2>
                
                <div className="space-y-6">
                    {/* Status Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <label className="text-sm font-medium">地陪状态</label>
                            <p className="text-xs text-gray-500">{isGuide ? '已激活 (可接单)' : '未激活 (不可见)'}</p>
                        </div>
                        <Switch checked={isGuide} onCheckedChange={setIsGuide} />
                    </div>

                    <hr />

                    {/* Price Setting */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">定价设置 (¥/小时)</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-2 rounded">
                                <span className="text-xs text-gray-500 block">用户期望</span>
                                <span className="font-mono font-bold text-gray-700">{guide.expectedPrice || '-'}</span>
                            </div>
                            <div>
                                <Input 
                                    type="number" 
                                    value={realPrice} 
                                    onChange={e => setRealPrice(e.target.value)}
                                    className="font-mono"
                                    placeholder="输入定价"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">请输入最终展示给用户的价格</p>
                    </div>

                    <Button onClick={handleSave} disabled={saving} className="w-full mt-4">
                        {saving ? '保存中...' : '确认并保存'}
                    </Button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
