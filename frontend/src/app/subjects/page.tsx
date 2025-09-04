"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { mainApi } from "@/services/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { USER_ROLES } from "@/utils/config";
import LoadingSpinner from "@/components/LoadingSpinner";
import { API_ENDPOINTS } from "@/utils/config";
import { Search, Plus, Edit, Trash2, BookOpen } from "lucide-react";

import { SubjectWithStats } from "@/types";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const { state } = useAuth();

  // Only test center owners and test creators can access
  if (
    state.user?.user?.role !== USER_ROLES.TEST_CENTER_OWNER &&
    state.user?.user?.role !== USER_ROLES.TEST_CREATOR
  ) {
    return (
      <Card className="max-w-xl mx-auto mt-12 p-8">
        <div className="text-xl font-bold text-red-600 mb-2">Access Denied</div>
        <div className="text-gray-700">
          Only test center owners and test creators can view subjects.
        </div>
      </Card>
    );
  }

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await mainApi.get(API_ENDPOINTS.SUBJECTS);
      // Handle different response structures
      const subjectsData = response.data?.data || response.data || [];
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load subjects");
      setSubjects([]); // Ensure subjects is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (
    subjectId: string,
    subjectName: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to delete "${subjectName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await mainApi.delete(`${API_ENDPOINTS.SUBJECTS}/${subjectId}`);
      setSubjects(subjects.filter((subject) => subject._id !== subjectId));
    } catch (err: any) {
      setError(err?.message || "Failed to delete subject");
    }
  };

  const filteredSubjects = subjects.filter(
    (subject) =>
      subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (subject.description &&
        subject.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Subjects</h1>
          <p className="text-gray-600 mt-2">
            Manage subjects for organizing your questions and tests
          </p>
        </div>
        <Link href="/subjects/create">
          <Button className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Create Subject
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card className="p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="search">Search Subjects</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="search"
                type="text"
                placeholder="Search by name, code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Subjects Grid */}
      {filteredSubjects.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? "No subjects found" : "No subjects yet"}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm
              ? "Try adjusting your search terms"
              : "Get started by creating your first subject"}
          </p>
          {!searchTerm && (
            <Link href="/subjects/create">
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Subject
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.map((subject) => (
            <Card
              key={subject._id}
              className="p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{subject.name}</h3>
                  <p className="text-sm text-gray-500 font-mono">
                    {subject.code}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      /* TODO: Implement edit */
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleDeleteSubject(subject._id, subject.name)
                    }
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {subject.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {subject.description}
                </p>
              )}

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {subject.stats.questionCount}
                  </div>
                  <div className="text-xs text-gray-500">Questions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {subject.stats.testCount}
                  </div>
                  <div className="text-xs text-gray-500">Tests</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600 capitalize">
                    {subject.stats.averageDifficulty}
                  </div>
                  <div className="text-xs text-gray-500">Difficulty</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>
                    Created: {new Date(subject.createdAt).toLocaleDateString()}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      subject.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {subject.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {subjects.length > 0 && (
        <Card className="mt-8 p-6">
          <h3 className="text-lg font-semibold mb-4">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {subjects.length}
              </div>
              <div className="text-sm text-gray-500">Total Subjects</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {subjects.reduce(
                  (sum, subject) => sum + subject.stats.questionCount,
                  0
                )}
              </div>
              <div className="text-sm text-gray-500">Total Questions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {subjects.reduce(
                  (sum, subject) => sum + subject.stats.testCount,
                  0
                )}
              </div>
              <div className="text-sm text-gray-500">Total Tests</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {subjects.filter((subject) => subject.isActive).length}
              </div>
              <div className="text-sm text-gray-500">Active Subjects</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
