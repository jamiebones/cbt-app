"use client";

import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { User } from "@/types";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const authContext = useContext(AuthContext);
  const authUser = authContext?.state?.user;
  const [isClientReady, setIsClientReady] = useState(false);

  // Ensure client-side hydration is complete before making layout decisions
  useEffect(() => {
    setIsClientReady(true);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Navbar />
      <div className="flex flex-grow overflow-hidden">
        {/* Always render Sidebar but let it handle its own conditional rendering */}
        <Sidebar />
        <main className="flex-grow p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
