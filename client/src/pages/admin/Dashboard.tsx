import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingBag, CreditCard, Activity } from "lucide-react";

export default function Dashboard() {
  // 模拟数据
  const stats = [
    { label: "总用户数", value: "1,234", change: "+12%", icon: Users, color: "text-blue-500" },
    { label: "总订单数", value: "856", change: "+25%", icon: ShoppingBag, color: "text-green-500" },
    { label: "总交易额", value: "¥45,231", change: "+8%", icon: CreditCard, color: "text-yellow-500" },
    { label: "活跃地陪", value: "128", change: "+4%", icon: Activity, color: "text-purple-500" },
  ];

  return (
    <AdminLayout title="控制台">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="bg-slate-900 border-slate-800 text-slate-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  {stat.label}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-slate-500 mt-1">
                  较上月 <span className="text-green-500">{stat.change}</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-8">
        <Card className="col-span-4 bg-slate-900 border-slate-800 text-slate-100">
          <CardHeader>
            <CardTitle>最近订单</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-500 flex items-center justify-center h-48">
              暂无数据图表
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3 bg-slate-900 border-slate-800 text-slate-100">
          <CardHeader>
            <CardTitle>待办事项</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 border-b border-slate-800 pb-4 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">待审核地陪申请</p>
                    <p className="text-xs text-slate-500">2小时前</p>
                  </div>
                  <button className="text-xs text-indigo-400 hover:text-indigo-300">
                    查看
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
