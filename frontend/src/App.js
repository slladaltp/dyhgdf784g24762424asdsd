import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { LayoutDashboard, User, Settings as SettingsIcon, Gauge, Users, Newspaper, ShieldCheck, Server, ScrollText, ShoppingBag, Terminal, Gift, SlidersHorizontal } from "lucide-react";
import { CurrencyProvider } from "@/lib/currency";
import Shop from "@/pages/Shop";
import Payment from "@/pages/Payment";
import { Purchases, ConsolePage } from "@/pages/account/Donate";
import AdminShop from "@/pages/admin/AdminShop";
import AdminDonate from "@/pages/admin/AdminDonate";
import AdminConsole from "@/pages/admin/AdminConsole";
import AdminSettings from "@/pages/admin/AdminSettings";
import "@/App.css";
import { AuthProvider } from "@/context/AuthContext";
import { RequireAuth, GuestOnly } from "@/components/auth/Guards";
import { PanelLayout } from "@/components/panel/PanelLayout";
import Landing from "@/pages/Landing";
import NewsDetail from "@/pages/NewsDetail";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import Leaderboard from "@/pages/Leaderboard";
import PlayerProfile from "@/pages/PlayerProfile";
import Dashboard from "@/pages/account/Dashboard";
import Profile from "@/pages/account/Profile";
import Settings from "@/pages/account/Settings";
import AdminHome from "@/pages/admin/AdminHome";
import AdminAudit from "@/pages/admin/AdminAudit";
import AdminServers from "@/pages/admin/AdminServers";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminNews from "@/pages/admin/AdminNews";
import AdminNewsEditor from "@/pages/admin/AdminNewsEditor";
import AdminRoles from "@/pages/admin/AdminRoles";

const ACCOUNT_NAV = [
  { id: "dashboard", to: "/dashboard", label: "Обзор", icon: LayoutDashboard, end: true },
  { id: "profile", to: "/profile", label: "Профиль", icon: User },
  { id: "purchases", to: "/purchases", label: "Мои покупки", icon: ShoppingBag },
  { id: "console", to: "/console", label: "Консоль", icon: Terminal },
  { id: "settings", to: "/settings", label: "Настройки", icon: SettingsIcon },
];

const ADMIN_NAV = [
  { id: "admin-overview", to: "/admin", label: "Сводка", icon: Gauge, end: true },
  { id: "admin-users", to: "/admin/users", label: "Пользователи", icon: Users, perm: "users.view" },
  { id: "admin-donate", to: "/admin/donate", label: "Заказы и выдача", icon: Gift, perm: "donate.manage" },
  { id: "admin-shop", to: "/admin/shop", label: "Магазин", icon: ShoppingBag },
  { id: "admin-console", to: "/admin/console", label: "RCON консоль", icon: Terminal },
  { id: "admin-news", to: "/admin/news", label: "Новости", icon: Newspaper },
  { id: "admin-servers", to: "/admin/servers", label: "Сервера", icon: Server, perm: "servers.manage" },
  { id: "admin-settings", to: "/admin/settings", label: "Настройки", icon: SlidersHorizontal },
  { id: "admin-audit", to: "/admin/audit", label: "Журнал действий", icon: ScrollText, perm: "audit.view" },
  { id: "admin-roles", to: "/admin/roles", label: "Роли и права", icon: ShieldCheck },
];

function App() {
  return (
    <div className="App" data-testid="app-root">
      <AuthProvider>
        <CurrencyProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/news/:slug" element={<NewsDetail />} />
            <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
            <Route path="/forgot-password" element={<GuestOnly><ForgotPassword /></GuestOnly>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/payment/:orderId" element={<RequireAuth><Payment /></RequireAuth>} />
            <Route path="/player/:username" element={<PlayerProfile />} />
            <Route element={<RequireAuth><PanelLayout items={ACCOUNT_NAV} section="account" /></RequireAuth>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/console" element={<ConsolePage />} />
            </Route>
            <Route path="/admin" element={<RequireAuth perm="admin.access"><PanelLayout items={ADMIN_NAV} section="admin" /></RequireAuth>}>
              <Route index element={<AdminHome />} />
              <Route path="servers" element={<RequireAuth perm="servers.manage"><AdminServers /></RequireAuth>} />
              <Route path="shop" element={<AdminShop />} />
              <Route path="donate" element={<RequireAuth perm="donate.manage"><AdminDonate /></RequireAuth>} />
              <Route path="console" element={<AdminConsole />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="audit" element={<RequireAuth perm="audit.view"><AdminAudit /></RequireAuth>} />
              <Route path="users" element={<RequireAuth perm="users.view"><AdminUsers /></RequireAuth>} />
              <Route path="news" element={<AdminNews />} />
              <Route path="news/new" element={<RequireAuth perm="news.create"><AdminNewsEditor /></RequireAuth>} />
              <Route path="news/:id" element={<RequireAuth perm="news.edit"><AdminNewsEditor /></RequireAuth>} />
              <Route path="roles" element={<AdminRoles />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </CurrencyProvider>
        <Toaster theme="dark" position="bottom-right"
          toastOptions={{ style: { background: "#121215", border: "1px solid rgba(255,107,0,0.4)", color: "#fff", borderRadius: 0 } }} />
      </AuthProvider>
    </div>
  );
}

export default App;
