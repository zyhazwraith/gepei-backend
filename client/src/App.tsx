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
import OrderDetail from "./pages/OrderDetail";
import OrderList from "./pages/OrderList";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminOrderList from "./pages/admin/OrderList";

function Router() {
  return (
    <Switch>
      {/* 客户端路由 */}
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/guides"} component={Guides} />
      <Route path={"/messages"} component={Messages} />
      <Route path={"/custom"} component={Custom} />
      <Route path={"/guide-edit"} component={GuideEdit} />
      <Route path={"/orders"} component={OrderList} />
      <Route path={"/orders/:id"} component={OrderDetail} />

      {/* 后台管理路由 */}
      <Route path={"/admin/login"} component={AdminLogin} />
      <Route path={"/admin/dashboard"} component={AdminDashboard} />
      <Route path={"/admin/orders"} component={AdminOrderList} />
      {/* 后续添加更多 admin 路由: /admin/users 等 */}

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
