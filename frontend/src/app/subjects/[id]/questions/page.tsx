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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Search,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";
import { Subject, Question, QuestionFormData } from "@/types";
import { subjectService } from "@/services/subject";
import { questionService } from "@/services/question";
import { RichTextEditor } from "@/components/RichTextEditor";

const SubjectQuestionsPage = () => {
  const params = useParams();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);

  const subjectId = params.id as string;

  // Form state for creating/editing questions
  const [formData, setFormData] = useState<QuestionFormData>({
    text: "",
    explanation: "",
    type: "multiple_choice",
    answers: [{ text: "", isCorrect: false }],
    subject: subjectId,
    difficulty: "medium",
    points: 1,
    correctAnswer: "",
    keywords: [],
    media: {
      image: null,
      audio: null,
      video: null,
    },
  });

  useEffect(() => {
    if (subjectId) {
      fetchSubjectAndQuestions();
    }
  }, [subjectId]);

  const fetchSubjectAndQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const [subjectData, questionsData] = await Promise.all([
        subjectService.getSubjectById(subjectId),
        questionService.getQuestionsBySubject(subjectId),
      ]);

      setSubject(subjectData);
      setQuestions(questionsData);
    } catch (err: any) {
      setError(err.message || "Failed to load subject and questions");
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter((question) => {
    const matchesSearch = question?.questionText
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesDifficulty =
      difficultyFilter === "all" || question.difficulty === difficultyFilter;
    const matchesType = typeFilter === "all" || question.type === typeFilter;

    return matchesSearch && matchesDifficulty && matchesType;
  });

  const handleCreateQuestion = async () => {
    try {
      // Generate answer IDs (A, B, C, D, etc.)
      const answersWithIds = formData.answers
        .filter((answer) => answer.text.trim() !== "")
        .map((answer, index) => ({
          id: String.fromCharCode(65 + index), // A, B, C, D...
          text: answer.text,
          isCorrect: answer.isCorrect,
        }));

      const questionData = {
        questionText: formData.text,
        explanation: formData.explanation,
        type: formData.type,
        answers: answersWithIds,
        subject: formData.subject,
        difficulty: formData.difficulty,
        points: formData.points,
        keywords: formData.keywords,
        media: formData.media,
      };

      await questionService.createQuestion(questionData);
      setIsCreateDialogOpen(false);
      resetForm();
      fetchSubjectAndQuestions();
    } catch (err: any) {
      setError(err.message || "Failed to create question");
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;

    try {
      // Generate answer IDs (A, B, C, D, etc.)
      const answersWithIds = formData.answers
        .filter((answer) => answer.text.trim() !== "")
        .map((answer, index) => ({
          id: String.fromCharCode(65 + index), // A, B, C, D...
          text: answer.text,
          isCorrect: answer.isCorrect,
        }));

      const questionData = {
        questionText: formData.text,
        explanation: formData.explanation,
        type: formData.type,
        answers: answersWithIds,
        subject: formData.subject,
        difficulty: formData.difficulty,
        points: formData.points,
        keywords: formData.keywords,
        media: formData.media,
      };

      await questionService.updateQuestion(editingQuestion.id, questionData);
      setEditingQuestion(null);
      resetForm();
      fetchSubjectAndQuestions();
    } catch (err: any) {
      setError(err.message || "Failed to update question");
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await questionService.deleteQuestion(questionId);
      fetchSubjectAndQuestions();
    } catch (err: any) {
      setError(err.message || "Failed to delete question");
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        selectedQuestions.map((id) => questionService.deleteQuestion(id))
      );
      setSelectedQuestions([]);
      fetchSubjectAndQuestions();
    } catch (err: any) {
      setError(err.message || "Failed to delete selected questions");
    }
  };

  const resetForm = () => {
    setFormData({
      text: "",
      explanation: "",
      type: "multiple_choice",
      answers: [{ text: "", isCorrect: false }],
      subject: subjectId,
      difficulty: "medium",
      points: 1,
      correctAnswer: "",
      keywords: [],
      media: {
        image: null,
        audio: null,
        video: null,
      },
    });
  };

  const addAnswer = () => {
    setFormData((prev) => ({
      ...prev,
      answers: [...prev.answers, { text: "", isCorrect: false }],
    }));
  };

  const updateAnswer = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      answers: prev.answers.map((answer, i) =>
        i === index ? { ...answer, [field]: value } : answer
      ),
    }));
  };

  const removeAnswer = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      answers: prev.answers.filter((_, i) => i !== index),
    }));
  };

  const startEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      text: question.questionText || question.text || "",
      explanation: (question as any).explanation || "",
      type: question.type,
      answers: question.answers?.map(({ text, isCorrect }) => ({
        text,
        isCorrect,
      })) || [{ text: "", isCorrect: false }],
      subject: question.subject as string,
      difficulty: (question as any).difficulty || "medium",
      points: (question as any).points || 1,
      correctAnswer: (question as any).correctAnswer || "",
      keywords: (question as any).keywords || [],
      media: {
        image: null,
        audio: null,
        video: null,
      },
    });
  };

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
    return (
      <ProtectedRoute requiredAuth={true}>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !subject) {
    return (
      <ProtectedRoute requiredAuth={true}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/subjects">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Subjects
              </Button>
            </Link>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-12 w-12 text-red-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {error || "Subject not found"}
              </h3>
              <p className="text-gray-500 text-center mb-4">
                The subject you're looking for doesn't exist or you don't have
                permission to view it.
              </p>
              <Link href="/subjects">
                <Button>Back to Subjects</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredAuth={true}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/subjects">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Subjects
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {subject.name} Questions
              </h1>
              <p className="text-gray-600 mt-1">
                Manage questions for {subject.name} ({subject.code})
              </p>
            </div>
          </div>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto bg-white border-2 border-gray-200 shadow-2xl">
              <DialogHeader>
                <DialogTitle>Create New Question</DialogTitle>
                <DialogDescription>
                  Add a new question to the {subject.name} question bank.
                </DialogDescription>
              </DialogHeader>
              <QuestionForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleCreateQuestion}
                onCancel={() => setIsCreateDialogOpen(false)}
                addAnswer={addAnswer}
                updateAnswer={updateAnswer}
                removeAnswer={removeAnswer}
              />
            </DialogContent>
          </Dialog>
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
                      questions.filter(
                        (q) => (q as any).difficulty === "medium"
                      ).length
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

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={difficultyFilter}
                onValueChange={setDifficultyFilter}
              >
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Question Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="multiple_choice">
                    Multiple Choice
                  </SelectItem>
                  <SelectItem value="true_false">True or False</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedQuestions.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedQuestions.length} question(s) selected
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedQuestions([])}
                  >
                    Clear Selection
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Selected
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Questions</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete{" "}
                          {selectedQuestions.length} selected question(s)? This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          {filteredQuestions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No questions found
                </h3>
                <p className="text-gray-500 text-center mb-4">
                  {searchTerm ||
                  difficultyFilter !== "all" ||
                  typeFilter !== "all"
                    ? "Try adjusting your filters or search terms."
                    : "Get started by adding your first question to this subject."}
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Question
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredQuestions.map((question) => (
              <Card
                key={question.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={selectedQuestions.includes(question.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedQuestions([
                                ...selectedQuestions,
                                question.id,
                              ]);
                            } else {
                              setSelectedQuestions(
                                selectedQuestions.filter(
                                  (id) => id !== question.id
                                )
                              );
                            }
                          }}
                        />
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
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {question.text}
                      </h3>
                      <div className="text-sm text-gray-600">
                        <p>{question.answers?.length || 0} answers</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(question)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit Dialog */}
        {editingQuestion && (
          <Dialog
            open={!!editingQuestion}
            onOpenChange={() => setEditingQuestion(null)}
          >
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto bg-white border-2 border-gray-200 shadow-2xl">
              <DialogHeader>
                <DialogTitle>Edit Question</DialogTitle>
                <DialogDescription>
                  Update the question details for {subject.name}.
                </DialogDescription>
              </DialogHeader>
              <QuestionForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleUpdateQuestion}
                onCancel={() => setEditingQuestion(null)}
                addAnswer={addAnswer}
                updateAnswer={updateAnswer}
                removeAnswer={removeAnswer}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </ProtectedRoute>
  );
};

// Question Form Component
const QuestionForm: React.FC<{
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
  addAnswer: () => void;
  updateAnswer: (index: number, field: string, value: any) => void;
  removeAnswer: (index: number) => void;
}> = ({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  addAnswer,
  updateAnswer,
  removeAnswer,
}) => {
  const [mediaFiles, setMediaFiles] = useState<{
    image: File | null;
    audio: File | null;
    video: File | null;
  }>({
    image: null,
    audio: null,
    video: null,
  });

  const handleFileChange = (
    type: "image" | "audio" | "video",
    file: File | null
  ) => {
    setMediaFiles((prev) => ({ ...prev, [type]: file }));
    setFormData((prev) => ({
      ...prev,
      media: {
        ...prev.media,
        [type]: file,
      },
    }));
  };

  const handleSubmit = () => {
    onSubmit();
  };

  return (
    <div className="space-y-8 p-2">
      <div>
        <Label htmlFor="question-text" className="text-base font-medium">
          Question Text *
        </Label>
        <div className="mt-2">
          <RichTextEditor
            value={formData.text}
            onChange={(value) => setFormData({ ...formData, text: value })}
            placeholder="Enter your question here. You can include mathematical equations using the math button in the toolbar."
            height="120px"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="question-explanation" className="text-base font-medium">
          Explanation (Optional)
        </Label>
        <div className="mt-2">
          <RichTextEditor
            value={formData.explanation || ""}
            onChange={(value) =>
              setFormData({ ...formData, explanation: value })
            }
            placeholder="Provide an explanation or additional context for this question. You can include mathematical equations and formatting."
            height="100px"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {formData.explanation
            ? formData.explanation.replace(/<[^>]*>/g, "").length
            : 0}
          /1000 characters
        </p>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <Label htmlFor="question-type" className="text-base font-medium">
            Question Type
          </Label>
          <Select
            value={formData.type}
            onValueChange={(value: "multiple_choice" | "true_false") =>
              setFormData({ ...formData, type: value })
            }
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
              <SelectItem value="true_false">True or False</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="difficulty" className="text-base font-medium">
            Difficulty
          </Label>
          <Select
            value={formData.difficulty}
            onValueChange={(value: "easy" | "medium" | "hard") =>
              setFormData({ ...formData, difficulty: value })
            }
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <Label htmlFor="points">Points *</Label>
          <Input
            id="points"
            type="number"
            min="1"
            max="100"
            value={formData.points}
            onChange={(e) =>
              setFormData({
                ...formData,
                points: parseInt(e.target.value) || 1,
              })
            }
            placeholder="1"
            required
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="keywords">Keywords (comma-separated)</Label>
          <Input
            id="keywords"
            value={formData.keywords?.join(", ") || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                keywords: e.target.value
                  .split(",")
                  .map((k) => k.trim())
                  .filter((k) => k.length > 0),
              })
            }
            placeholder="math, algebra, equations"
            className="mt-2"
          />
        </div>
      </div>

      {/* Media Upload Section */}
      <div className="space-y-6">
        <Label className="text-base font-medium">Media (Optional)</Label>

        <div>
          <Label htmlFor="media-upload" className="text-sm font-medium">
            Upload Media File
          </Label>
          <div className="mt-2 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
            <Input
              id="media-upload"
              type="file"
              accept="image/*,audio/*,video/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file) {
                  const fileType = file.type.split("/")[0]; // 'image', 'audio', or 'video'
                  handleFileChange(
                    fileType as "image" | "audio" | "video",
                    file
                  );
                } else {
                  // Clear all media files if no file selected
                  handleFileChange("image", null);
                  handleFileChange("audio", null);
                  handleFileChange("video", null);
                }
              }}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 w-full"
            />
            <p className="text-xs text-gray-500 mt-2">
              Supported formats: Images (JPG, PNG, GIF), Audio (MP3, WAV), Video
              (MP4, AVI)
            </p>

            {/* Display selected files */}
            {(mediaFiles.image || mediaFiles.audio || mediaFiles.video) && (
              <div className="mt-3 space-y-2">
                {mediaFiles.image && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <span className="font-medium">Image:</span>{" "}
                    {mediaFiles.image.name}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFileChange("image", null)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {mediaFiles.audio && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <span className="font-medium">Audio:</span>{" "}
                    {mediaFiles.audio.name}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFileChange("audio", null)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {mediaFiles.video && (
                  <div className="flex items-center gap-2 text-sm text-purple-600">
                    <span className="font-medium">Video:</span>{" "}
                    {mediaFiles.video.name}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFileChange("video", null)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <Label className="text-base font-medium">Answers</Label>
        <div className="space-y-3 mt-4">
          {formData.answers.map((answer: any, index: number) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
            >
              <Checkbox
                checked={answer.isCorrect}
                onCheckedChange={(checked) =>
                  updateAnswer(index, "isCorrect", checked)
                }
              />
              <div className="flex-1">
                <RichTextEditor
                  value={answer.text}
                  onChange={(value) => updateAnswer(index, "text", value)}
                  placeholder={`Enter answer ${
                    index + 1
                  }. You can include mathematical equations.`}
                  height="80px"
                />
              </div>
              {formData.answers.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeAnswer(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addAnswer}
          className="mt-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Answer
        </Button>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Save Question</Button>
      </div>
    </div>
  );
};

export default SubjectQuestionsPage;
