"use client";

import React from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import CustomEditor from "../lib/ckeditor-build";
import katex from "katex";
import "katex/dist/katex.min.css";
import LatexGuide from "./LatexGuide";
import styles from "./RichTextEditor.module.css";
import { addCustomMathButton } from "../lib/custom-button";
import { renderMathInEditor } from "../lib/math-renderer";
import "./math-editor.css";
import "./math-preview.css";

// Make KaTeX available globally for the math plugin
if (typeof window !== "undefined") {
  (window as any).katex = katex;
}

// CKEditor configuration with standard toolbar
const editorConfiguration = {
  toolbar: {
    items: [
      "heading",
      "|",
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "|",
      "bulletedList",
      "numberedList",
      "|",
      "indent",
      "outdent",
      "|",
      "link",
      "blockQuote",
      "|",
      "undo",
      "redo",
    ],
  },
  language: "en",
};

interface RichTextEditorClientProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

const RichTextEditorClient: React.FC<RichTextEditorClientProps> = ({
  value,
  onChange,
  placeholder = "Enter your content here...",
  height = "200px",
}) => {
  const [showMathDialog, setShowMathDialog] = React.useState(false);
  const [mathExpression, setMathExpression] = React.useState("");
  const editorRef = React.useRef<any>(null);

  // Update preview whenever math expression changes
  React.useEffect(() => {
    const previewContainer = document.getElementById("math-preview-container");
    if (previewContainer && mathExpression.trim()) {
      try {
        previewContainer.innerHTML = "";
        katex.render(mathExpression, previewContainer, {
          throwOnError: false,
          displayMode: true,
        });
      } catch (error) {
        previewContainer.innerHTML =
          '<span class="text-red-500">Invalid LaTeX expression</span>';
        console.error("Error rendering preview:", error);
      }
    } else if (previewContainer) {
      previewContainer.innerHTML =
        '<span class="text-gray-400 text-sm">LaTeX preview will appear here...</span>';
    }
  }, [mathExpression]);

  const insertMathExpression = () => {
    if (mathExpression.trim() && editorRef.current) {
      const editor = editorRef.current;

      // Just use simple spans without LaTeX delimiters for editor insertion
      const mathHtml = `<span class="math-inline">${mathExpression}</span>`;

      // Insert at cursor position using CKEditor's API
      editor.model.change((writer: any) => {
        const insertPosition =
          editor.model.document.selection.getFirstPosition();
        const viewFragment = editor.data.processor.toView(mathHtml);
        const modelFragment = editor.data.toModel(viewFragment);

        writer.insert(modelFragment, insertPosition);
      });

      // Add preview of the rendered math below the input
      const previewContainer = document.getElementById(
        "math-preview-container"
      );
      if (previewContainer) {
        try {
          previewContainer.innerHTML = "";
          katex.render(mathExpression, previewContainer, {
            throwOnError: false,
            displayMode: true,
          });
        } catch (error) {
          console.error("Error rendering preview:", error);
        }
      }

      // Force rendering of math expressions after insertion
      setTimeout(() => {
        console.log("Attempting to render math expressions...");
        renderMathInEditor(editor, katex);
      }, 200);

      setMathExpression("");
      setShowMathDialog(false);
    }
  };

  return (
    <div
      className={styles.richTextEditor}
      style={{ "--editor-height": height } as React.CSSProperties}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Rich Text Editor</span>
          <LatexGuide />
        </div>
        <span className="text-xs text-gray-500">
          Math equations supported with KaTeX (Ctrl+M)
        </span>
      </div>

      {/* Math Input Dialog */}
      {showMathDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Insert Math Expression
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Use keyboard shortcut{" "}
              <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+M</kbd> to
              open this dialog quickly.
            </p>
            <input
              type="text"
              value={mathExpression}
              onChange={(e) => setMathExpression(e.target.value)}
              placeholder="Enter LaTeX expression (e.g., \frac{a}{b})"
              className="w-full p-2 border border-gray-300 rounded mb-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  insertMathExpression();
                }
              }}
            />
            <div
              id="math-preview-container"
              className="p-3 mb-4 bg-gray-50 rounded border border-gray-200 flex justify-center items-center min-h-[50px]"
            >
              <span className="text-gray-400 text-sm">
                LaTeX preview will appear here...
              </span>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowMathDialog(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={insertMathExpression}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      <CKEditor
        editor={CustomEditor as any}
        config={editorConfiguration as any}
        data={value}
        onChange={(event: any, editor: any) => {
          const data = editor.getData();
          onChange(data);
        }}
        onReady={(editor: any) => {
          // Store editor reference
          editorRef.current = editor;

          // Set placeholder
          if (placeholder) {
            editor.editing.view.document.getRoot().placeholder = placeholder;
          }

          // Set custom height
          editor.editing.view.change((writer: any) => {
            writer.setStyle(
              "min-height",
              height,
              editor.editing.view.document.getRoot()
            );
          });

          // Add keyboard shortcut for math (Ctrl+M)
          editor.keystrokes.set("Ctrl+M", () => {
            setShowMathDialog(true);
          });

          // Add custom math button to toolbar
          addCustomMathButton(editor, () => setShowMathDialog(true));

          // Setup math rendering
          renderMathInEditor(editor, katex);
        }}
      />
    </div>
  );
};

export default RichTextEditorClient;
