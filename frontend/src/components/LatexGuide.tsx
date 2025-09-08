"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Copy } from "lucide-react";

interface LatexGuideProps {
  children?: React.ReactNode;
}

const LatexGuide: React.FC<LatexGuideProps> = ({ children }) => {
  const [copiedExpression, setCopiedExpression] = React.useState<string>("");

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedExpression(text);
      setTimeout(() => setCopiedExpression(""), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const latexExamples = [
    {
      category: "Basic Operations",
      examples: [
        { latex: "x + y", description: "Addition" },
        { latex: "x - y", description: "Subtraction" },
        { latex: "x \\times y", description: "Multiplication" },
        { latex: "x \\div y", description: "Division" },
        { latex: "\\frac{a}{b}", description: "Fraction" },
        { latex: "x^{2}", description: "Power/Exponent" },
        { latex: "x_{1}", description: "Subscript" },
        { latex: "\\sqrt{x}", description: "Square Root" },
        { latex: "\\sqrt[n]{x}", description: "nth Root" },
      ],
    },
    {
      category: "Greek Letters",
      examples: [
        { latex: "\\alpha", description: "Alpha (α)" },
        { latex: "\\beta", description: "Beta (β)" },
        { latex: "\\gamma", description: "Gamma (γ)" },
        { latex: "\\delta", description: "Delta (δ)" },
        { latex: "\\theta", description: "Theta (θ)" },
        { latex: "\\pi", description: "Pi (π)" },
        { latex: "\\sigma", description: "Sigma (σ)" },
        { latex: "\\omega", description: "Omega (ω)" },
      ],
    },
    {
      category: "Calculus",
      examples: [
        { latex: "\\frac{d}{dx}", description: "Derivative" },
        { latex: "\\int", description: "Integral" },
        { latex: "\\int_{a}^{b}", description: "Definite Integral" },
        { latex: "\\sum_{i=1}^{n}", description: "Summation" },
        { latex: "\\prod_{i=1}^{n}", description: "Product" },
        { latex: "\\lim_{x \\to 0}", description: "Limit" },
      ],
    },
    {
      category: "Chemistry",
      examples: [
        { latex: "H_{2}O", description: "Water" },
        { latex: "CO_{2}", description: "Carbon Dioxide" },
        { latex: "H_{2}SO_{4}", description: "Sulfuric Acid" },
        { latex: "CH_{3}COOH", description: "Acetic Acid" },
        {
          latex: "2H_{2} + O_{2} \\rightarrow 2H_{2}O",
          description: "Chemical Reaction",
        },
        { latex: "\\ce{H2O}", description: "Chemical Formula (mhchem)" },
      ],
    },
    {
      category: "Relations & Symbols",
      examples: [
        { latex: "=", description: "Equals" },
        { latex: "\\neq", description: "Not Equal" },
        { latex: "\\leq", description: "Less Than or Equal" },
        { latex: "\\geq", description: "Greater Than or Equal" },
        { latex: "\\approx", description: "Approximately Equal" },
        { latex: "\\infty", description: "Infinity" },
        { latex: "\\pm", description: "Plus/Minus" },
        { latex: "\\therefore", description: "Therefore" },
        { latex: "\\because", description: "Because" },
      ],
    },
    {
      category: "Advanced Math",
      examples: [
        {
          latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
          description: "Matrix",
        },
        { latex: "\\vec{v}", description: "Vector" },
        { latex: "\\nabla", description: "Nabla/Del" },
        { latex: "\\partial", description: "Partial Derivative" },
        { latex: "\\Delta", description: "Delta (Change)" },
        { latex: "\\oint", description: "Closed Line Integral" },
      ],
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-2"
            title="LaTeX Guide"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white text-gray-900 border-2 border-gray-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            LaTeX Expression Guide
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Click on any LaTeX expression to copy it to your clipboard. Use
            these expressions in the math editor.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {latexExamples.map((category, categoryIndex) => (
            <div key={categoryIndex} className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                {category.category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {category.examples.map((example, exampleIndex) => (
                  <div
                    key={exampleIndex}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer group"
                    onClick={() => copyToClipboard(example.latex)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="text-xs">
                        LaTeX
                      </Badge>
                      <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded block mb-2">
                      {example.latex}
                    </code>
                    <p className="text-xs text-gray-600">
                      {example.description}
                    </p>
                    {copiedExpression === example.latex && (
                      <p className="text-xs text-green-600 mt-1">Copied!</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">How to Use:</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>
              1. Click the <strong>Math button (∑)</strong> in the editor
              toolbar
            </li>
            <li>2. Copy any LaTeX expression from this guide</li>
            <li>3. Paste it into the math editor dialog</li>
            <li>
              4. Click <strong>OK</strong> to insert the rendered equation
            </li>
          </ol>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <h4 className="font-semibold text-yellow-900 mb-2">Tips:</h4>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>
              • Use <code>\</code> for LaTeX commands (e.g., <code>\frac</code>,{" "}
              <code>\sqrt</code>)
            </li>
            <li>
              • Use <code>{}</code> for grouping (e.g., <code>x^{2}</code> for x
              squared)
            </li>
            <li>
              • Use <code>&</code> and <code>\\</code> for matrices and arrays
            </li>
            <li>• Preview your equations before inserting them</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LatexGuide;
