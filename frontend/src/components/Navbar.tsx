"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const Navbar: React.FC = () => {
  const { state, logout } = useAuth();
  const { user, isLoading } = state;
  const [isClientReady, setIsClientReady] = useState(false);

  // Ensure client-side hydration is complete before showing auth-dependent content
  useEffect(() => {
    setIsClientReady(true);
  }, []);

  // Show loading state during initial hydration or when auth is loading
  if (!isClientReady || isLoading) {
    return (
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0">
              <Link href="/" className="text-2xl font-bold text-indigo-600">
                CBT App
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-indigo-600">
              CBT App
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {user ? (
                <>
                  <span className="text-gray-700">
                    Welcome, {user.user.name}!
                  </span>
                  {user.user.role === "super_admin" && (
                    <Link
                      href="/register-center-owner"
                      className="bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                    >
                      Register Center Owner
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-700 hover:bg-gray-200 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
