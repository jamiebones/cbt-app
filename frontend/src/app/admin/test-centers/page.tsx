"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Building2,
  Phone,
  Mail,
  Calendar,
  MapPin,
} from "lucide-react";
import { mainApi } from "@/services/api";
import { API_ENDPOINTS } from "@/utils/config";
import ProtectedRoute from "@/components/ProtectedRoute";

interface TestCenterOwner {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  testCenterName: string;
  testCenterAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
  };
  subscriptionTier: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const TestCentersPage: React.FC = () => {
  const [testCenters, setTestCenters] = useState<TestCenterOwner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTestCenters();
  }, []);

  const fetchTestCenters = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await mainApi.get(API_ENDPOINTS.TEST_CENTER_OWNERS);

      if (response.data.success) {
        setTestCenters(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching test centers:", error);
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to load test centers"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getSubscriptionBadgeVariant = (tier: string) => {
    switch (tier) {
      case "premium":
        return "default";
      case "free":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span className="text-lg">Loading test centers...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole="super_admin">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Test Centers
            </h1>
            <p className="text-gray-600">
              Manage all test center owners in the system
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testCenters.map((center) => (
              <Card
                key={center.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg">
                        {center.testCenterName}
                      </CardTitle>
                    </div>
                    <Badge variant={center.isActive ? "default" : "secondary"}>
                      {center.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription>
                    {center.firstName} {center.lastName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span>{center.email}</span>
                    </div>

                    {center.phoneNumber && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{center.phoneNumber}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {center.testCenterAddress.city},{" "}
                        {center.testCenterAddress.state}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Created {formatDate(center.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">Subscription:</span>
                    <Badge
                      variant={getSubscriptionBadgeVariant(
                        center.subscriptionTier
                      )}
                    >
                      {center.subscriptionTier}
                    </Badge>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {testCenters.length === 0 && !error && (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Test Centers Found
              </h3>
              <p className="text-gray-600">
                There are no test center owners registered in the system yet.
              </p>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {testCenters.length} test center
              {testCenters.length !== 1 ? "s" : ""}
            </div>
            <Button onClick={fetchTestCenters} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                "Refresh"
              )}
            </Button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default TestCentersPage;
