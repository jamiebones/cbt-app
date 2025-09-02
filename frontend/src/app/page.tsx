"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const router = useRouter();
  const { state } = useAuth();

  useEffect(() => {
    if (state.isAuthenticated && !state.isLoading) {
      router.push("/dashboard");
    } else if (!state.isAuthenticated && !state.isLoading) {
      router.push("/login");
    }
  }, [state.isAuthenticated, state.isLoading, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          CBT Application
        </h1>
        <p className="text-gray-600">
          Welcome to the Computer-Based Testing Application
        </p>
        <div className="mt-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    </main>
  );
}
