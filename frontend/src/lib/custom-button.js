// Custom toolbar button to open the math dialog
export function addCustomMathButton(editor, openMathDialog) {
    // Add a custom button to the toolbar
    const mathButton = document.createElement('button');
    mathButton.innerHTML = '∑'; // Math symbol
    mathButton.className = 'ck ck-button math-button';
    mathButton.title = 'Insert Math (Ctrl+M)';
    mathButton.style.fontWeight = 'bold';
    mathButton.style.fontSize = '16px';
    mathButton.style.margin = '0 5px';
    mathButton.style.cursor = 'pointer';
    mathButton.style.padding = '4px 8px';
    mathButton.style.border = '1px solid #c4c4c4';
    mathButton.style.borderRadius = '4px';
    mathButton.style.backgroundColor = '#f8f9fa';
    mathButton.style.color = '#212529';

    // Add hover effect
    mathButton.onmouseover = () => {
        mathButton.style.backgroundColor = '#e9ecef';
    };
    mathButton.onmouseout = () => {
        mathButton.style.backgroundColor = '#f8f9fa';
    };

    // Add click handler
    mathButton.onclick = () => {
        openMathDialog();
    };

    // Insert the button into the toolbar
    setTimeout(() => {
        const toolbar = document.querySelector('.ck-toolbar__items');
        if (toolbar) {
            // Add a separator before the button
            const separator = document.createElement('span');
            separator.className = 'ck ck-toolbar__separator';
            toolbar.appendChild(separator);

            // Add the button
            toolbar.appendChild(mathButton);
        }
    }, 100); // Small delay to ensure the toolbar is fully rendered

    return mathButton;
}
