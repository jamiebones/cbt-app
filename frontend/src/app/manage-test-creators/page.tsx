"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Trash2, UserPlus } from "lucide-react";
import { mainApi } from "@/services/api";
import { API_ENDPOINTS } from "@/utils/config";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useRouter } from "next/navigation";

interface TestCreator {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const ManageTestCreatorsPage: React.FC = () => {
  const router = useRouter();
  const [testCreators, setTestCreators] = useState<TestCreator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTestCreators = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await mainApi.get(
        API_ENDPOINTS.GET_TEST_CREATORS_BY_OWNER
      );

      if (response.data.success) {
        setTestCreators(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching test creators:", error);
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch test creators"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTestCreator = async (testCreatorId: string) => {
    try {
      setDeletingId(testCreatorId);
      setError(null);

      const response = await mainApi.delete(
        API_ENDPOINTS.DELETE_TEST_CREATOR(testCreatorId)
      );

      if (response.data.success) {
        setSuccess("Test creator deleted successfully!");
        // Remove the deleted test creator from the list
        setTestCreators((prev) =>
          prev.filter((creator) => creator.id !== testCreatorId)
        );
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      console.error("Error deleting test creator:", error);
      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to delete test creator"
      );
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchTestCreators();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <ProtectedRoute requiredRole="test_center_owner">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-8 w-8" />
                Manage Test Creators
              </h1>
              <p className="text-gray-600 mt-1">
                View and manage test creators in your test center
              </p>
            </div>
            <Button
              onClick={() => router.push("/test-creators")}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Create New Test Creator
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6">
              <AlertDescription className="text-green-700">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Test Creators ({testCreators.length})</CardTitle>
              <CardDescription>
                All test creators associated with your test center
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  <span className="ml-2 text-gray-500">
                    Loading test creators...
                  </span>
                </div>
              ) : testCreators.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Test Creators Found
                  </h3>
                  <p className="text-gray-500 mb-4">
                    You haven't created any test creators yet.
                  </p>
                  <Button onClick={() => router.push("/test-creators")}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Your First Test Creator
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto relative">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testCreators.map((creator) => (
                        <TableRow key={creator.id}>
                          <TableCell className="font-medium">
                            {creator.firstName} {creator.lastName}
                          </TableCell>
                          <TableCell>{creator.email}</TableCell>
                          <TableCell>
                            {creator.phoneNumber || "Not provided"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                creator.isActive ? "default" : "secondary"
                              }
                            >
                              {creator.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(creator.createdAt)}</TableCell>
                          <TableCell>{formatDate(creator.updatedAt)}</TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={deletingId === creator.id}
                                  className="relative z-10"
                                >
                                  {deletingId === creator.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="z-[102]">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Test Creator
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete{" "}
                                    <strong>
                                      {creator.firstName} {creator.lastName}
                                    </strong>
                                    ? This action cannot be undone and will
                                    permanently remove their account and all
                                    associated data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleDeleteTestCreator(creator.id)
                                    }
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default ManageTestCreatorsPage;
