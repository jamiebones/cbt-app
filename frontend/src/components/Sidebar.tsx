"use client";

import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthContext } from "@/contexts/AuthContext";
import { Home, Users, UserPlus, BookOpen, FileText, BarChart2, Settings } from "lucide-react";
import { USER_ROLES } from "@/utils/config";

const Sidebar: React.FC = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.state.user;
  const isLoading = authContext?.state.isLoading;
  const isAuthenticated = authContext?.state.isAuthenticated;
  const pathname = usePathname();

  // Force re-render when auth state changes
  const [navLinks, setNavLinks] = useState<any[]>([]);

  const getNavLinks = () => {
    // Don't show role-based links while loading or if user data is incomplete
    if (!user || !user.user || !user.user.role || isLoading) {
      return [
        {
          href: "/dashboard",
          icon: <Home className="h-5 w-5" />,
          label: "Dashboard",
        },
      ];
    }

    const baseLinks = [
      {
        href: "/dashboard",
        icon: <Home className="h-5 w-5" />,
        label: "Dashboard",
      },
    ];

    switch (user.user.role) {
      case USER_ROLES.TEST_CENTER_OWNER:
        return [
          ...baseLinks,
          {
            href: "/manage-test-creators",
            icon: <Users className="h-5 w-5" />,
            label: "Manage Test Creators",
          },
          {
            href: "/test-creators",
            icon: <UserPlus className="h-5 w-5" />,
            label: "Create Test Creator",
          },
          {
            href: "/subjects",
            icon: <BookOpen className="h-5 w-5" />,
            label: "Subjects",
          },
          {
            href: "/tests",
            icon: <FileText className="h-5 w-5" />,
            label: "Tests",
          },
          {
            href: "/users",
            icon: <Users className="h-5 w-5" />,
            label: "Users",
          },
          {
            href: "/analytics",
            icon: <BarChart2 className="h-5 w-5" />,
            label: "Analytics",
          },
          {
            href: "/settings",
            icon: <Settings className="h-5 w-5" />,
            label: "Settings",
          },
        ];
      case USER_ROLES.TEST_CREATOR:
        return [
          ...baseLinks,
          {
            href: "/subjects",
            icon: <BookOpen className="h-5 w-5" />,
            label: "Subjects",
          },
          {
            href: "/tests",
            icon: <FileText className="h-5 w-5" />,
            label: "My Tests",
          },
          {
            href: "/analytics",
            icon: <BarChart2 className="h-5 w-5" />,
            label: "Analytics",
          },
        ];
      case USER_ROLES.STUDENT:
        return [
          ...baseLinks,
          {
            href: "/my-results",
            icon: <BarChart2 className="h-5 w-5" />,
            label: "My Results",
          },
        ];
      case USER_ROLES.SUPER_ADMIN:
        return [
          ...baseLinks,
          {
            href: "/admin/test-centers",
            icon: <Users className="h-5 w-5" />,
            label: "Test Centers",
          },
          {
            href: "/admin/analytics",
            icon: <BarChart2 className="h-5 w-5" />,
            label: "System Analytics",
          },
          {
            href: "/admin/settings",
            icon: <Settings className="h-5 w-5" />,
            label: "System Settings",
          },
        ];
      default:
        return baseLinks;
    }
  };

  // Update navLinks whenever auth state changes
  useEffect(() => {
    const newNavLinks = getNavLinks();
    setNavLinks(newNavLinks);
  }, [user, isLoading, isAuthenticated]);

  // Show loading state while authentication is being restored
  if (isLoading) {
    return (
      <aside className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Navigation</h2>
        </div>
        <nav className="flex-grow p-2">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </nav>
      </aside>
    );
  }

  // Don't show sidebar if not authenticated and not loading
  if (!isAuthenticated && !isLoading) {
    return null;
  }

  return (
    <aside className="w-64 bg-gray-800 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">Navigation</h2>
      </div>
      <nav className="flex-grow p-2">
        <ul>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center p-3 my-1 rounded-md transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  {link.icon}
                  <span className="ml-3">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
