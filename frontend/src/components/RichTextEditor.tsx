"use client";

import React from "react";
import dynamic from "next/dynamic";
import LatexGuide from "./LatexGuide";
import styles from "./RichTextEditor.module.css";

// Dynamically import the actual editor component with SSR disabled
const RichTextEditorClient = dynamic(() => import("./RichTextEditorClient"), {
  ssr: false,
  loading: () => (
    <div className={styles.richTextEditor}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Rich Text Editor with Math Support
          </span>
          <LatexGuide />
        </div>
        <span className="text-xs text-gray-500">
          Math support available via LaTeX guide
        </span>
      </div>
      <div className="border rounded-md p-4 bg-gray-50">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-5/6"></div>
        </div>
        <p className="text-sm text-gray-500 mt-2">Loading editor...</p>
      </div>
    </div>
  ),
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = (props) => {
  return <RichTextEditorClient {...props} />;
};
