"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "@/types";
import LoadingSpinner from "./LoadingSpinner";
import { useEffect } from "react";

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

  useEffect(() => {
    // Check if authentication is required
    if (requiredAuth && !state.isAuthenticated && !state.isLoading) {
      router.push("/login");
      return;
    }

    // Check if specific role is required
    if (requiredRole && state.user?.role !== requiredRole && !state.isLoading) {
      // Redirect based on user role
      switch (state.user?.role) {
        case "super_admin":
          router.push("/admin");
          break;
        case "test_center_owner":
        case "test_creator":
          router.push("/dashboard");
          break;
        case "student":
          router.push("/test-selection");
          break;
        default:
          router.push("/login");
          break;
      }
    }
  }, [
    state.isAuthenticated,
    state.isLoading,
    state.user?.role,
    requiredAuth,
    requiredRole,
    router,
  ]);

  // Always show spinner while loading
  if (state.isLoading) {
    return <LoadingSpinner />;
  }

  // Only redirect if not authenticated and not loading (handled in useEffect)
  if (requiredAuth && !state.isAuthenticated) {
    return <LoadingSpinner />;
  }

  // Only show spinner if role mismatch and not loading
  if (requiredRole && state.user?.role !== requiredRole) {
    return <LoadingSpinner />;
  }

  // User is authenticated and has the required role
  return <>{children}</>;
};

export default ProtectedRoute;
