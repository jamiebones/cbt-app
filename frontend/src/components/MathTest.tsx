"use client";

import React from "react";
import MathDisplay from "./MathDisplay";

const MathTest: React.FC = () => {
  // Test different types of math expressions
  const testCases = [
    {
      name: "Square root with index",
      content: "The square root is $\\sqrt[2]{25}$",
    },
    {
      name: "Simple fraction",
      content: "The fraction is $\\frac{a}{b}$",
    },
    {
      name: "Block equation",
      content: "Block equation: $$x^2 + y^2 = z^2$$",
    },
    {
      name: "Plain text without math",
      content: "This is just plain text without any math",
    },
    {
      name: "Raw LaTeX without delimiters",
      content: "\\sqrt[2]{25}",
    },
    {
      name: "HTML with math",
      content: "<p>This is HTML with math: $\\sqrt{x^2 + y^2}$</p>",
    },
    {
      name: "CKEditor math span format",
      content:
        '<p>The answer is <span class="math-inline">\\sqrt[2]{25}</span> which equals 5.</p>',
    },
    {
      name: "Multiple CKEditor math spans",
      content:
        '<p>We have <span class="math-inline">\\frac{a}{b}</span> and <span class="math-inline">x^2 + y^2</span> in this text.</p>',
    },
    {
      name: "Complex CKEditor content",
      content:
        '<p>The quadratic formula is <span class="math-inline">x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}</span></p>',
    },
  ];

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Math Rendering Test</h1>

      {testCases.map((test, index) => (
        <div key={index} className="border p-4 rounded">
          <h3 className="font-semibold mb-2">{test.name}</h3>
          <div className="mb-2">
            <strong>Input:</strong>{" "}
            <code className="bg-gray-100 p-1 rounded">{test.content}</code>
          </div>
          <div>
            <strong>Rendered:</strong>
            <div className="border-t pt-2 mt-2">
              <MathDisplay content={test.content} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MathTest;
