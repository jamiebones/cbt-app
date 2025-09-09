"use client";

import React, { useEffect } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import CustomEditor from "../lib/ckeditor-build";
import katex from "katex";
import "katex/dist/katex.min.css";
import LatexGuide from "./LatexGuide";
import styles from "../styles/components/RichTextEditor.module.css";
import "../styles/components/math-editor.css";

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
  // Debug UI removed
  const editorRef = React.useRef<any>(null);

  // Centralized focus management function
  const focusEditor = (delay: number = 100) => {
    setTimeout(() => {
      if (editorRef.current) {
        try {
          editorRef.current.editing.view.focus();
        } catch (error) {
          console.warn("Could not focus editor:", error);
        }
      }
    }, delay);
  };

  // Debug function to inspect current state
  // Debug inspector removed

  // Update preview whenever math expression changes
  useEffect(() => {
    const previewContainer = document.getElementById("math-preview-container");
    if (!previewContainer) return;

    if (mathExpression.trim()) {
      try {
        // Clear previous content
        previewContainer.innerHTML = "";

        // Create a wrapper for proper spacing
        const previewWrapper = document.createElement("div");
        previewWrapper.className = "math-preview-wrapper";
        previewWrapper.style.padding = "8px";
        previewWrapper.style.display = "flex";
        previewWrapper.style.justifyContent = "center";
        previewWrapper.style.width = "100%";

        // Render the LaTeX into the wrapper
        katex.render(mathExpression, previewWrapper, {
          throwOnError: false,
          displayMode: true,
          output: "html",
          trust: true,
        });

        // Add the wrapper to the container
        previewContainer.appendChild(previewWrapper);
      } catch (error) {
        previewContainer.innerHTML =
          '<span class="text-red-500">Invalid LaTeX expression</span>';
        console.error("Error rendering preview:", error);
      }
    } else {
      previewContainer.innerHTML =
        '<span class="text-gray-400 text-sm">Enter LaTeX and see preview here. Spaces are preserved.</span>';
    }
  }, [mathExpression]);

  const renderMathInEditor = (editor: any) => {
    if (!editor || !editor.editing || !editor.editing.view) {
      console.log("🔍 DEBUG: Editor or editing view not available");
      return;
    }

    const editingView = editor.editing.view;
    const domRoot = editingView.getDomRoot();

    if (!domRoot) {
      console.log("🔍 DEBUG: No DOM root found");
      return;
    }

    console.log("🔍 DEBUG: Rendering math in editor");
    console.log("🔍 DEBUG: DOM root:", domRoot);

    // Find all math elements
    const mathElements = domRoot.querySelectorAll(".math-inline");
    console.log("🔍 DEBUG: Found math elements:", mathElements.length);

    // Also look for text nodes containing LaTeX expressions
    const textNodes: Node[] = [];
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        // Look for LaTeX patterns (backslash followed by letters, possibly with braces)
        const latexMatches = node.textContent.match(/(\\[^ ]+(?:\{[^}]*\})*)/g);
        if (latexMatches) {
          textNodes.push(node);
        }
      }
      if (node.childNodes) {
        Array.from(node.childNodes).forEach(walk);
      }
    };
    walk(domRoot);

    console.log("🔍 DEBUG: Found text nodes with LaTeX:", textNodes.length);

    // Process text nodes first - convert LaTeX text to spans
    textNodes.forEach((textNode, index) => {
      console.log(
        `🔍 DEBUG: Processing text node ${index}:`,
        textNode.textContent
      );

      if (textNode.textContent) {
        const latexMatches = textNode.textContent.match(
          /(\\[^ ]+(?:\{[^}]*\})*)/g
        );

        if (latexMatches) {
          // Process matches in reverse order to avoid index shifting issues
          const uniqueMatches = [...new Set(latexMatches)]; // Remove duplicates
          uniqueMatches.reverse().forEach((latexMatch) => {
            console.log(`🔍 DEBUG: Found LaTeX in text: "${latexMatch}"`);

            try {
              // Create a span element for the LaTeX
              const mathSpan = document.createElement("span");
              mathSpan.className = "math-inline";
              mathSpan.textContent = latexMatch;

              // Safety check: ensure textContent exists
              if (!textNode.textContent) {
                console.warn(
                  "🔍 DEBUG: Text node has no text content, skipping"
                );
                return;
              }

              // Find the position of this specific match
              const matchIndex = textNode.textContent.indexOf(latexMatch);
              if (matchIndex === -1) {
                console.warn(
                  `🔍 DEBUG: LaTeX match "${latexMatch}" not found in text node, skipping`
                );
                return;
              }

              // Replace the LaTeX text with the span
              const beforeText = textNode.textContent.substring(0, matchIndex);
              const afterText = textNode.textContent.substring(
                matchIndex + latexMatch.length
              );

              // Update the text node with text before the match
              textNode.textContent = beforeText;

              // Insert the span and remaining text
              if (textNode.parentNode) {
                // Insert the math span after the current text node
                textNode.parentNode.insertBefore(
                  mathSpan,
                  textNode.nextSibling
                );

                // Insert remaining text after the span if any
                if (afterText) {
                  const afterTextNode = document.createTextNode(afterText);
                  textNode.parentNode.insertBefore(
                    afterTextNode,
                    mathSpan.nextSibling
                  );
                }
              }

              console.log(
                `🔍 DEBUG: Converted LaTeX text to span: ${latexMatch}`
              );
            } catch (error) {
              console.error(
                `❌ Error converting LaTeX text ${latexMatch}:`,
                error
              );
            }
          });
        }
      }
    });

    // Now process existing math elements
    const updatedMathElements = domRoot.querySelectorAll(".math-inline");
    console.log(
      "🔍 DEBUG: Total math elements to render:",
      updatedMathElements.length
    );

    updatedMathElements.forEach((element: any, index: number) => {
      console.log(`🔍 DEBUG: Processing math element ${index}:`, {
        element: element,
        tagName: element.tagName,
        className: element.className,
        innerHTML: element.innerHTML,
        outerHTML: element.outerHTML,
        computedStyle: {
          display: window.getComputedStyle(element).display,
          position: window.getComputedStyle(element).position,
          float: window.getComputedStyle(element).float,
          width: window.getComputedStyle(element).width,
          height: window.getComputedStyle(element).height,
          margin: window.getComputedStyle(element).margin,
          padding: window.getComputedStyle(element).padding,
          boxSizing: window.getComputedStyle(element).boxSizing,
        },
        boundingRect: element.getBoundingClientRect(),
      });

      // Skip if already rendered
      if (element.querySelector(".katex")) {
        console.log(
          `🔍 DEBUG: Math element ${index} already rendered, skipping`
        );
        return;
      }

      const latexContent = element.textContent || "";
      console.log(
        `🔍 DEBUG: LaTeX content for element ${index}:`,
        latexContent
      );

      if (latexContent.trim()) {
        try {
          // Clear existing content
          element.innerHTML = "";
          console.log(`🔍 DEBUG: Cleared content for element ${index}`);

          // Render with KaTeX
          katex.render(latexContent, element, {
            throwOnError: false,
            displayMode: false,
            errorColor: "#cc0000",
            strict: "warn",
            trust: true,
          });

          // Debug styling removed

          console.log(
            `🔍 DEBUG: Successfully rendered KaTeX for element ${index}`
          );
          console.log(`🔍 DEBUG: Element after KaTeX render:`, {
            innerHTML: element.innerHTML,
            computedStyle: window.getComputedStyle(element),
            boundingRect: element.getBoundingClientRect(),
          });
        } catch (error) {
          console.error(`❌ Math rendering error for element ${index}:`, error);
          element.innerHTML = `<span style="color: #cc0000;">${latexContent}</span>`;
        }
      } else {
        console.log(`🔍 DEBUG: No LaTeX content for element ${index}`);
      }
    });
  };

  const insertMathExpression = () => {
    if (mathExpression.trim() && editorRef.current) {
      const editor = editorRef.current;

      // Additional safety check
      if (!editor || !editor.editing || !editor.editing.view) {
        console.error("❌ Editor not properly initialized");
        return;
      }

      console.log("🔍 DEBUG: Starting math insertion");
      console.log("🔍 DEBUG: Math expression:", mathExpression);

      try {
        // Use CKEditor's text insertion instead of HTML to avoid transformation
        const mathText = ` $${mathExpression} `;
        console.log("🔍 DEBUG: Text to insert:", mathText);

        // Insert as text first
        editor.execute("input", { text: mathText });

        // Then immediately render the math in the inserted text
        setTimeout(() => {
          renderMathInEditor(editor);
        }, 10);

        // Debug: Check what was actually inserted
        setTimeout(() => {
          const domRoot = editor.editing.view.getDomRoot();
          if (domRoot) {
            console.log(
              "🔍 DEBUG: DOM root after text insertion:",
              domRoot.innerHTML
            );

            // Look for text nodes containing our math expression
            const textNodes: Node[] = [];
            const walk = (node: Node) => {
              if (
                node.nodeType === Node.TEXT_NODE &&
                node.textContent &&
                node.textContent.includes(mathExpression)
              ) {
                textNodes.push(node);
              }
              if (node.childNodes) {
                Array.from(node.childNodes).forEach(walk);
              }
            };
            walk(domRoot);

            console.log(
              "🔍 DEBUG: Found text nodes with math:",
              textNodes.length
            );
            textNodes.forEach((node, index) => {
              console.log(`🔍 DEBUG: Text node ${index}:`, node.textContent);
            });
          }
        }, 50);

        // Focus back to editor after a short delay
        focusEditor(100);
      } catch (error) {
        console.error("❌ Error inserting math expression:", error);
        // Fallback insertion with spaces
        if (editorRef.current) {
          editorRef.current.editing.view.focus();
          editorRef.current.execute("input", { text: ` $${mathExpression} ` });
        }

        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.editing.view.focus();
          }
        }, 100);
      }

      setMathExpression("");
      setShowMathDialog(false);
    }
  };

  // Monitor editor focus for debugging
  useEffect(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;

    let focusDebug: any = null;
    let blurDebug: any = null;

    try {
      // Setup focus monitoring for debugging
      focusDebug = editor.editing.view.document.on("focus", () => {
        console.debug("Editor focused");
      });

      blurDebug = editor.editing.view.document.on("blur", () => {
        console.debug("Editor lost focus");
      });
    } catch (error) {
      console.warn("Failed to set up editor debug listeners:", error);
    }

    return () => {
      // Clean up event listeners with proper null checks
      try {
        if (focusDebug && typeof focusDebug.stop === "function") {
          focusDebug.stop();
        }
        if (blurDebug && typeof blurDebug.stop === "function") {
          blurDebug.stop();
        }
      } catch (error) {
        console.warn("Error cleaning up editor debug listeners:", error);
      }
    };
  }, [editorRef.current]);

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
        {/* Debug buttons removed */}
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
              placeholder="Enter LaTeX expression (e.g., \frac{a}{b}, \sqrt{x^2 + y^2})"
              className="w-full p-2 border border-gray-300 rounded mb-2 font-mono text-sm"
              style={{ fontFamily: "monospace" }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  insertMathExpression();
                  // Focus back to editor after insertion
                  focusEditor(150);
                }
                // Escape key closes dialog
                if (e.key === "Escape") {
                  setShowMathDialog(false);
                  // Focus back to editor when closing with Escape
                  focusEditor(150);
                }
              }}
              spellCheck={false}
            />
            <div
              id="math-preview-container"
              className="p-3 mb-4 bg-gray-50 rounded border border-gray-200 flex justify-center items-center min-h-[50px]"
            >
              <span className="text-gray-400 text-sm">
                Maths preview will appear here...
              </span>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowMathDialog(false);
                  // Focus back to editor when closing with Cancel button
                  focusEditor(150);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  insertMathExpression();
                  // Focus back to editor after insertion
                  focusEditor(150);
                }}
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

          // Safety check for editor initialization
          if (!editor || !editor.editing || !editor.editing.view) {
            console.error("❌ Editor not properly initialized in onReady");
            return;
          }

          // Set placeholder
          if (placeholder) {
            try {
              editor.editing.view.document.getRoot().placeholder = placeholder;
            } catch (error) {
              console.warn("Could not set placeholder:", error);
            }
          }

          // Set custom height
          try {
            editor.editing.view.change((writer: any) => {
              writer.setStyle(
                "min-height",
                height,
                editor.editing.view.document.getRoot()
              );
            });
          } catch (error) {
            console.warn("Could not set custom height:", error);
          }

          // Add keyboard shortcut for math (Ctrl+M)
          try {
            if (editor.keystrokes && editor.keystrokes.set) {
              editor.keystrokes.set("Ctrl+M", () => {
                setShowMathDialog(true);
              });
            }
          } catch (error) {
            console.warn("Could not set keyboard shortcut:", error);
          }

          // Add custom math button to THIS editor's toolbar (not the first on the page)
          try {
            const domRoot = editor.editing.view.getDomRoot();
            const editorContainer = domRoot?.closest(".ck-editor");
            const toolbar = editorContainer?.querySelector(
              ".ck-toolbar__items"
            ) as HTMLElement | null;

            if (toolbar) {
              // Avoid duplicate insertion on re-renders
              if (!toolbar.querySelector('[data-math-button="true"]')) {
                const mathButton = document.createElement("button");
                mathButton.setAttribute("data-math-button", "true");
                mathButton.innerHTML = "∑";
                mathButton.className = "ck ck-button ck-off";
                mathButton.title = "Insert Math (Ctrl+M)";
                mathButton.style.fontWeight = "bold";
                mathButton.style.fontSize = "16px";
                mathButton.style.margin = "0 5px";
                mathButton.style.cursor = "pointer";
                mathButton.style.padding = "4px 8px";
                mathButton.style.border = "1px solid #c4c4c4";
                mathButton.style.borderRadius = "4px";
                mathButton.style.backgroundColor = "#f8f9fa";
                mathButton.style.color = "#212529";

                mathButton.onmouseover = () => {
                  mathButton.style.backgroundColor = "#e9ecef";
                };
                mathButton.onmouseout = () => {
                  mathButton.style.backgroundColor = "#f8f9fa";
                };
                mathButton.onclick = () => setShowMathDialog(true);

                const separator = document.createElement("span");
                separator.className = "ck ck-toolbar__separator";
                toolbar.appendChild(separator);
                toolbar.appendChild(mathButton);
              }
            }
          } catch (e) {
            console.warn("Could not add math button to toolbar:", e);
          }

          // Set up math rendering on content changes
          try {
            if (
              editor.model &&
              editor.model.document &&
              editor.model.document.on
            ) {
              editor.model.document.on("change:data", () => {
                console.log("🔍 DEBUG: CKEditor model data changed");
                console.log("🔍 DEBUG: Current editor data:", editor.getData());
                renderMathInEditor(editor);
              });
            }
          } catch (error) {
            console.warn("Could not set up model change listener:", error);
          }

          // Add debug event listeners
          try {
            if (
              editor.editing &&
              editor.editing.view &&
              editor.editing.view.document &&
              editor.editing.view.document.on
            ) {
              editor.editing.view.document.on("change", () => {
                console.log("🔍 DEBUG: CKEditor view changed");
                const domRoot = editor.editing.view.getDomRoot();
                if (domRoot) {
                  console.log("🔍 DEBUG: DOM root HTML:", domRoot.innerHTML);
                }
              });
            }
          } catch (error) {
            console.warn("Could not set up view change listener:", error);
          }

          // Initial render
          renderMathInEditor(editor);
        }}
      />
    </div>
  );
};

export default RichTextEditorClient;
