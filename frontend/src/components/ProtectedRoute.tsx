"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "@/types";
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
        case "super_admin":
          router.replace("/admin");
          break;
        case "test_center_owner":
        case "test_creator":
          router.replace("/dashboard");
          break;
        case "student":
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
