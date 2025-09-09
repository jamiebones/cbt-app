"use client";

import React, { useState } from "react";
import MathDisplay from "./MathDisplay";
import "../styles/components/MathDisplay.css";

interface TruncatedQuestionProps {
  content: string;
  maxLength?: number;
  className?: string;
}

const TruncatedQuestion: React.FC<TruncatedQuestionProps> = ({
  content,
  maxLength = 150,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if the content might be truncated (this is an estimate since HTML tags make it hard to know exact length)
  const mightBeTruncated = content.length > maxLength;

  // Get display content
  const displayContent = isExpanded || !mightBeTruncated ? content : content;

  return (
    <div className={className}>
      <div
        className={`${
          mightBeTruncated && !isExpanded
            ? "truncated-question"
            : "question-expanded"
        }`}
      >
        <MathDisplay content={displayContent} />
      </div>

      {mightBeTruncated && (
        <div
          className="question-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Show less" : "Show more"}
        </div>
      )}
    </div>
  );
};

export default TruncatedQuestion;
