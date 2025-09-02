"use client";

import ProtectedRoute from "@/components/ProtectedRoute";

const DashboardPage = () => {
  return (
    <ProtectedRoute requiredAuth={true}>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
        <p className="text-gray-600">
          Welcome to the CBT Application Dashboard
        </p>
      </div>
    </ProtectedRoute>
  );
};

export default DashboardPage;
