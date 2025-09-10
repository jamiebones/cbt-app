"use client";
import React, { useState } from "react";
import {
  excelImportService,
  ExcelPreviewResult,
  ExcelImportResult,
} from "@/services/excelImport";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  FileDown,
} from "lucide-react";
import { FEATURES, USER_ROLES } from "@/utils/config";

interface ExcelImportPanelProps {
  subjectCode: string;
  onClose?: () => void;
  onImported?: (result: ExcelImportResult) => void;
  currentUserRole?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ExcelImportPanel: React.FC<ExcelImportPanelProps> = ({
  subjectCode,
  onClose,
  onImported,
  currentUserRole,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ExcelPreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ExcelImportResult | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [subject, setSubject] = useState(subjectCode);

  const isOwner = currentUserRole === USER_ROLES.TEST_CENTER_OWNER;

  if (!FEATURES.EXCEL_IMPORT) {
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setPreview(null);
    setImportResult(null);
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/\.(xlsx|xls)$/i.test(f.name)) {
      setError("Please select a valid Excel file (.xlsx or .xls)");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("File exceeds 10MB size limit");
      return;
    }
    setFile(f);
  };

  const doPreview = async () => {
    if (!file) return;
    try {
      setLoading(true);
      setError(null);
      const result = await excelImportService.previewImport(file, subject);
      setPreview(result);
    } catch (e: any) {
      setError(e.message || "Preview failed");
    } finally {
      setLoading(false);
    }
  };

  const doImport = async () => {
    if (!file) return;
    try {
      setImporting(true);
      setError(null);
      const result = await excelImportService.importQuestions(file, subject);
      setImportResult(result);
      if (result.success && onImported) onImported(result);
    } catch (e: any) {
      setError(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      setError(null);
      const blob = await excelImportService.downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "question_import_template.xlsx";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || "Failed to download template");
    }
  };

  return (
    <Card className="border-2">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-green-600" />
          <CardTitle>Excel Question Import</CardTitle>
        </div>
        <p className="text-sm text-gray-600">
          Upload an Excel file to bulk import questions for subject code{" "}
          <span className="font-semibold">{subject}</span>.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isOwner && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <p>
              Only test center owners can perform the import. You can still
              download the template.
            </p>
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={downloadTemplate}
            className="flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" /> Template
          </Button>
          <label className="inline-flex items-center px-3 py-2 border rounded cursor-pointer bg-white hover:bg-gray-50 text-sm font-medium gap-2">
            <UploadCloud className="h-4 w-4" />
            <span>{file ? "Change File" : "Select Excel File"}</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            disabled={!file || loading}
            onClick={doPreview}
          >
            Preview
          </Button>
          <Button type="button" onClick={onClose} variant="ghost">
            Close
          </Button>
        </div>
        {file && (
          <div className="text-xs text-gray-600">
            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {loading && (
          <div className="text-xs text-gray-500">Processing preview...</div>
        )}
        {preview && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" /> Preview
              Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-gray-50 rounded border">
                <div className="font-medium">Rows In File</div>
                <div>{preview.preview.totalRowsInFile}</div>
              </div>
              <div className="p-2 bg-gray-50 rounded border">
                <div className="font-medium">Previewed</div>
                <div>{preview.preview.previewRows}</div>
              </div>
              <div className="p-2 bg-green-50 rounded border border-green-200">
                <div className="font-medium">Valid</div>
                <div>{preview.preview.validCount}</div>
              </div>
              <div className="p-2 bg-red-50 rounded border border-red-200">
                <div className="font-medium">Invalid</div>
                <div>{preview.preview.invalidCount}</div>
              </div>
            </div>
            {!preview.preview.subscriptionAllowed && (
              <div className="p-2 text-xs bg-yellow-50 border border-yellow-200 rounded text-yellow-700">
                {preview.preview.subscriptionMessage ||
                  "Subscription limit reached"}
              </div>
            )}
            {preview.errors && preview.errors.length > 0 && (
              <div className="text-xs">
                <div className="font-medium mb-1">
                  Errors (first {preview.errors.length} shown)
                </div>
                <ul className="list-disc list-inside space-y-0.5 max-h-32 overflow-auto">
                  {preview.errors.map((e, i) => (
                    <li key={i} className="text-red-600">
                      Row {e.row || "?"}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {preview.warnings && preview.warnings.length > 0 && (
              <div className="text-xs">
                <div className="font-medium mb-1">
                  Warnings (first {preview.warnings.length} shown)
                </div>
                <ul className="list-disc list-inside space-y-0.5 max-h-24 overflow-auto">
                  {preview.warnings.map((w, i) => (
                    <li key={i} className="text-yellow-700">
                      Row {w.row || "?"}: {w.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end">
              <Button
                disabled={!isOwner || !preview.preview.validCount || importing}
                onClick={doImport}
              >
                {importing ? "Importing..." : "Import Questions"}
              </Button>
            </div>
          </div>
        )}
        {importResult && (
          <div className="space-y-2 border-t pt-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" /> Import Result
            </h4>
            <div className="text-xs grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="p-2 bg-gray-50 rounded border">
                <div className="font-medium">Total Rows</div>
                <div>{importResult.summary?.totalRows}</div>
              </div>
              <div className="p-2 bg-green-50 rounded border border-green-200">
                <div className="font-medium">Imported</div>
                <div>{importResult.summary?.successCount}</div>
              </div>
              <div className="p-2 bg-red-50 rounded border border-red-200">
                <div className="font-medium">Errors</div>
                <div>{importResult.summary?.errorCount}</div>
              </div>
              <div className="p-2 bg-gray-50 rounded border">
                <div className="font-medium">Valid</div>
                <div>{importResult.summary?.validCount}</div>
              </div>
              <div className="p-2 bg-gray-50 rounded border">
                <div className="font-medium">Invalid</div>
                <div>{importResult.summary?.invalidCount}</div>
              </div>
            </div>
            {importResult.validationErrors &&
              importResult.validationErrors.length > 0 && (
                <div className="text-xs">
                  <div className="font-medium mb-1">Validation Errors</div>
                  <ul className="list-disc list-inside space-y-0.5 max-h-32 overflow-auto">
                    {importResult.validationErrors.slice(0, 20).map((e, i) => (
                      <li key={i} className="text-red-600">
                        Row {e.row || "?"}: {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            {importResult.batchId && (
              <div className="text-xs text-gray-600">
                Batch ID: {importResult.batchId}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setImportResult(null);
                }}
              >
                New Import
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExcelImportPanel;
