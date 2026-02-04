import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Guides from "./pages/Guides";
import Messages from "./pages/Messages";
import Custom from "./pages/Custom";
import GuideEdit from "./pages/GuideEdit";
import GuideDetail from "./pages/GuideDetail";
import OrderDetail from "./pages/OrderDetail";
import OrderList from "./pages/OrderList";
import OrderCreate from "./pages/OrderCreate";
import WalletPage from "./pages/wallet/Wallet";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminOrderList from "./pages/admin/OrderList";
import AdminUserList from "./pages/admin/UserList";
import AdminGuideList from "./pages/admin/GuideList";
import AdminGuideAudit from "./pages/admin/GuideAudit";
import AdminSettings from "./pages/admin/SettingsPage";
import AdminAuditLogList from "./pages/admin/AuditLogList";

function Router() {
  return (
    <Switch>
      {/* 客户端路由 */}
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/guides"} component={Guides} />
      <Route path={"/guides/profile"} component={GuideEdit} />
      <Route path={"/guides/:id"} component={GuideDetail} />
      <Route path={"/messages"} component={Messages} />
      <Route path={"/custom"} component={Custom} />
      <Route path={"/orders"} component={OrderList} />
      <Route path={"/orders/create"} component={OrderCreate} />
      <Route path={"/orders/:id"} component={OrderDetail} />
      <Route path={"/wallet"} component={WalletPage} />

      {/* 后台管理路由 */}
      <Route path={"/admin/login"} component={AdminLogin} />
      <Route path={"/admin/dashboard"} component={AdminDashboard} />
      <Route path={"/admin/orders"} component={AdminOrderList} />
      <Route path={"/admin/users"} component={AdminUserList} />
      <Route path={"/admin/guides"} component={AdminGuideList} />
      <Route path={"/admin/guides/:id"} component={AdminGuideAudit} />
      <Route path={"/admin/audit-logs"} component={AdminAuditLogList} />
      <Route path={"/admin/settings"} component={AdminSettings} />

      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
