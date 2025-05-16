/**
 * Remove any debugging elements from the UI
 */
document.addEventListener('DOMContentLoaded', () => {
    // Remove any debugging elements or red outlines
    setTimeout(() => {
        // Remove any elements with red borders or outlines
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.borderColor.includes('255, 0, 0') || 
                style.outlineColor.includes('255, 0, 0') ||
                style.border.includes('red') ||
                style.outline.includes('red')) {
                
                console.log('Removing debug styling from element:', el);
                el.style.border = 'none';
                el.style.outline = 'none';
                el.style.boxShadow = 'none';
            }
        });
    }, 500);
});
