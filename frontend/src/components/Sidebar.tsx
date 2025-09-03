"use client";

import React, { useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthContext } from "@/contexts/AuthContext";
import { User } from "@/types";
import {
  Home,
  BarChart2,
  FileText,
  Users,
  Settings,
  UserPlus,
} from "lucide-react";

const Sidebar: React.FC = () => {
  const authContext = useContext(AuthContext);
  const user: User | null | undefined = authContext?.state.user;
  const pathname = usePathname();

  const getNavLinks = () => {
    if (!user) return [];

    const baseLinks = [
      {
        href: "/dashboard",
        icon: <Home className="h-5 w-5" />,
        label: "Dashboard",
      },
    ];

    switch (user.role) {
      case "test_center_owner":
        return [
          ...baseLinks,
          {
            href: "/test-creators",
            icon: <UserPlus className="h-5 w-5" />,
            label: "Create Test Creator",
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
      case "test_creator":
        return [
          ...baseLinks,
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
      case "student":
        return [
          ...baseLinks,
          {
            href: "/my-results",
            icon: <BarChart2 className="h-5 w-5" />,
            label: "My Results",
          },
        ];
      case "super_admin":
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

  const navLinks = getNavLinks();

  if (!user) {
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
