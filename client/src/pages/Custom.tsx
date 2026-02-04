import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Headphones } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import ContactCSDialog from "@/components/ContactCSDialog";

export default function Custom() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [showCSDialog, setShowCSDialog] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部导航 */}
      <div className="bg-white sticky top-0 z-10 px-4 py-3 border-b flex items-center shadow-sm">
        <Button variant="ghost" size="icon" className="-ml-2 mr-2" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">高端定制</h1>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col items-center text-center space-y-6 min-h-[60vh] justify-center mt-4">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
            <Headphones className="w-10 h-10 text-orange-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900">私人定制服务</h2>
            <p className="text-gray-500 max-w-xs mx-auto text-sm">
              我们需要了解您的具体需求（如人数、天数、偏好等）为您量身定制行程。
            </p>
          </div>
          
          {!user ? (
              <Button className="w-full max-w-xs" onClick={() => setLocation("/login")}>
                登录后咨询
              </Button>
          ) : (
              <Button 
                size="lg" 
                className="w-full max-w-xs bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-200"
                onClick={() => setShowCSDialog(true)}
              >
                <Headphones className="w-5 h-5 mr-2" />
                联系客服沟通需求
              </Button>
          )}
          
          <p className="text-xs text-gray-400 mt-4">
            专业规划师 1对1 服务 · 免费定制方案
          </p>
        </div>
      </div>
      
      <ContactCSDialog isOpen={showCSDialog} onClose={() => setShowCSDialog(false)} />
      <BottomNav />
    </div>
  );
}
