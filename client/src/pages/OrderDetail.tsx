import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, MapPin, Calendar, CreditCard, Clock, CheckCircle2, AlertCircle, Users, Check, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getOrderById, getCandidates, selectGuide, checkInOrder, uploadAttachment, getCurrentUser, OrderDetailResponse, Candidate, User, payOvertime } from "@/lib/api";
import Price from "@/components/Price";
import BottomNav from "@/components/BottomNav";
import PaymentSheet from "@/components/PaymentSheet";
import OvertimeDialog from "@/components/OvertimeDialog";

export default function OrderDetail() {
  const [, params] = useRoute("/orders/:id");
  const [, setLocation] = useLocation();
  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  
  // Overtime States
  const [showOvertimeDialog, setShowOvertimeDialog] = useState(false);
  const [pendingOvertime, setPendingOvertime] = useState<{ id: number; amount: number } | null>(null);
  const [showOvertimePayment, setShowOvertimePayment] = useState(false);
  
  // User & Guide Status
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Check-in State
  const [checkingIn, setCheckingIn] = useState(false);
  const [uploadedAttachmentId, setUploadedAttachmentId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 候选地陪状态
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectingGuideId, setSelectingGuideId] = useState<number | null>(null);

  useEffect(() => {
    // Load current user
    getCurrentUser().then(res => {
      if(res.code === 0) setCurrentUser(res.data || null);
    });

    if (params?.id) {
      fetchOrder(parseInt(params.id));
    }
  }, [params?.id]);

  // Check-in Logic
  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !order) return;

    setIsUploading(true);
    const toastId = toast.loading("正在上传图片...");

    try {
      // 1. Upload Photo with contextId
      // Determine slot based on status
      const slot = order.status === 'waiting_service' ? 'start' : 'end';
      const uploadRes = await uploadAttachment(file, 'check_in', order.id.toString(), slot);
      if (uploadRes.code !== 0) throw new Error(uploadRes.message || '图片上传失败');
      
      setUploadedAttachmentId(uploadRes.data.id);
      setPreviewUrl(uploadRes.data.url);
      toast.success("图片上传成功", { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "上传失败", { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCheckInSubmit = async () => {
    if (!order || !uploadedAttachmentId) {
      toast.error("请先上传打卡照片");
      return;
    }

    setCheckingIn(true);
    const toastId = toast.loading("正在获取位置并提交打卡...");

    try {
      // 2. Get Location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) reject(new Error('浏览器不支持定位'));
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });

      // 3. Submit Check-in
      const type = order.status === 'waiting_service' ? 'start' : 'end';
      const checkInRes = await checkInOrder(order.id, {
        type,
        attachmentId: uploadedAttachmentId,
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });

      if (checkInRes.code === 0) {
        toast.success(type === 'start' ? '开始服务打卡成功' : '结束服务打卡成功', { id: toastId });
        // Reset state
        setUploadedAttachmentId(null);
        setPreviewUrl(null);
        fetchOrder(order.id);
      } else {
        throw new Error(checkInRes.message || '打卡提交失败');
      }

    } catch (error: any) {
      console.error(error);
      let msg = error.message;
      if (error instanceof GeolocationPositionError) {
        msg = "无法获取位置信息，请确保已授权定位权限";
      }
      toast.error(msg, { id: toastId });
    } finally {
      setCheckingIn(false);
    }
  };

  const isGuideView = currentUser && order && currentUser.userId === order.guideId;
  const canStartService = isGuideView && order?.status === 'waiting_service';
  const canEndService = isGuideView && order?.status === 'in_service';
  const isServiceEnded = isGuideView && order?.status === 'service_ended'; // Or completed
  const canRequestOvertime = order?.status === 'in_service' && currentUser?.userId === order.userId;

  const fetchOrder = async (id: number) => {
    try {
      const res = await getOrderById(id);
      if (res.code === 0 && res.data) {
        setOrder(res.data);
        // 如果状态是 waiting_for_user，则获取候选地陪
        if (res.data.status === 'waiting_for_user') {
            fetchCandidates(id);
        }
      } else {
        toast.error(res.message || "获取订单失败");
      }
    } catch (error) {
      console.error("Fetch order error:", error);
      toast.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async (orderId: number) => {
    setLoadingCandidates(true);
    try {
        const res = await getCandidates(orderId);
        if (res.code === 0 && res.data) {
            setCandidates(res.data.list);
        }
    } catch (error) {
        console.error("Fetch candidates error:", error);
    } finally {
        setLoadingCandidates(false);
    }
  };

  const handleSelectGuide = async (guideId: number) => {
    if (!order) return;
    setSelectingGuideId(guideId);
    try {
        const res = await selectGuide(order.id, guideId);
        if (res.code === 0) {
            toast.success("选择成功！");
            // 刷新订单状态
            fetchOrder(order.id);
        } else {
            toast.error(res.message || "选择失败");
        }
    } catch (error) {
        toast.error("操作失败，请重试");
    } finally {
        setSelectingGuideId(null);
    }
  };

  const handlePaymentSuccess = () => {
    if (order) {
      fetchOrder(order.id); // 刷新状态
    }
  };

  const handleOvertimeCreated = (overtimeId: number, amount: number) => {
    setPendingOvertime({ id: overtimeId, amount });
    setShowOvertimePayment(true);
  };

  const handleOvertimePaymentSuccess = () => {
      // Mock payment success for overtime (reuse logic or specialized call)
      // Since PaymentSheet is generic, we might need a specific handler if using separate logic
      // But here we use a separate state/component flow
      if (order) fetchOrder(order.id);
      setShowOvertimePayment(false);
      setPendingOvertime(null);
  };

  // Custom Payment Logic for Overtime (using the same Sheet but different callback)
  // Actually, let's reuse PaymentSheet by passing different props?
  // PaymentSheet takes `onSuccess`. 
  // However, PaymentSheet calls `payOrder` internally. 
  // We need it to call `payOvertime`.
  // Solution: We will use a modified PaymentSheet or a wrapper.
  // Or better: Let PaymentSheet accept an optional `paymentAction` prop.
  // But PaymentSheet is likely simple. Let's check if we can just make a small wrapper or duplicate.
  // Actually, looking at PaymentSheet import, I don't see the code but I can infer.
  // For simplicity, let's handle overtime payment directly here or update PaymentSheet later.
  // Wait, I can't easily see PaymentSheet code without reading it.
  // Assuming PaymentSheet is tightly coupled with `payOrder`.
  // I will use a simple confirm dialog for now for overtime payment since it's "Mock".
  // OR: I will just use `payOvertime` directly in a new simple UI.
  
  const handleOvertimePayConfirm = async () => {
      if (!pendingOvertime) return;
      const toastId = toast.loading("正在支付加时费...");
      try {
          await payOvertime(pendingOvertime.id, 'wechat');
          toast.success("支付成功", { id: toastId });
          handleOvertimePaymentSuccess();
      } catch (error: any) {
          toast.error(error.message || "支付失败", { id: toastId });
      }
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">待支付</Badge>;
      case 'paid':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">待接单</Badge>;
      case 'waiting_for_user':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">待确认地陪</Badge>;
      case 'waiting_service':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">待服务</Badge>;
      case 'in_service':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">服务中</Badge>;
      case 'service_ended':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">服务结束</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">进行中</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">已完成</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">已取消</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">加载中...</div>;
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500">订单不存在</p>
        <Button onClick={() => setLocation("/")}>返回首页</Button>
      </div>
    );
  }

  const isCustom = order.orderType === 'custom';
  const customReq = order.customRequirements;

  return (
    <div className="min-h-screen bg-gray-50 pb-64">
      {/* 顶部导航 */}
      <div className="bg-white sticky top-0 z-10 px-4 py-3 border-b flex items-center">
        <Button variant="ghost" size="icon" className="-ml-2 mr-2" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">订单详情</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* 状态卡片 */}
        <Card className="border-none shadow-sm bg-gradient-to-r from-orange-50 to-orange-100">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
            <div className="p-3 bg-white/50 rounded-full">
               {order.status === 'paid' ? <Clock className="w-8 h-8 text-orange-600" /> : 
                order.status === 'pending' ? <CreditCard className="w-8 h-8 text-orange-600" /> :
                order.status === 'waiting_for_user' ? <Users className="w-8 h-8 text-purple-600" /> :
                order.status === 'waiting_service' ? <Calendar className="w-8 h-8 text-blue-600" /> :
                order.status === 'in_service' ? <Clock className="w-8 h-8 text-green-600 animate-pulse" /> :
                order.status === 'service_ended' ? <CheckCircle2 className="w-8 h-8 text-gray-600" /> :
                <CheckCircle2 className="w-8 h-8 text-orange-600" />}
            </div>
            <h2 className="text-xl font-bold text-orange-900">
              {order.status === 'pending' ? '等待支付' : 
               order.status === 'paid' ? '等待地陪接单' : 
               order.status === 'waiting_for_user' ? '请选择地陪' :
               order.status === 'waiting_service' ? '等待服务开始' :
               order.status === 'in_service' ? '服务进行中' :
               order.status === 'service_ended' ? '服务结束，待结算' :
               '订单进行中'}
            </h2>
            <p className="text-sm text-orange-800/80">
              {order.status === 'pending' ? '请在 30 分钟内完成支付' : 
               order.status === 'paid' ? '系统正在为您匹配合适的地陪' : 
               order.status === 'waiting_for_user' ? '已有地陪报名，请选择一位为您服务' :
               order.status === 'waiting_service' ? (isGuideView ? '请在到达约定地点后开始服务' : '地陪将按时为您服务') :
               order.status === 'in_service' ? '请享受您的旅程' :
               order.status === 'service_ended' ? '服务已完成，系统正在进行资金结算（预计24小时内到账）' :
               '祝您旅途愉快'}
            </p>
          </CardContent>
        </Card>

        {/* 候选地陪列表 (仅在 waiting_for_user 状态显示) */}
        {order.status === 'waiting_for_user' && (
            <Card className="border-purple-200 bg-purple-50/30">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center text-purple-900">
                        <Users className="w-4 h-4 mr-2" />
                        候选地陪
                        <Badge className="ml-2 bg-purple-100 text-purple-800 hover:bg-purple-100">请选择一位</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {loadingCandidates ? (
                        <div className="text-center py-4 text-gray-500">加载中...</div>
                    ) : candidates.length > 0 ? (
                        candidates.map(candidate => (
                            <div key={candidate.guideId} className="bg-white p-3 rounded-lg border shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10">
                                        <AvatarImage src={candidate.avatarUrl} />
                                        <AvatarFallback>{candidate.nickName?.slice(0, 1) || 'G'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-medium text-gray-900">{candidate.nickName}</div>
                                        <div className="text-xs text-gray-500">{candidate.city} · ¥{candidate.hourlyPrice}/小时</div>
                                    </div>
                                </div>
                                <Button 
                                    size="sm" 
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                    onClick={() => handleSelectGuide(candidate.guideId)}
                                    disabled={selectingGuideId !== null}
                                >
                                    {selectingGuideId === candidate.guideId ? "提交中..." : "选择TA"}
                                </Button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4 text-gray-500">暂无候选人</div>
                    )}
                </CardContent>
            </Card>
        )}

        {/* 基本信息 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex justify-between items-center">
              基本信息
              {getStatusBadge(order.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">订单编号</span>
              <span className="font-mono">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">下单时间</span>
              <span>{new Date(order.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">订单类型</span>
              <Badge variant="outline" className={isCustom ? "text-orange-600 border-orange-200 bg-orange-50" : "text-blue-600 border-blue-200 bg-blue-50"}>
                {isCustom ? "私人定制" : "普通预约"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 需求详情 */}
        {isCustom && customReq && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">定制需求</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <span className="text-gray-500 block text-xs">目的地</span>
                  <span>{customReq.destination}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <span className="text-gray-500 block text-xs">日期</span>
                  <span>{customReq.startDate}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <span className="text-gray-500 block text-xs">需求描述</span>
                  <p className="mt-1 text-gray-700 leading-relaxed bg-gray-50 p-2 rounded">
                    {customReq.specialRequirements}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 费用明细 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">费用明细</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">订金</span>
              <Price amount={order.amount} />
            </div>
            {/* Overtime Records List */}
            {order.overtimeRecords && order.overtimeRecords.length > 0 && (
                <div className="pt-2 border-t space-y-2">
                    {order.overtimeRecords.map(record => (
                        <div key={record.id} className="flex justify-between items-center text-xs">
                            <div className="flex flex-col">
                                <span className="font-medium text-gray-700">加时 {record.duration}小时</span>
                                <span className="text-gray-400 scale-90 origin-left">
                                    {new Date(record.createdAt).toLocaleString([], {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                                </span>
                            </div>
                            <Price amount={record.fee} />
                        </div>
                    ))}
                </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-medium">实付金额</span>
              <Price amount={order.amount} className="text-lg font-bold text-orange-600" />
            </div>
          </CardContent>
        </Card>

      {/* 底部操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t safe-area-bottom z-50">
        
        {order.status === 'pending' && (
          <Button 
            className="w-full bg-[#07C160] hover:bg-[#06AD56]" 
            size="lg"
            onClick={() => setShowPayment(true)}
          >
            微信支付 <Price amount={order.amount} className="ml-1" />
          </Button>
        )}
        
        {/* User Overtime Request Button */}
        {canRequestOvertime && (
            <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white mb-3"
                onClick={() => setShowOvertimeDialog(true)}
            >
                <Clock className="w-4 h-4 mr-2" />
                申请加时服务
            </Button>
        )}

        {/* 地陪打卡操作栏 */}
        {(canStartService || canEndService) && (
          <div className="space-y-4">
            {/* 1. 照片上传区域 */}
            <div className="flex justify-center">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
                capture="environment" 
              />
              
              <div 
                className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors relative overflow-hidden"
                onClick={handlePhotoClick}
              >
                {isUploading ? (
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                ) : previewUrl ? (
                   <>
                     <img src={previewUrl} alt="Check-in" className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                       <Camera className="w-8 h-8 text-white" />
                     </div>
                   </>
                ) : (
                   <div className="flex flex-col items-center text-gray-400">
                     <Camera className="w-8 h-8 mb-2" />
                     <span className="text-xs">点击拍摄/上传</span>
                   </div>
                )}
              </div>
            </div>

            {/* 2. 确认按钮 */}
            <Button 
              className={`w-full ${canStartService ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
              size="lg"
              onClick={handleCheckInSubmit}
              disabled={checkingIn || !uploadedAttachmentId}
            >
              {checkingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  正在提交...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  {canStartService ? '确认开始服务' : '确认结束服务'}
                </>
              )}
            </Button>
          </div>
        )}

        {/* 服务已结束 (地陪视角) */}
        {isServiceEnded && (
           <Button className="w-full" variant="secondary" disabled>
              等待系统结算中...
           </Button>
        )}
      </div>
      
      </div>

      <PaymentSheet 
        orderId={order.id}
        amount={order.amount}
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePaymentSuccess}
      />

      {order.pricePerHour && (
          <OvertimeDialog 
            isOpen={showOvertimeDialog}
            onClose={() => setShowOvertimeDialog(false)}
            orderId={order.id}
            pricePerHour={order.pricePerHour}
            onSuccess={handleOvertimeCreated}
          />
      )}
      
      {/* Overtime Payment Confirmation Dialog (Simple) */}
      {showOvertimePayment && pendingOvertime && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center bg-black/50 p-4">
              <div className="bg-white w-full max-w-md rounded-xl p-6 space-y-4 animate-in slide-in-from-bottom-10 fade-in">
                  <h3 className="text-lg font-bold text-center">支付加时费</h3>
                  <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600 mb-1">¥{(pendingOvertime.amount / 100).toFixed(2)}</div>
                      <p className="text-sm text-gray-500">微信支付</p>
                  </div>
                  <Button 
                    className="w-full bg-[#07C160] hover:bg-[#06AD56]" 
                    size="lg"
                    onClick={handleOvertimePayConfirm}
                  >
                    立即支付
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => setShowOvertimePayment(false)}>取消</Button>
              </div>
          </div>
      )}

      {order.status !== 'pending' && !canStartService && !canEndService && !canRequestOvertime && <BottomNav />}
    </div>
  );
}
