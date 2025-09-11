"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { testQuestionsService, AutoAddPayload } from "@/services/testQuestions";
import { questionService } from "@/services/question";
import { testService } from "@/services/test";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import MathDisplay from "@/components/MathDisplay";
import { Question } from "@/types";

interface Props {
  testId: string;
}

const TestQuestionManager: React.FC<Props> = ({ testId }) => {
  const [tab, setTab] = useState<"manual" | "auto" | "excel" | "remove">(
    "manual"
  );
  const [testSubjectId, setTestSubjectId] = useState<string | undefined>(
    undefined
  );
  const [testSubjectName, setTestSubjectName] = useState<string>("");
  const [query, setQuery] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | null;
    text: string;
  } | null>(null);
  const [totalRequired, setTotalRequired] = useState<number>(0);
  const [inTestCount, setInTestCount] = useState<number>(0);
  const [inTestQuestions, setInTestQuestions] = useState<Question[]>([]);

  // Auto
  const [autoSubjects, setAutoSubjects] = useState<string[]>([]);
  const [autoCount, setAutoCount] = useState<number>(10);
  const [dist, setDist] = useState<{
    easy: number;
    medium: number;
    hard: number;
  }>({ easy: 0, medium: 100, hard: 0 });

  const getQId = (q: any) => q._id || q.id;
  const toggleCheck = (id: string) =>
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  const selectedIds = useMemo(
    () => Object.keys(checked).filter((id) => checked[id]),
    [checked]
  );

  const refreshInTest = useCallback(async () => {
    try {
      const current = await testQuestionsService.getTestQuestions(testId);
      setInTestQuestions(current);
      setInTestCount(current.length || 0);
    } catch {}
  }, [testId]);

  // Load test details
  useEffect(() => {
    (async () => {
      try {
        const t = await testService.getTestById(testId);
        let subjId: string | undefined;
        let subjName = "";
        let subjCode = "";
        const subj: any = (t as any).subject;
        if (subj && typeof subj === "object") {
          subjId = subj._id || subj.id;
          subjName = subj.name || "";
          subjCode = subj.code || "";
        } else if (typeof subj === "string") {
          subjId = subj;
        }
        setTestSubjectId(subjId);
        setTestSubjectName(subjName);
        setTotalRequired(
          (t as any).totalQuestions ||
            (t as any)?.autoSelectionConfig?.questionCount ||
            0
        );
        if (subjId) setAutoSubjects([subjId]);
        if (subjCode) setSubjectCode((prev) => prev || subjCode);
        await refreshInTest();
      } catch (e: any) {
        setMessage({ type: "error", text: e.message || "Failed to load test" });
      }
    })();
  }, [testId, refreshInTest]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      if (!testSubjectId) {
        setQuestions([]);
        return;
      }
      let list: Question[] = [];
      if (query)
        list = await questionService.searchQuestions(query, testSubjectId);
      else list = await questionService.getQuestionsBySubject(testSubjectId);
      setQuestions(list);
    } catch (e: any) {
      setMessage({
        type: "error",
        text: e.message || "Failed to load questions",
      });
    } finally {
      setLoading(false);
    }
  }, [testSubjectId, query]);

  useEffect(() => {
    if (testSubjectId) loadQuestions();
  }, [testSubjectId, loadQuestions]);
  useEffect(() => {
    if (tab === "remove") refreshInTest();
  }, [tab, refreshInTest]);

  const handleAddSelected = async () => {
    if (!selectedIds.length) return;
    setLoading(true);
    try {
      const res = await testQuestionsService.addManual(testId, {
        questionIds: selectedIds,
      });
      setMessage({ type: "success", text: `Added ${res.added} question(s)` });
      setChecked({});
      setInTestCount((prev) => prev + (res.added || 0));
      if (tab === "remove") await refreshInTest();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Add failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAdd = async () => {
    if (!autoSubjects.length || autoCount <= 0) return;
    setLoading(true);
    try {
      const payload: AutoAddPayload = {
        subjects: autoSubjects,
        count: autoCount,
        difficultyDistribution: dist,
      };
      const res = await testQuestionsService.addAuto(testId, payload);
      setMessage({
        type: "success",
        text: `Auto-added ${res.added} question(s)`,
      });
      setInTestCount((prev) => prev + (res.added || 0));
      if (tab === "remove") await refreshInTest();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Auto add failed" });
    } finally {
      setLoading(false);
    }
  };

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [subjectCode, setSubjectCode] = useState("");
  const handleExcelImport = async () => {
    if (!excelFile || !subjectCode) return;
    setLoading(true);
    try {
      const res = await testQuestionsService.importExcelToTest(
        testId,
        excelFile,
        subjectCode
      );
      const added = res.attachResult?.added || 0;
      setMessage({ type: "success", text: `Imported, added ${added} to test` });
      setExcelFile(null);
      setInTestCount((prev) => prev + added);
      if (tab === "remove") await refreshInTest();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Excel import failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromTest = async (qid: string) => {
    setLoading(true);
    try {
      await testQuestionsService.removeFromTest(testId, qid);
      setInTestQuestions((prev) => prev.filter((q) => getQId(q) !== qid));
      setInTestCount((prev) => Math.max(0, prev - 1));
      setMessage({ type: "success", text: "Removed from test" });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Failed to remove" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Questions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 text-sm text-gray-700 flex flex-wrap gap-4">
          <span>
            In test: <span className="font-medium">{inTestCount}</span>
          </span>
          <span>
            Required: <span className="font-medium">{totalRequired}</span>
          </span>
          <span>
            Needed to complete: {Math.max(0, totalRequired - inTestCount)}
          </span>
        </div>
        {message?.text && (
          <div className="mb-4">
            <Alert
              variant={message.type === "error" ? "destructive" : "default"}
            >
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="mb-4 flex gap-2">
          <Button
            variant={tab === "manual" ? "default" : "outline"}
            onClick={() => setTab("manual")}
          >
            Manual
          </Button>
          <Button
            variant={tab === "auto" ? "default" : "outline"}
            onClick={() => setTab("auto")}
          >
            Auto
          </Button>
          <Button
            variant={tab === "excel" ? "default" : "outline"}
            onClick={() => setTab("excel")}
          >
            Excel
          </Button>
          <Button
            variant={tab === "remove" ? "default" : "outline"}
            onClick={() => setTab("remove")}
          >
            Remove
          </Button>
        </div>

        {tab === "manual" && (
          <div className="space-y-4">
            <div className="flex gap-2 items-end">
              <div>
                <div className="text-sm text-gray-600 mb-1">Subject</div>
                <div className="text-sm font-medium">
                  {testSubjectName || "Subject"}
                </div>
              </div>
              <Input
                placeholder="Search questions"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button
                disabled={loading || !testSubjectId}
                onClick={loadQuestions}
              >
                Refresh
              </Button>
            </div>
            <div className="border rounded-md divide-y max-h-96 overflow-auto">
              {questions.map((q) => {
                const id = getQId(q);
                return (
                  <label
                    key={id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={!!checked[id]}
                      onChange={() => toggleCheck(id)}
                    />
                    <div className="flex-1">
                      <MathDisplay
                        className="font-medium"
                        content={q.questionText || (q as any).text || ""}
                      />
                      <div className="text-xs text-gray-500 capitalize">
                        {q.type} · {q.difficulty}
                      </div>
                    </div>
                  </label>
                );
              })}
              {!questions.length && (
                <div className="p-4 text-sm text-gray-500">No questions</div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Selected: {selectedIds.length}
              </div>
              <Button
                onClick={handleAddSelected}
                disabled={!selectedIds.length || loading}
              >
                Add selected
              </Button>
            </div>
          </div>
        )}

        {tab === "auto" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="text-sm text-gray-600 mb-1">Subject</div>
                <div className="text-sm font-medium">
                  {testSubjectName || "Subject"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Count</div>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={autoCount}
                  onChange={(e) =>
                    setAutoCount(parseInt(e.target.value || "0", 10))
                  }
                />
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">
                  Difficulty distribution (must sum to 100 or 0)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-xs">Easy</div>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={dist.easy}
                      onChange={(e) =>
                        setDist((prev) => ({
                          ...prev,
                          easy: parseInt(e.target.value || "0", 10),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <div className="text-xs">Medium</div>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={dist.medium}
                      onChange={(e) =>
                        setDist((prev) => ({
                          ...prev,
                          medium: parseInt(e.target.value || "0", 10),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <div className="text-xs">Hard</div>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={dist.hard}
                      onChange={(e) =>
                        setDist((prev) => ({
                          ...prev,
                          hard: parseInt(e.target.value || "0", 10),
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleAutoAdd}
                disabled={loading || !testSubjectId || autoCount <= 0}
              >
                Auto-add
              </Button>
            </div>
          </div>
        )}

        {tab === "excel" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <div className="text-sm text-gray-600 mb-1">Subject Code</div>
                <Input
                  placeholder="e.g. CHM 102"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  readOnly={!!subjectCode}
                />
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Excel File</div>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleExcelImport}
                  disabled={loading || !excelFile || !subjectCode}
                >
                  Upload & Attach
                </Button>
              </div>
            </div>
          </div>
        )}

        {tab === "remove" && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              These are the questions currently included in this test.
            </div>
            <div className="border rounded-md divide-y max-h-96 overflow-auto">
              {inTestQuestions.map((q) => {
                const id = getQId(q);
                return (
                  <div key={id} className="flex items-center gap-3 p-3">
                    <div className="flex-1">
                      <MathDisplay
                        className="font-medium"
                        content={q.questionText || (q as any).text || ""}
                      />
                      <div className="text-xs text-gray-500 capitalize">
                        {q.type} · {q.difficulty}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      disabled={loading}
                      onClick={() => handleRemoveFromTest(id)}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
              {!inTestQuestions.length && (
                <div className="p-4 text-sm text-gray-500">
                  No questions in test
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestQuestionManager;
