"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Eye, Trash2, Clock, Users, FileText } from "lucide-react";
import { Test } from "@/types";
import { testService } from "@/services/test";

const TestsPage = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await testService.getTests();
      setTests(Array.isArray(result.tests) ? result.tests : []);
    } catch (err: any) {
      setError(err.message || "Failed to load tests");
      setTests([]); // Ensure tests is always an array
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: "secondary" as const, label: "Draft" },
      published: { variant: "default" as const, label: "Published" },
      active: { variant: "default" as const, label: "Active" },
      completed: { variant: "outline" as const, label: "Completed" },
      archived: { variant: "outline" as const, label: "Archived" },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <ProtectedRoute requiredAuth={true}>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredAuth={true}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tests</h1>
            <p className="text-gray-600 mt-2">Manage your test assessments</p>
          </div>
          <ProtectedRoute
            requiredAuth={true}
            requiredRoles={["test_center_owner", "test_creator"]}
          >
            <Link href="/tests/create">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Test
              </Button>
            </Link>
          </ProtectedRoute>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {tests && tests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tests found
              </h3>
              <p className="text-gray-500 text-center mb-4">
                Get started by creating your first test assessment.
              </p>
              <ProtectedRoute
                requiredAuth={true}
                requiredRoles={["test_center_owner", "test_creator"]}
              >
                <Link href="/tests/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Test
                  </Button>
                </Link>
              </ProtectedRoute>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.isArray(tests) &&
              tests.map((test) => (
                <Card
                  key={test.id || test._id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">
                          {test.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {test.description || "No description provided"}
                        </CardDescription>
                      </div>
                      {getStatusBadge(test.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        Duration: {formatDuration(test.duration)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <FileText className="h-4 w-4 mr-2" />
                        {test.totalQuestions} Questions
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        Passing Score: {test.passingScore}%
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Link
                        href={`/tests/${test.id || test._id}`}
                        className="flex-1"
                      >
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Link
                        href={`/tests/${test.id || test._id}/edit`}
                        className="flex-1"
                      >
                        <Button variant="outline" size="sm" className="w-full">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default TestsPage;
