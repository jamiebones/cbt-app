"use client";

import React, { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

// Common LaTeX patterns that should be wrapped in delimiters
const LATEX_PATTERNS = [
  /\\sqrt\[.*?\]\{.*?\}/g, // nth root: \sqrt[2]{25}
  /\\sqrt\{.*?\}/g, // square root: \sqrt{25}
  /\\frac\{.*?\}\{.*?\}/g, // fraction: \frac{a}{b}
  /\\[a-zA-Z]+/g, // LaTeX commands: \alpha, \beta, \sum, etc.
  /\^[^$\s]+/g, // superscript: x^2, x^{n+1}
  /_[^$\s]+/g, // subscript: x_1, x_{i+1}
];

// Function to automatically wrap LaTeX expressions with $ delimiters
function preprocessLatexContent(content: string): string {
  let processed = content;

  // Handle CKEditor math spans - these contain raw LaTeX without delimiters
  processed = processed.replace(
    /<span class="math-inline">(.*?)<\/span>/g,
    (match, latexContent) => {
      // Clean up the LaTeX content
      const cleanLatex = latexContent
        .replace(/\\\\+/g, "\\") // Handle escaped backslashes
        .replace(/^\\\(|\\\)$/g, ""); // Remove LaTeX delimiters if present

      console.log(
        `Converting CKEditor math span: "${latexContent}" → "$${cleanLatex}$"`
      );
      return `$${cleanLatex}$`;
    }
  );

  // Skip further processing if content already has delimiters after span conversion
  if (
    processed.includes("$") ||
    processed.includes("\\(") ||
    processed.includes("\\[")
  ) {
    return processed;
  }

  // Check if any LaTeX patterns are found in plain text
  const hasLatex = LATEX_PATTERNS.some((pattern) => pattern.test(content));

  if (hasLatex) {
    // Wrap individual LaTeX expressions found in plain text
    LATEX_PATTERNS.forEach((pattern) => {
      processed = processed.replace(pattern, (match) => {
        // Don't wrap if already wrapped
        if (match.startsWith("$") && match.endsWith("$")) {
          return match;
        }
        console.log(`Auto-wrapping LaTeX pattern: "${match}" → "$${match}$"`);
        return `$${match}$`;
      });
    });
  }

  return processed;
}

interface MathDisplayProps {
  content: string;
  className?: string;
}

const MathDisplay: React.FC<MathDisplayProps> = ({
  content,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !content) return;

    const container = containerRef.current;

    // Pre-process content to wrap LaTeX expressions with delimiters if they don't have them
    let processedContent = preprocessLatexContent(content);

    // Set the HTML content
    container.innerHTML = processedContent;

    // Use KaTeX auto-render (industry standard approach)
    renderMathInElement(container, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      throwOnError: false,
      errorColor: "#cc0000",
      strict: false,
      trust: false,
      macros: {
        "\\f": "#1f(#2)",
      },
    });
  }, [content]);
  return <div ref={containerRef} className={`math-display ${className}`} />;
};

// KaTeX Auto-Render Extension Implementation
// This is the industry standard approach used by Khan Academy, Brilliant.org, etc.
function renderMathInElement(elem: HTMLElement, options: any) {
  const delimiters = options.delimiters || [
    { left: "$$", right: "$$", display: true },
    { left: "$", right: "$", display: false },
  ];

  const textNodes = getTextNodesIn(elem);

  textNodes.forEach((textNode) => {
    const text = textNode.textContent || "";

    for (const delimiter of delimiters) {
      if (text.includes(delimiter.left)) {
        processTextNode(textNode, delimiter, options);
        break;
      }
    }
  });
}

function getTextNodesIn(elem: HTMLElement): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(elem, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      // Skip already processed math elements
      const parent = node.parentElement;
      if (
        parent &&
        (parent.classList.contains("katex") ||
          parent.classList.contains("katex-display") ||
          parent.classList.contains("katex-html"))
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  return textNodes;
}

function processTextNode(textNode: Text, delimiter: any, options: any) {
  const text = textNode.textContent || "";
  const leftDelim = delimiter.left;
  const rightDelim = delimiter.right;

  console.log(`Processing text node for delimiter "${leftDelim}":`, text);

  const startIndex = text.indexOf(leftDelim);
  if (startIndex === -1) {
    console.log(`No start delimiter "${leftDelim}" found`);
    return;
  }

  const endIndex = text.indexOf(rightDelim, startIndex + leftDelim.length);
  if (endIndex === -1) {
    console.log(
      `No end delimiter "${rightDelim}" found after position ${
        startIndex + leftDelim.length
      }`
    );
    return;
  }

  const beforeMath = text.substring(0, startIndex);
  const mathContent = text.substring(startIndex + leftDelim.length, endIndex);
  const afterMath = text.substring(endIndex + rightDelim.length);

  console.log("Math content to render:", mathContent);

  const fragment = document.createDocumentFragment();

  // Add text before math
  if (beforeMath) {
    fragment.appendChild(document.createTextNode(beforeMath));
  }

  // Create math element
  const mathElement = document.createElement(
    delimiter.display ? "div" : "span"
  );
  mathElement.className = delimiter.display ? "katex-display" : "katex";

  try {
    console.log("Attempting to render math:", mathContent);
    katex.render(mathContent, mathElement, {
      displayMode: delimiter.display,
      throwOnError: options.throwOnError || false,
      errorColor: options.errorColor || "#cc0000",
      strict: options.strict || false,
      trust: options.trust || false,
      macros: options.macros || {},
    });
    console.log("KaTeX render successful");
  } catch (error) {
    console.error("KaTeX rendering error:", error);
    mathElement.textContent = leftDelim + mathContent + rightDelim;
    mathElement.style.color = options.errorColor || "#cc0000";
  }

  fragment.appendChild(mathElement);

  // Add text after math (and process it recursively for more math)
  if (afterMath) {
    const remainingTextNode = document.createTextNode(afterMath);
    fragment.appendChild(remainingTextNode);

    // Process remaining text for more math expressions
    setTimeout(() => {
      processTextNode(remainingTextNode, delimiter, options);
    }, 0);
  }

  // Replace the original text node
  if (textNode.parentNode) {
    console.log("Replacing text node in DOM");
    textNode.parentNode.replaceChild(fragment, textNode);
  }
}

export default MathDisplay;
