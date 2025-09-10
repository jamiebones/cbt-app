import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, CheckCircle } from "lucide-react";
import { Question } from "@/types";

interface QuestionStatsProps {
  questions: Question[];
}

const QuestionStats: React.FC<QuestionStatsProps> = ({ questions }) => {
  return (
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
              <p className="text-sm text-gray-600">Easy</p>
              <p className="text-2xl font-bold">
                {
                  questions.filter((q) => (q as any).difficulty === "easy")
                    .length
                }
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Medium</p>
              <p className="text-2xl font-bold">
                {
                  questions.filter((q) => (q as any).difficulty === "medium")
                    .length
                }
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-yellow-500" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Hard</p>
              <p className="text-2xl font-bold">
                {
                  questions.filter((q) => (q as any).difficulty === "hard")
                    .length
                }
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-red-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuestionStats;
