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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Save, AlertCircle, Loader2 } from "lucide-react";
import { testService } from "@/services/test";
import { Subject, CreateTestFormData } from "@/types";

const TestEditPage = () => {
  const params = useParams();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingSubjects, setFetchingSubjects] = useState(true);
  const [fetchingTest, setFetchingTest] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateTestFormData>({
    title: "",
    description: "",
    instructions: "",
    duration: 60,
    totalQuestions: 10,
    passingScore: 70,
    questionSelectionMethod: "manual",
    subject: "",
    schedule: {
      startDate: "",
      endDate: "",
    },
    settings: {
      shuffleQuestions: true,
      shuffleAnswers: true,
      showResultsImmediately: false,
      allowReview: true,
      allowCalculator: false,
      showQuestionNavigation: true,
      preventCopyPaste: true,
      fullScreenMode: false,
    },
    enrollmentConfig: {
      isEnrollmentRequired: false,
      enrollmentFee: 0,
      enrollmentDeadline: "",
      allowLateEnrollment: false,
    },
    autoSelectionConfig: {
      questionCount: 10,
      difficultyDistribution: {
        easy: 40,
        medium: 40,
        hard: 20,
      },
    },
  });

  const testId = params.id as string;

  useEffect(() => {
    fetchSubjects();
    if (testId) {
      fetchTest();
    }
  }, [testId]);

  const fetchSubjects = async () => {
    try {
      setFetchingSubjects(true);
      const subjects = await testService.getSubjects();
      setSubjects(subjects);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFetchingSubjects(false);
    }
  };

  const fetchTest = async () => {
    try {
      setFetchingTest(true);
      const test = await testService.getTestById(testId);

      // Convert test data to form data format
      setFormData({
        title: test.title,
        description: test.description || "",
        instructions: test.instructions || "",
        duration: test.duration,
        totalQuestions: test.totalQuestions,
        passingScore: test.passingScore,
        questionSelectionMethod: test.questionSelectionMethod,
        subject: (typeof test.subject === "object" && test.subject?._id
          ? test.subject._id
          : test.subject) as string,
        schedule: {
          startDate: test.schedule.startDate,
          endDate: test.schedule.endDate,
        },
        settings: test.settings,
        enrollmentConfig: test.enrollmentConfig,
        autoSelectionConfig: test.autoSelectionConfig || {
          questionCount: test.totalQuestions,
          difficultyDistribution: {
            easy: 40,
            medium: 40,
            hard: 20,
          },
        },
      });
    } catch (err: any) {
      setError(err.message || "Failed to load test");
    } finally {
      setFetchingTest(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev };
      if (field.includes(".")) {
        const parts = field.split(".");
        let current = newData as any;

        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }

        current[parts[parts.length - 1]] = value;
      } else {
        (newData as any)[field] = value;
      }
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.title.trim()) {
      setError("Test title is required");
      return;
    }

    if (!formData.subject) {
      setError("Please select a subject");
      return;
    }

    if (!formData.schedule.startDate || !formData.schedule.endDate) {
      setError("Start and end dates are required");
      return;
    }

    if (
      new Date(formData.schedule.endDate) <=
      new Date(formData.schedule.startDate)
    ) {
      setError("End date must be after start date");
      return;
    }

    // Validate auto selection configuration
    if (
      formData.questionSelectionMethod === "auto" ||
      formData.questionSelectionMethod === "mixed"
    ) {
      if (
        !formData.autoSelectionConfig?.questionCount ||
        formData.autoSelectionConfig.questionCount <= 0
      ) {
        setError("Auto selection requires a valid question count");
        return;
      }

      if (formData.questionSelectionMethod === "auto") {
        if (
          formData.autoSelectionConfig.questionCount !== formData.totalQuestions
        ) {
          setError(
            "For auto selection, question count must match total questions"
          );
          return;
        }
      } else if (formData.questionSelectionMethod === "mixed") {
        if (
          formData.autoSelectionConfig.questionCount >= formData.totalQuestions
        ) {
          setError(
            "For mixed selection, auto question count must be less than total questions"
          );
          return;
        }
      }

      // Validate difficulty distribution totals 100%
      const { easy, medium, hard } =
        formData.autoSelectionConfig.difficultyDistribution;
      if (easy + medium + hard !== 100) {
        setError("Difficulty distribution percentages must total 100%");
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      await testService.updateTest(testId, formData);
      router.push(`/tests/${testId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingTest) {
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/tests/${testId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Test
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Test</h1>
            <p className="text-gray-600 mt-1">
              Update test settings and configuration
            </p>
          </div>
        </div>

        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update the fundamental details of your test
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Test Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Enter test title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Describe what this test covers"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) =>
                    handleInputChange("instructions", e.target.value)
                  }
                  placeholder="Instructions for test takers"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="480"
                    value={formData.duration}
                    onChange={(e) =>
                      handleInputChange("duration", parseInt(e.target.value))
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="totalQuestions">Total Questions *</Label>
                  <Input
                    id="totalQuestions"
                    type="number"
                    min="1"
                    value={formData.totalQuestions}
                    onChange={(e) =>
                      handleInputChange(
                        "totalQuestions",
                        parseInt(e.target.value)
                      )
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="passingScore">Passing Score (%) *</Label>
                  <Input
                    id="passingScore"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.passingScore}
                    onChange={(e) =>
                      handleInputChange(
                        "passingScore",
                        parseInt(e.target.value)
                      )
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Select
                    value={formData.subject}
                    onValueChange={(value) =>
                      handleInputChange("subject", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {fetchingSubjects ? (
                        <SelectItem value="loading" disabled>
                          Loading subjects...
                        </SelectItem>
                      ) : subjects.length === 0 ? (
                        <SelectItem value="no-subjects" disabled>
                          No subjects available
                        </SelectItem>
                      ) : (
                        subjects.map((subject) => (
                          <SelectItem key={subject._id} value={subject._id}>
                            {subject.name} ({subject.code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="questionSelectionMethod">
                    Question Selection Method
                  </Label>
                  <Select
                    value={formData.questionSelectionMethod}
                    onValueChange={(value: "manual" | "auto" | "mixed") =>
                      handleInputChange("questionSelectionMethod", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Selection</SelectItem>
                      <SelectItem value="auto">Auto Selection</SelectItem>
                      <SelectItem value="mixed">Mixed Selection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto Selection Configuration */}
          {(formData.questionSelectionMethod === "auto" ||
            formData.questionSelectionMethod === "mixed") && (
            <Card>
              <CardHeader>
                <CardTitle>Auto Selection Configuration</CardTitle>
                <CardDescription>
                  Configure how questions will be automatically selected
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="autoQuestionCount">
                    Auto Select Question Count *
                  </Label>
                  <Input
                    id="autoQuestionCount"
                    type="number"
                    min="1"
                    max={formData.totalQuestions}
                    value={formData.autoSelectionConfig?.questionCount || 10}
                    onChange={(e) =>
                      handleInputChange(
                        "autoSelectionConfig.questionCount",
                        parseInt(e.target.value)
                      )
                    }
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Number of questions to auto-select from the question bank
                  </p>
                </div>

                <div>
                  <Label>Difficulty Distribution (%)</Label>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div>
                      <Label htmlFor="easyPercent" className="text-sm">
                        Easy
                      </Label>
                      <Input
                        id="easyPercent"
                        type="number"
                        min="0"
                        max="100"
                        value={
                          formData.autoSelectionConfig?.difficultyDistribution
                            .easy || 40
                        }
                        onChange={(e) =>
                          handleInputChange(
                            "autoSelectionConfig.difficultyDistribution.easy",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="mediumPercent" className="text-sm">
                        Medium
                      </Label>
                      <Input
                        id="mediumPercent"
                        type="number"
                        min="0"
                        max="100"
                        value={
                          formData.autoSelectionConfig?.difficultyDistribution
                            .medium || 40
                        }
                        onChange={(e) =>
                          handleInputChange(
                            "autoSelectionConfig.difficultyDistribution.medium",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="hardPercent" className="text-sm">
                        Hard
                      </Label>
                      <Input
                        id="hardPercent"
                        type="number"
                        min="0"
                        max="100"
                        value={
                          formData.autoSelectionConfig?.difficultyDistribution
                            .hard || 20
                        }
                        onChange={(e) =>
                          handleInputChange(
                            "autoSelectionConfig.difficultyDistribution.hard",
                            parseInt(e.target.value)
                          )
                        }
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Distribution should total 100%
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Test Schedule</CardTitle>
              <CardDescription>
                Update when the test will be available
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date & Time *</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={formData.schedule.startDate}
                  onChange={(e) =>
                    handleInputChange("schedule.startDate", e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date & Time *</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={formData.schedule.endDate}
                  onChange={(e) =>
                    handleInputChange("schedule.endDate", e.target.value)
                  }
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Test Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Test Settings</CardTitle>
              <CardDescription>
                Configure how the test will behave
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="shuffleQuestions"
                    checked={formData.settings.shuffleQuestions}
                    onCheckedChange={(checked) =>
                      handleInputChange("settings.shuffleQuestions", checked)
                    }
                  />
                  <Label htmlFor="shuffleQuestions">Shuffle Questions</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="shuffleAnswers"
                    checked={formData.settings.shuffleAnswers}
                    onCheckedChange={(checked) =>
                      handleInputChange("settings.shuffleAnswers", checked)
                    }
                  />
                  <Label htmlFor="shuffleAnswers">Shuffle Answers</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showResultsImmediately"
                    checked={formData.settings.showResultsImmediately}
                    onCheckedChange={(checked) =>
                      handleInputChange(
                        "settings.showResultsImmediately",
                        checked
                      )
                    }
                  />
                  <Label htmlFor="showResultsImmediately">
                    Show Results Immediately
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowReview"
                    checked={formData.settings.allowReview}
                    onCheckedChange={(checked) =>
                      handleInputChange("settings.allowReview", checked)
                    }
                  />
                  <Label htmlFor="allowReview">Allow Review</Label>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowCalculator"
                    checked={formData.settings.allowCalculator}
                    onCheckedChange={(checked) =>
                      handleInputChange("settings.allowCalculator", checked)
                    }
                  />
                  <Label htmlFor="allowCalculator">Allow Calculator</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showQuestionNavigation"
                    checked={formData.settings.showQuestionNavigation}
                    onCheckedChange={(checked) =>
                      handleInputChange(
                        "settings.showQuestionNavigation",
                        checked
                      )
                    }
                  />
                  <Label htmlFor="showQuestionNavigation">
                    Show Question Navigation
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="preventCopyPaste"
                    checked={formData.settings.preventCopyPaste}
                    onCheckedChange={(checked) =>
                      handleInputChange("settings.preventCopyPaste", checked)
                    }
                  />
                  <Label htmlFor="preventCopyPaste">Prevent Copy/Paste</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="fullScreenMode"
                    checked={formData.settings.fullScreenMode}
                    onCheckedChange={(checked) =>
                      handleInputChange("settings.fullScreenMode", checked)
                    }
                  />
                  <Label htmlFor="fullScreenMode">Full Screen Mode</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enrollment Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Enrollment Configuration</CardTitle>
              <CardDescription>
                Configure enrollment settings and fees
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isEnrollmentRequired"
                  checked={formData.enrollmentConfig.isEnrollmentRequired}
                  onCheckedChange={(checked) =>
                    handleInputChange(
                      "enrollmentConfig.isEnrollmentRequired",
                      checked
                    )
                  }
                />
                <Label htmlFor="isEnrollmentRequired">Require Enrollment</Label>
              </div>

              {formData.enrollmentConfig.isEnrollmentRequired && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="enrollmentFee">Enrollment Fee ($)</Label>
                    <Input
                      id="enrollmentFee"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.enrollmentConfig.enrollmentFee}
                      onChange={(e) =>
                        handleInputChange(
                          "enrollmentConfig.enrollmentFee",
                          parseFloat(e.target.value)
                        )
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="enrollmentDeadline">
                      Enrollment Deadline
                    </Label>
                    <Input
                      id="enrollmentDeadline"
                      type="datetime-local"
                      value={formData.enrollmentConfig.enrollmentDeadline}
                      onChange={(e) =>
                        handleInputChange(
                          "enrollmentConfig.enrollmentDeadline",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-8">
                    <Checkbox
                      id="allowLateEnrollment"
                      checked={formData.enrollmentConfig.allowLateEnrollment}
                      onCheckedChange={(checked) =>
                        handleInputChange(
                          "enrollmentConfig.allowLateEnrollment",
                          checked
                        )
                      }
                    />
                    <Label htmlFor="allowLateEnrollment">
                      Allow Late Enrollment
                    </Label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link href={`/tests/${testId}`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Test
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
};

export default TestEditPage;
