"use client";

import React, { useMemo } from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

interface MathDisplayProps {
  content: string;
  className?: string;
  displayMode?: boolean; 
}

// Hoisted, precompiled regexes for performance
const RE_SPLIT_LATEX = /(\$\$[\s\S]*?\$\$|\$[\s\S]+?\$)/g;
const RE_BARE_TEX = /(\\[a-zA-Z]+(?:\{[^}]*\})*)/g;
const RE_NBSP = /\u00A0|\xA0/g;

let DECODER_EL: HTMLTextAreaElement | null = null;
let EXTRACTOR_EL: HTMLDivElement | null = null;

// Decode HTML entities efficiently using a reusable textarea
function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  if (!DECODER_EL && typeof document !== "undefined") {
    DECODER_EL = document.createElement("textarea");
  }
  if (!DECODER_EL) return text; // should not happen on client
  DECODER_EL.innerHTML = text;
  return DECODER_EL.value;
}

// Extract text from HTML while preserving CKEditor math spans as $...$
function extractTextFromHtml(html: string): string {
  if (!EXTRACTOR_EL && typeof document !== "undefined") {
    EXTRACTOR_EL = document.createElement("div");
  }
  if (!EXTRACTOR_EL) return html;
  EXTRACTOR_EL.innerHTML = html;

  const BLOCK_TAGS = new Set([
    "P",
    "DIV",
    "LI",
    "UL",
    "OL",
    "SECTION",
    "ARTICLE",
    "ASIDE",
    "HEADER",
    "FOOTER",
    "NAV",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "TABLE",
    "THEAD",
    "TBODY",
    "TFOOT",
    "TR",
    "TD",
    "TH",
    "FIGURE",
    "FIGCAPTION",
    "PRE",
    "BLOCKQUOTE",
  ]);

  const walk = (el: Element): string => {
    let out = "";
    el.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.textContent || "";
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const c = child as Element;
        if (c.classList && c.classList.contains("math-inline")) {
          const latex = c.textContent || "";
          out += latex ? `$${latex}$` : "";
        } else if (c.tagName === "BR") {
          out += " ";
        } else {
          const before = out.length;
          out += walk(c);
          if (BLOCK_TAGS.has(c.tagName) && out.length > before) {
            out += " ";
          }
        }
      }
    });
    return out;
  };

  const result = walk(EXTRACTOR_EL);
  EXTRACTOR_EL.innerHTML = ""; // cleanup
  return result;
}

// Convert bare TeX commands inside plain text to InlineMath while preserving text
function renderTextWithInlineCommands(
  text: string,
  keyPrefix: string
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = RE_BARE_TEX;
  regex.lastIndex = 0;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const full = m[0];
    const start = m.index;
    if (start > lastIndex) {
      nodes.push(
        <span
          key={`${keyPrefix}-t-${start}`}
          style={{ whiteSpace: "pre-wrap" }}
        >
          {text.slice(lastIndex, start)}
        </span>
      );
    }
    try {
      nodes.push(<InlineMath key={`${keyPrefix}-m-${start}`} math={full} />);
    } catch {
      nodes.push(
        <span key={`${keyPrefix}-e-${start}`} style={{ color: "#cc0000" }}>
          {full}
        </span>
      );
    }
    lastIndex = start + full.length;
  }
  if (lastIndex < text.length) {
    nodes.push(
      <span key={`${keyPrefix}-t-end`} style={{ whiteSpace: "pre-wrap" }}>
        {text.slice(lastIndex)}
      </span>
    );
  }
  return nodes;
}

// Core rendering logic for mixed content with LaTeX
function renderMixedContent(text: string): React.ReactNode[] {
  if (!text) return [];

  const likelyHtml = text.includes("<") && text.includes(">");
  const hasDollar = text.includes("$");
  const hasBackslash = text.includes("\\");

  // Fast path: plain text, no math
  if (!likelyHtml && !hasDollar && !hasBackslash) {
    const normalized = RE_NBSP.test(text) ? text.replace(RE_NBSP, " ") : text;
    return [
      <span key="plain" style={{ whiteSpace: "pre-wrap" }}>
        {normalized}
      </span>,
    ];
  }

  // If HTML-like, extract text while preserving math spans
  const extracted = likelyHtml ? extractTextFromHtml(text) : text;

  // Decode entities and normalize NBSP
  const balanced = decodeHtmlEntities(extracted).replace(RE_NBSP, " ");

  // Split by delimiters and render segments
  const parts = balanced.split(RE_SPLIT_LATEX);
  const lastIdx = parts.length - 1;
  return parts
    .map((part, i) => {
      if (!part) return null;

      // Display-mode $$...$$
      if (part.startsWith("$$") && part.endsWith("$$") && part.length > 4) {
        const latex = part.slice(2, -2);
        try {
          return (
            <div key={i} style={{ margin: "1em 0" }}>
              <BlockMath math={latex} />
            </div>
          );
        } catch {
          return (
            <span key={i} style={{ color: "#cc0000" }}>
              {part}
            </span>
          );
        }
      }

      // Inline $...$
      if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
        const latex = part.slice(1, -1);
        try {
          return <InlineMath key={i} math={latex} />;
        } catch {
          return (
            <span key={i} style={{ color: "#cc0000" }}>
              {part}
            </span>
          );
        }
      }

      // Plain text (including whitespace-only): also render bare commands like \\theta
      // Ignore lone $ or $$ artifacts; also strip trailing orphan dollars only on the last segment
      if (part === "$" || part === "$$") return null;
      let text = part;
      if (i === lastIdx) {
        text = text.replace(/\s*\${1,2}\s*$/, "");
      }
      return <span key={i}>{renderTextWithInlineCommands(text, `p${i}`)}</span>;
    })
    .filter(Boolean) as React.ReactNode[];
}

const MathDisplay: React.FC<MathDisplayProps> = ({
  content,
  className = "",
  displayMode = false,
}) => {
  const rendered = useMemo(() => {
    try {
      return renderMixedContent(content);
    } catch (e) {
      return e as Error;
    }
  }, [content]);

  if (Array.isArray(rendered)) {
    return <div className={`math-display ${className}`}>{rendered}</div>;
  }

  // Fallback error UI
  return (
    <div
      className={`math-display ${className}`}
      style={{
        color: "#cc0000",
        padding: "8px",
        border: "1px solid #cc0000",
        borderRadius: "4px",
      }}
    >
      Error rendering mathematical notation:{" "}
      {rendered instanceof Error ? rendered.message : "Unknown error"}
    </div>
  );
};

export default MathDisplay;
