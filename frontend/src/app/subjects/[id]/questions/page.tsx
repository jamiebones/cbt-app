"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
import { ArrowLeft, Plus, Trash2, FileText, XCircle } from "lucide-react";
import { Subject, Question, QuestionFormData } from "@/types";
import { subjectService } from "@/services/subject";
import { questionService } from "@/services/question";
import { mediaService } from "@/services/mediaService";
import QuestionPreview from "@/components/QuestionPreview";
import "katex/dist/katex.min.css";
import QuestionForm from "./QuestionForm";
import QuestionListItem from "./QuestionListItem";
import QuestionStats from "./QuestionStats";
import QuestionFilters from "./QuestionFilters";
import { config, USER_ROLES } from "@/utils/config";
import { useAuth } from "@/contexts/AuthContext";
import ExcelImportPanel from "@/components/ExcelImportPanel";

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
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<
    string | null
  >(null);
  const [formValidationError, setFormValidationError] = useState<string | null>(
    null
  );
  const [showExcelImport, setShowExcelImport] = useState(false);
  // Use auth context instead of manual localStorage parsing
  const { state: authState } = useAuth();
  const currentUserRole = authState.user?.user?.role || null;

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
    imagePath: "",
    audioPath: "",
    videoPath: "",
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

  // Removed localStorage role loading: role now derived from AuthContext

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
      // Validation: multiple_choice must have exactly one correct answer
      if (formData.type === "multiple_choice") {
        const validAnswers = formData.answers.filter(
          (a) => a.text.trim() !== ""
        );
        const correctCount = validAnswers.filter((a) => a.isCorrect).length;
        if (correctCount !== 1) {
          setFormValidationError(
            correctCount === 0
              ? "Select one correct answer before saving."
              : "Only one answer can be marked correct."
          );
          return;
        }
      }
      // True/False: exactly one answer should be correct if two present
      if (formData.type === "true_false") {
        const nonEmpty = formData.answers.filter((a) => a.text.trim() !== "");
        if (nonEmpty.length === 2) {
          const correctCount = nonEmpty.filter((a) => a.isCorrect).length;
          if (correctCount !== 1) {
            setFormValidationError(
              "Mark exactly one option as correct for True/False."
            );
            return;
          }
        }
      }
      setFormValidationError(null);
      // Generate answer IDs (A, B, C, D, etc.)
      const answersWithIds = formData.answers
        .filter((answer) => answer.text.trim() !== "")
        .map((answer, index) => ({
          id: String.fromCharCode(65 + index), // A, B, C, D...
          text: answer.text,
          isCorrect: answer.isCorrect,
        }));

      const mediaPaths = await uploadSelectedMedia();
      const questionData = {
        questionText: formData.text,
        explanation: formData.explanation,
        type: formData.type,
        answers: answersWithIds,
        subject: formData.subject,
        difficulty: formData.difficulty,
        points: formData.points,
        keywords: formData.keywords,
        media: mediaPaths,
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
      if (formData.type === "multiple_choice") {
        const validAnswers = formData.answers.filter(
          (a) => a.text.trim() !== ""
        );
        const correctCount = validAnswers.filter((a) => a.isCorrect).length;
        if (correctCount !== 1) {
          setFormValidationError(
            correctCount === 0
              ? "Select one correct answer before saving."
              : "Only one answer can be marked correct."
          );
          return;
        }
      }
      if (formData.type === "true_false") {
        const nonEmpty = formData.answers.filter((a) => a.text.trim() !== "");
        if (nonEmpty.length === 2) {
          const correctCount = nonEmpty.filter((a) => a.isCorrect).length;
          if (correctCount !== 1) {
            setFormValidationError(
              "Mark exactly one option as correct for True/False."
            );
            return;
          }
        }
      }
      setFormValidationError(null);
      // Generate answer IDs (A, B, C, D, etc.)
      const answersWithIds = formData.answers
        .filter((answer) => answer.text.trim() !== "")
        .map((answer, index) => ({
          id: String.fromCharCode(65 + index), // A, B, C, D...
          text: answer.text,
          isCorrect: answer.isCorrect,
        }));

      const mediaPaths = await uploadSelectedMedia();
      const questionData = {
        questionText: formData.text,
        explanation: formData.explanation,
        type: formData.type,
        answers: answersWithIds,
        subject: formData.subject,
        difficulty: formData.difficulty,
        points: formData.points,
        keywords: formData.keywords,
        media: mediaPaths,
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
      setDeleteConfirmationId(null);
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
      imagePath: "",
      audioPath: "",
      videoPath: "",
      media: {
        image: null,
        audio: null,
        video: null,
      },
    });
    setTempMedia({ image: null, audio: null, video: null });
    setMediaProgress({ image: 0, audio: 0, video: 0 });
    setMediaError(null);
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
    const media = (question as any).media || {};
   
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
      imagePath: resolveMediaPath(media.image),
      audioPath: resolveMediaPath(media.audio),
      videoPath: resolveMediaPath(media.video),
      media: {
        image: media.image || null,
        audio: media.audio || null,
        video: media.video || null,
      },
    });
  };

  // Temporary selected files & progress state (not uploaded yet)
  const [tempMedia, setTempMedia] = useState<{
    image: File | null;
    audio: File | null;
    video: File | null;
  }>({ image: null, audio: null, video: null });
  const [mediaProgress, setMediaProgress] = useState<{
    image: number;
    audio: number;
    video: number;
  }>({ image: 0, audio: 0, video: 0 });
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const handleSelectMedia = (
    type: "image" | "audio" | "video",
    file: File | null
  ) => {
    setTempMedia((prev) => ({ ...prev, [type]: file }));
    setMediaProgress((prev) => ({ ...prev, [type]: 0 }));
    if (file) setMediaError(null);
  };

  const uploadSelectedMedia = async () => {
    const result: any = { ...formData.media };
    setMediaError(null);
    const mapping: Array<{
      type: "image" | "audio" | "video";
      uploader: () => Promise<string>;
    }> = [];
    if (tempMedia.image)
      mapping.push({
        type: "image",
        uploader: async () =>
          (
            await mediaService.uploadImage(tempMedia.image!, {
              onProgress: (p) =>
                setMediaProgress((pr) => ({ ...pr, image: p })),
            })
          ).filePath,
      });
    if (tempMedia.audio)
      mapping.push({
        type: "audio",
        uploader: async () =>
          (
            await mediaService.uploadAudio(tempMedia.audio!, (p) =>
              setMediaProgress((pr) => ({ ...pr, audio: p }))
            )
          ).filePath,
      });
    if (tempMedia.video)
      mapping.push({
        type: "video",
        uploader: async () =>
          (
            await mediaService.uploadVideo(tempMedia.video!, {
              onProgress: (p) =>
                setMediaProgress((pr) => ({ ...pr, video: p })),
            })
          ).filePath,
      });
    if (mapping.length === 0) return result; // nothing to upload
    setMediaUploading(true);
    try {
      await Promise.all(
        mapping.map(async (m) => {
          const path = await m.uploader();
          result[m.type] = path;
        })
      );
    } catch (e: any) {
      setMediaError(e.message || "Media upload failed");
      throw e;
    } finally {
      setMediaUploading(false);
    }
    return result;
  };

  const resolveMediaPath = (p?: string | null) => {
    if (!p) return "";
    if (p.startsWith("http://") || p.startsWith("https://")) return p;
    // ensure single slash join
    return `${config.apiUrl.replace(/\/$/, "")}${
      p.startsWith("/") ? "" : "/"
    }${p}`;
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
        {/* Hidden hybrid media state debug (could remove in production) */}
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
       
          <div className="flex gap-2">
            {currentUserRole === USER_ROLES.TEST_CENTER_OWNER && (
              <Button
                variant={showExcelImport ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowExcelImport((v) => !v)}
              >
                <FileText className="h-4 w-4 mr-2" />
                {showExcelImport ? "Hide Import" : "Excel Import"}
              </Button>
            )}
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
                  formValidationError={formValidationError}
                  tempMedia={tempMedia}
                  mediaProgress={mediaProgress}
                  mediaUploading={mediaUploading}
                  mediaError={mediaError}
                  onSelectMedia={handleSelectMedia}
                  isEditing={false}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {showExcelImport && (
          <div className="mb-6">
            <ExcelImportPanel
              subjectCode={subject.code}
              currentUserRole={currentUserRole || undefined}
              onImported={() => {
                fetchSubjectAndQuestions();
              }}
              onClose={() => setShowExcelImport(false)}
            />
          </div>
        )}

        {/* Stats Cards */}
        <QuestionStats questions={questions} />

        {/* Filters and Search */}
        <QuestionFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          difficultyFilter={difficultyFilter}
          onDifficultyFilterChange={setDifficultyFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
        />

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
              <QuestionListItem
                key={question.id}
                question={question}
                isSelected={selectedQuestions.includes(question.id)}
                onSelect={(checked) => {
                  if (checked) {
                    setSelectedQuestions([...selectedQuestions, question.id]);
                  } else {
                    setSelectedQuestions(
                      selectedQuestions.filter((id) => id !== question.id)
                    );
                  }
                }}
                onEdit={() => startEdit(question)}
                onPreview={() => setPreviewQuestion(question)}
                onDelete={() => handleDeleteQuestion(question.id)}
                deleteConfirmationId={deleteConfirmationId}
                setDeleteConfirmationId={setDeleteConfirmationId}
              />
            ))
          )}
        </div>

        {/* Question Preview Dialog */}
        <QuestionPreview
          question={previewQuestion}
          isOpen={previewQuestion !== null}
          onClose={() => setPreviewQuestion(null)}
        />

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
                formValidationError={formValidationError}
                tempMedia={tempMedia}
                mediaProgress={mediaProgress}
                mediaUploading={mediaUploading}
                mediaError={mediaError}
                onSelectMedia={handleSelectMedia}
                isEditing={true}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </ProtectedRoute>
  );
};

// Removed HybridMediaPreview - previews handled directly within QuestionForm

export default SubjectQuestionsPage;
