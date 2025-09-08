"use client";

import React from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import katex from "katex";
import "katex/dist/katex.min.css";
import LatexGuide from "./LatexGuide";
import styles from "./RichTextEditor.module.css";

// Make KaTeX available globally for the math plugin
if (typeof window !== "undefined") {
  (window as any).katex = katex;
}

// CKEditor configuration with basic setup (no math plugin for now)
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
          Math support available via LaTeX guide
        </span>
      </div>
      <CKEditor
        editor={ClassicEditor as any}
        config={editorConfiguration as any}
        data={value}
        onChange={(event: any, editor: any) => {
          const data = editor.getData();
          onChange(data);
        }}
        onReady={(editor: any) => {
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
        }}
      />
    </div>
  );
};

export default RichTextEditorClient;
