"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "@/types";
import { USER_ROLES } from "@/utils/config";
import LoadingSpinner from "./LoadingSpinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: User["role"];
  requiredAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredAuth = true,
}) => {
  const { state } = useAuth();
  const router = useRouter();

  // Show spinner while loading or if state is not yet resolved
  if (state.isLoading) {
    return <LoadingSpinner />;
  }

  // If authentication is required and not authenticated, redirect to login
  if (requiredAuth && !state.isAuthenticated) {
    if (typeof window !== "undefined") {
      router.replace("/login");
    }
    return <LoadingSpinner />;
  }

  // If a specific role is required and user does not have it, redirect accordingly
  if (requiredRole && state.user?.user?.role !== requiredRole) {
    if (typeof window !== "undefined") {
      switch (state.user?.user?.role) {
        case USER_ROLES.SUPER_ADMIN:
          router.replace("/admin");
          break;
        case USER_ROLES.TEST_CENTER_OWNER:
        case USER_ROLES.TEST_CREATOR:
          router.replace("/dashboard");
          break;
        case USER_ROLES.STUDENT:
          router.replace("/test-selection");
          break;
        default:
          router.replace("/login");
          break;
      }
    }
    return <LoadingSpinner />;
  }

  // User is authenticated and has the required role
  return <>{children}</>;
};

export default ProtectedRoute;
