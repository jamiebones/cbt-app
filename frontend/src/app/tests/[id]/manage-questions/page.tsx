"use client";

import React from "react";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import TestQuestionManager from "@/components/tests/TestQuestionManager";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ManageTestQuestionsPage() {
  const params = useParams();
  const testId = params.id as string;

  return (
    <ProtectedRoute requiredAuth={true}>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/tests/${testId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Test
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Manage Questions for Test</h1>
        </div>
        <TestQuestionManager testId={testId} />
      </div>
    </ProtectedRoute>
  );
}
