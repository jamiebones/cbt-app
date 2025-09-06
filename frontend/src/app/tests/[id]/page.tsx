"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Edit,
  Clock,
  Users,
  FileText,
  Calendar,
  Settings,
  BookOpen,
  AlertCircle,
  CheckCircle,
  XCircle,
  Play,
  BarChart3,
} from "lucide-react";
import { Test } from "@/types";
import { testService } from "@/services/test";

const TestViewPage = () => {
  const params = useParams();
  const router = useRouter();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const testId = params.id as string;

  useEffect(() => {
    if (testId) {
      fetchTest();
    }
  }, [testId]);

  const fetchTest = async () => {
    try {
      setLoading(true);
      setError(null);
      const testData = await testService.getTestById(testId);
      setTest(testData);
    } catch (err: any) {
      setError(err.message || "Failed to load test");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: {
        variant: "secondary" as const,
        label: "Draft",
        icon: AlertCircle,
      },
      published: {
        variant: "default" as const,
        label: "Published",
        icon: CheckCircle,
      },
      active: { variant: "default" as const, label: "Active", icon: Play },
      completed: {
        variant: "outline" as const,
        label: "Completed",
        icon: CheckCircle,
      },
      archived: {
        variant: "outline" as const,
        label: "Archived",
        icon: XCircle,
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  if (error || !test) {
    return (
      <ProtectedRoute requiredAuth={true}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/tests">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tests
              </Button>
            </Link>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {error || "Test not found"}
              </h3>
              <p className="text-gray-500 text-center mb-4">
                The test you're looking for doesn't exist or you don't have
                permission to view it.
              </p>
              <Link href="/tests">
                <Button>Back to Tests</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredAuth={true}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/tests">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tests
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{test.title}</h1>
              <p className="text-gray-600 mt-1">Test Details</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/tests/${testId}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Test
              </Button>
            </Link>
          </div>
        </div>

        {/* Status and Quick Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <div className="mt-1">{getStatusBadge(test.status)}</div>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="text-lg font-semibold">
                    {formatDuration(test.duration)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Questions</p>
                  <p className="text-lg font-semibold">{test.totalQuestions}</p>
                </div>
                <BookOpen className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Passing Score</p>
                  <p className="text-lg font-semibold">{test.passingScore}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {test.description && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Description
                    </h4>
                    <p className="text-gray-600">{test.description}</p>
                  </div>
                )}

                {test.instructions && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Instructions
                    </h4>
                    <p className="text-gray-600">{test.instructions}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">
                      Question Selection
                    </h4>
                    <p className="text-gray-600 capitalize">
                      {test.questionSelectionMethod}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Subject</h4>
                    <p className="text-gray-600">
                      {
                        (typeof test.subject === "object" && test.subject?.name
                          ? test.subject.name
                          : test.subject) as string
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Test Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">
                      Start Date & Time
                    </h4>
                    <p className="text-gray-600">
                      {formatDate(test.schedule.startDate)}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">
                      End Date & Time
                    </h4>
                    <p className="text-gray-600">
                      {formatDate(test.schedule.endDate)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Test Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {test.settings.shuffleQuestions ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Shuffle Questions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {test.settings.shuffleAnswers ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Shuffle Answers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {test.settings.showResultsImmediately ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Show Results Immediately</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {test.settings.allowReview ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Allow Review</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {test.settings.allowCalculator ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Allow Calculator</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {test.settings.showQuestionNavigation ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Show Question Navigation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {test.settings.preventCopyPaste ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Prevent Copy/Paste</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {test.settings.fullScreenMode ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Full Screen Mode</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Enrollment Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Enrollment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Required</span>
                  {test.enrollmentConfig.isEnrollmentRequired ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>

                {test.enrollmentConfig.isEnrollmentRequired && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-gray-600">Fee</p>
                      <p className="font-medium">
                        ${test.enrollmentConfig.enrollmentFee}
                      </p>
                    </div>
                    {test.enrollmentConfig.enrollmentDeadline && (
                      <div>
                        <p className="text-sm text-gray-600">Deadline</p>
                        <p className="font-medium">
                          {formatDate(test.enrollmentConfig.enrollmentDeadline)}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Allow Late Enrollment</span>
                      {test.enrollmentConfig.allowLateEnrollment ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Attempts</span>
                  <span className="font-medium">
                    {test.stats.totalAttempts}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="font-medium">
                    {test.stats.completedAttempts}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average Score</span>
                  <span className="font-medium">
                    {test.stats.averageScore.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Highest Score</span>
                  <span className="font-medium">
                    {test.stats.highestScore}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Lowest Score</span>
                  <span className="font-medium">{test.stats.lowestScore}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/tests/${testId}/edit`} className="w-full">
                  <Button variant="outline" className="w-full">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Test
                  </Button>
                </Link>
                <Button variant="outline" className="w-full">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Results
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default TestViewPage;
