"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Question } from "@/types";
import MathDisplay from "./MathDisplay";
import { Badge } from "./ui/badge";

interface QuestionPreviewProps {
  question: Question | null;
  isOpen: boolean;
  onClose: () => void;
}

const QuestionPreview: React.FC<QuestionPreviewProps> = ({
  question,
  isOpen,
  onClose,
}) => {
  if (!question) return null;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case "multiple_choice":
        return "Multiple Choice";
      case "true_false":
        return "True or False";
      default:
        return type;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Question Preview</DialogTitle>
          <DialogDescription>
            View how this question will appear to students during the test.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Question Header */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge
              className={getDifficultyColor(question.difficulty || "medium")}
            >
              {question.difficulty || "Medium"}
            </Badge>
            <Badge variant="outline">
              {getQuestionTypeLabel(question.type)}
            </Badge>
            {(question as any).points && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {(question as any).points}{" "}
                {(question as any).points === 1 ? "Point" : "Points"}
              </Badge>
            )}
          </div>

          {/* Question Content */}
          <div className="rounded-lg border border-gray-200 p-6 bg-white">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Question
              </h3>
              <div className="prose max-w-none">
                <MathDisplay
                  content={question.questionText || question.text || ""}
                  className="text-gray-800"
                />
              </div>
            </div>

            {/* Answers */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Answers
              </h3>
              <div className="space-y-3">
                {question.answers?.map((answer, index) => (
                  <div
                    key={answer.id || index}
                    className={`flex items-start p-4 rounded-md border ${
                      answer.isCorrect
                        ? "bg-green-50 border-green-200"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex-shrink-0 mr-3">
                      <div
                        className={`flex items-center justify-center w-7 h-7 rounded-full border ${
                          answer.isCorrect
                            ? "bg-green-100 border-green-400 text-green-700"
                            : "bg-gray-100 border-gray-300 text-gray-700"
                        }`}
                      >
                        {String.fromCharCode(65 + index)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <MathDisplay
                        content={answer.text}
                        className={`${
                          answer.isCorrect ? "text-green-800" : "text-gray-800"
                        }`}
                      />
                    </div>
                    {answer.isCorrect && (
                      <div className="flex-shrink-0 ml-3">
                        <Badge className="bg-green-100 text-green-800">
                          Correct
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation */}
            {(question as any).explanation && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Explanation
                </h3>
                <div className="prose max-w-none text-gray-700">
                  <MathDisplay
                    content={(question as any).explanation}
                    className="text-gray-700"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close Preview</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionPreview;
