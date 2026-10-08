import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LogoMark } from "@/components/site/Logo";

export const FullLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#09090B]" data-testid="page-loader">
    <LogoMark className="w-12 h-12 animate-pulse" />
  </div>
);

export const RequireAuth = ({ perm, children }) => {
  const { user, can } = useAuth();
  const location = useLocation();
  if (user === null) return <FullLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (perm && !can(perm)) return <Navigate to="/dashboard" replace />;
  return children;
};

export const GuestOnly = ({ children }) => {
  const { user } = useAuth();
  if (user === null) return <FullLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};
