import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Edit, Eye, Trash2 } from "lucide-react";
import TruncatedQuestion from "@/components/TruncatedQuestion";
import { Question } from "@/types";

interface QuestionListItemProps {
  question: Question;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onEdit: () => void;
  onPreview: () => void;
  onDelete: () => void;
  deleteConfirmationId: string | null;
  setDeleteConfirmationId: (id: string | null) => void;
}

const QuestionListItem: React.FC<QuestionListItemProps> = ({
  question,
  isSelected,
  onSelect,
  onEdit,
  onPreview,
  onDelete,
  deleteConfirmationId,
  setDeleteConfirmationId,
}) => {
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

  const hasMedia = () => {
    const media = (question as any).media || {};
    return !!(media.imagePath || media.audioPath || media.videoPath);
  };

  const getMediaTypes = () => {
    const media = (question as any).media || {};
    const types: string[] = [];
    if (media.imagePath) types.push("Image");
    if (media.audioPath) types.push("Audio");
    if (media.videoPath) types.push("Video");
    return types;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox checked={isSelected} onCheckedChange={onSelect} />
              {getDifficultyBadge((question as any).difficulty || "medium")}
              <Badge variant="outline">
                {question.type === "multiple_choice"
                  ? "Multiple Choice"
                  : question.type === "true_false"
                  ? "True or False"
                  : question.type}
              </Badge>
              {hasMedia() && (
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-800"
                >
                  Media: {getMediaTypes().join(", ")}
                </Badge>
              )}
            </div>
            <div className="text-lg font-medium text-gray-900 mb-2">
              <TruncatedQuestion
                content={question.questionText || question.text || ""}
                maxLength={200}
              />
            </div>
            <div className="text-sm text-gray-600">
              <p>{question.answers?.length || 0} answers</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={onPreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <AlertDialog
              open={deleteConfirmationId === question.id}
              onOpenChange={(open) => {
                if (!open) setDeleteConfirmationId(null);
              }}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirmationId(question.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Question</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this question? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => setDeleteConfirmationId(null)}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestionListItem;
