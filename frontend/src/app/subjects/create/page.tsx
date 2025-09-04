"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { mainApi } from "@/services/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { USER_ROLES } from "@/utils/config";
import { API_ENDPOINTS } from "@/utils/config";
import LoadingSpinner from "@/components/LoadingSpinner";

import { CreateSubjectForm } from "@/types";

const initialForm: CreateSubjectForm = {
  name: "",
  code: "",
  description: "",
};

export default function CreateSubjectPage() {
  const [form, setForm] = useState<CreateSubjectForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
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
          Only test center owners and test creators can create subjects.
        </div>
      </Card>
    );
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "code") {
      // Auto-uppercase the code
      setForm((prev) => ({
        ...prev,
        [name]: value.toUpperCase(),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await mainApi.post(API_ENDPOINTS.SUBJECTS, form);
      router.push("/subjects");
    } catch (err: any) {
      setError(err?.message || "Failed to create subject");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-12 p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Create New Subject</h2>
        <p className="text-gray-600 mt-2">Create a subject/course .</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="name">Subject Name *</Label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g., Mathematics, Physics, Chemistry"
            value={form.name}
            onChange={handleChange}
            className="mt-1"
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter a descriptive name for the subject
          </p>
        </div>

        <div>
          <Label htmlFor="code">Subject Code *</Label>
          <Input
            id="code"
            name="code"
            type="text"
            required
            placeholder="e.g., MATH 211, PHY 432, CHEM 101"
            value={form.code}
            onChange={handleChange}
            className="mt-1 uppercase"
            maxLength={20}
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter a unique code (uppercase letters, numbers, underscores only)
          </p>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Optional description of the subject"
            value={form.description}
            onChange={handleChange}
            className="mt-1"
            rows={4}
            maxLength={500}
          />
          <p className="text-sm text-gray-500 mt-1">
            Provide additional details about this subject (optional)
          </p>
        </div>

        {error && (
          <div className="text-red-500 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? "Creating..." : "Create Subject"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/subjects")}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
