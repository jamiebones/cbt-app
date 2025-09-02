"use client";

import React, { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { User } from "@/types";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const authContext = useContext(AuthContext);
  const user: User | null | undefined = authContext?.state.user;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Navbar />
      <div className="flex flex-grow overflow-hidden">
        {user && <Sidebar />}
        <main className="flex-grow p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
