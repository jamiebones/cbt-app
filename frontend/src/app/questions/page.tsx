"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { mainApi } from "@/services/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/LoadingSpinner";
import { USER_ROLES } from "@/utils/config";
import { API_ENDPOINTS } from "@/utils/config";
import { Search, Plus, BookOpen, FileText, BarChart3 } from "lucide-react";
import { Subject, Question } from "@/types";
import MathDisplay from "@/components/MathDisplay";

interface QuestionWithSubject extends Question {
  subject?: Subject;
  _id?: string;
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<QuestionWithSubject[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [error, setError] = useState("");
  const { state } = useAuth();

  // Role-based access control
  if (
    state.user?.user?.role !== USER_ROLES.TEST_CENTER_OWNER &&
    state.user?.user?.role !== USER_ROLES.TEST_CREATOR
  ) {
    return (
      <Card className="max-w-xl mx-auto mt-12 p-8">
        <div className="text-xl font-bold text-red-600 mb-2">Access Denied</div>
        <div className="text-gray-700">
          Only test center owners and test creators can access the question
          bank.
        </div>
      </Card>
    );
  }

  useEffect(() => {
    fetchQuestionsAndSubjects();
  }, []);

  const fetchQuestionsAndSubjects = async () => {
    try {
      setLoading(true);
      const [questionsResponse, subjectsResponse] = await Promise.all([
        mainApi.get(API_ENDPOINTS.QUESTIONS),
        mainApi.get(API_ENDPOINTS.SUBJECTS),
      ]);

      const questionsData = questionsResponse.data?.data || [];
      const subjectsData = subjectsResponse.data?.data || [];

      // Combine questions with their subjects
      const questionsWithSubjects = questionsData.map(
        (question: QuestionWithSubject) => ({
          ...question,
          subject: subjectsData.find(
            (subject: Subject) =>
              subject._id === (question.subject as any)?._id || question.subject
          ),
        })
      );

      setQuestions(questionsWithSubjects);
      setSubjects(subjectsData);
    } catch (err: any) {
      setError(err?.message || "Failed to load questions and subjects");
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter((question) => {
    const matchesSearch = question.questionText
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesSubject =
      selectedSubject === "all" ||
      (question.subject as any)?._id === selectedSubject;

    return matchesSearch && matchesSubject;
  });

  const getDifficultyBadge = (difficulty: string) => {
    const colors = {
      easy: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      hard: "bg-red-100 text-red-800",
    };

    return (
      <Badge
        className={colors[difficulty as keyof typeof colors] || colors.medium}
      >
        {difficulty}
      </Badge>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Question Bank</h1>
          <p className="text-gray-600 mt-2">
            Manage all questions across your subjects
          </p>
        </div>
        <Link href="/subjects">
          <Button className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Manage by Subject
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Questions</p>
                <p className="text-2xl font-bold">{questions.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Subjects</p>
                <p className="text-2xl font-bold">{subjects.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Easy</p>
                <p className="text-2xl font-bold">
                  {
                    questions.filter((q) => (q as any).difficulty === "easy")
                      .length
                  }
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Medium/Hard</p>
                <p className="text-2xl font-bold">
                  {
                    questions.filter((q) => (q as any).difficulty !== "easy")
                      .length
                  }
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject._id} value={subject._id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Questions List */}
      {filteredQuestions.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || selectedSubject !== "all"
              ? "No questions found"
              : "No questions yet"}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedSubject !== "all"
              ? "Try adjusting your search or filter criteria"
              : "Get started by creating subjects and adding questions"}
          </p>
          <Link href="/subjects">
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              <BookOpen className="h-4 w-4 mr-2" />
              Manage Subjects
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((question) => (
            <Card
              key={question.id || question._id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getDifficultyBadge(
                        (question as any).difficulty || "medium"
                      )}
                      <Badge variant="outline">
                        {question.type === "multiple_choice"
                          ? "Multiple Choice"
                          : question.type === "true_false"
                          ? "True or False"
                          : question.type}
                      </Badge>
                      {question.subject && (
                        <Badge variant="secondary">
                          {(question.subject as Subject).name}
                        </Badge>
                      )}
                    </div>
                    <div className="text-lg font-medium text-gray-900 mb-2">
                      <MathDisplay
                        content={
                          question.questionText || (question as any).text || ""
                        }
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>{question.answers?.length || 0} answers</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    <Link
                      href={`/subjects/${
                        (question.subject as Subject)?._id
                      }/questions`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit in Subject →
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
