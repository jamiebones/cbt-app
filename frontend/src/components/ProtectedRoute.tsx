"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { User } from "@/types";
import { USER_ROLES } from "@/utils/config";
import LoadingSpinner from "./LoadingSpinner";

interface ProtectedRouteProps {      
  children: React.ReactNode;
  requiredRole?: User["role"]; // backward compatible
  requiredRoles?: User["role"][]; // any-of roles
  requiredAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredRoles,
  requiredAuth = true,
}) => {
  const { state } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Ensure we only render on the client to avoid SSR/CSR mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

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

  const userRole = state.user?.user?.role;

  // If a specific role is required and user does not have it, redirect accordingly
  if (requiredRole && userRole !== requiredRole) {
    if (typeof window !== "undefined") {
      switch (userRole) {
        case USER_ROLES.SUPER_ADMIN:
          router.replace("/admin");
          break;
        case USER_ROLES.TEST_CENTER_OWNER:
        case USER_ROLES.TEST_CREATOR:
          router.replace("/dashboard");
          break;
        case USER_ROLES.STUDENT:
          router.replace("/dashboard");
          break;
        default:
          router.replace("/login");
          break;
      }
    }
    return <LoadingSpinner />;
  }

  // If any-of roles are required and user role is not included, redirect
  if (
    requiredRoles &&
    requiredRoles.length > 0 &&
    !requiredRoles.includes(userRole as any)
  ) {
    if (typeof window !== "undefined") {
      switch (userRole) {
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
