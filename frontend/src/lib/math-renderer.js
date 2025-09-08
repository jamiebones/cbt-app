// Render LaTeX expressions in the editor content
export function renderMathInEditor(editor, katex) {
    if (!editor || !katex) return;

    // Function to render all math expressions in the editor
    const renderMathExpressions = () => {
        if (!editor || !katex) return;

        // Find all math-inline spans in the editor
        const editorElement = editor.editing.view.getDomRoot();
        if (!editorElement) return;

        // Get all math expressions in the editor
        const mathElements = editorElement.querySelectorAll('.math-inline');

        // Log how many math elements were found
        console.log(`Found ${mathElements.length} math elements to render`);

        // Create or update the preview panel if it doesn't exist
        updateMathPreviewPanel(editorElement, mathElements, katex);

        // Render each math expression
        mathElements.forEach((element, index) => {
            try {
                // Extract the LaTeX content
                let latexContent = element.textContent || '';
                console.log(`Math element ${index} content:`, latexContent);

                // Remove the delimiters if they exist
                let cleanLatex = latexContent.replace(/^\\\(|\\\)$/g, '');

                // Handle escaped backslashes in the HTML
                cleanLatex = cleanLatex.replace(/\\\\+/g, '\\');

                console.log(`Cleaned LaTeX for rendering:`, cleanLatex);

                // Only render if we have actual content
                if (cleanLatex && cleanLatex.trim()) {
                    // Clear the element's content
                    element.innerHTML = '';

                    // Render the math expression
                    katex.render(cleanLatex, element, {
                        throwOnError: false,
                        displayMode: false,
                        output: 'html'
                    });

                    console.log(`Successfully rendered math expression ${index}`);
                }
            } catch (error) {
                console.error('Error rendering LaTeX:', error);
            }
        });
    };

    // Set up a mutation observer to detect content changes
    const setupMathRenderer = () => {
        const editorElement = editor.editing.view.getDomRoot();
        if (!editorElement) return;

        // Create a MutationObserver to watch for changes in the editor content
        const observer = new MutationObserver(() => {
            console.log("DOM mutation detected in editor");
            setTimeout(renderMathExpressions, 50);
        });

        // Start observing the editor for DOM changes
        observer.observe(editorElement, {
            childList: true,
            subtree: true,
            characterData: true
        });

        // Initial render
        renderMathExpressions();

        return observer;
    };

    // Setup the renderer with a small delay to ensure editor is ready
    setTimeout(setupMathRenderer, 500);

    // For debugging: periodic re-rendering
    const interval = setInterval(renderMathExpressions, 3000);

    // Return cleanup function
    return () => {
        clearInterval(interval);

        // Remove the preview panel when editor is destroyed
        const editorElement = editor.editing.view.getDomRoot();
        if (editorElement) {
            const previewPanel = document.getElementById('math-preview-panel');
            if (previewPanel) {
                previewPanel.remove();
            }
        }
    };
}

// Function to create or update a preview panel below the editor
function updateMathPreviewPanel(editorElement, mathElements, katex) {
    // Get or create the preview panel
    let previewPanel = document.getElementById('math-preview-panel');

    if (!previewPanel) {
        // Create a new panel if it doesn't exist
        previewPanel = document.createElement('div');
        previewPanel.id = 'math-preview-panel';
        previewPanel.className = 'math-preview-panel';

        // Insert after the editor
        editorElement.parentNode.parentNode.insertAdjacentElement('afterend', previewPanel);
    }

    // Clear existing previews
    previewPanel.innerHTML = '';

    // If no math elements, add placeholder
    if (mathElements.length === 0) {
        previewPanel.style.display = 'none';
        return;
    }

    // Show the panel if there are math elements
    previewPanel.style.display = 'block';

    // Add a header to the panel
    const header = document.createElement('div');
    header.className = 'math-preview-header';
    header.textContent = 'LaTeX Previews';
    previewPanel.appendChild(header);

    // Add each math expression to the preview panel
    mathElements.forEach((element, index) => {
        try {
            // Extract the LaTeX content
            let latexContent = element.textContent || '';

            // Remove the delimiters if they exist
            let cleanLatex = latexContent.replace(/^\\\(|\\\)$/g, '');

            // Handle escaped backslashes in the HTML
            cleanLatex = cleanLatex.replace(/\\\\+/g, '\\');

            // Create a preview item
            const previewItem = document.createElement('div');
            previewItem.className = 'math-preview-item';

            // Create expression container
            const expressionContainer = document.createElement('div');
            expressionContainer.className = 'math-expression-source';
            expressionContainer.textContent = cleanLatex;
            previewItem.appendChild(expressionContainer);

            // Create render container
            const renderContainer = document.createElement('div');
            renderContainer.className = 'math-expression-render';

            // Render the math expression
            if (cleanLatex && cleanLatex.trim()) {
                katex.render(cleanLatex, renderContainer, {
                    throwOnError: false,
                    displayMode: true,
                    output: 'html'
                });
            } else {
                renderContainer.textContent = 'Empty expression';
            }

            previewItem.appendChild(renderContainer);
            previewPanel.appendChild(previewItem);
        } catch (error) {
            console.error('Error creating preview:', error);
        }
    });
}
