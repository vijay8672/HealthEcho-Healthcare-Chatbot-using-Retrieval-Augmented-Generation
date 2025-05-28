/**
 * Send button icon management
 * Handles switching between send and loading icons
 */

document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Initializing send button icon management...');
        
        // Get elements
        const sendBtn = document.getElementById('sendBtn');
        const sendIcon = document.querySelector('.send-icon');
        const loadingIcon = document.querySelector('.loading-icon');
        const chatForm = document.getElementById('chatForm');
        
        if (!sendBtn || !sendIcon || !loadingIcon || !chatForm) {
            console.error('Required elements not found for send button icon management');
            return;
        }
        
        // Function to show loading icon
        function showLoadingIcon() {
            sendIcon.style.display = 'none';
            loadingIcon.style.display = 'block';
        }
        
        // Function to show send icon
        function showSendIcon() {
            loadingIcon.style.display = 'none';
            sendIcon.style.display = 'block';
        }
        
        // Listen for form submission to show loading icon
        chatForm.addEventListener('submit', () => {
            showLoadingIcon();
        });
        
        // Create a MutationObserver to watch for typing indicator
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check if typing indicator was added
                    const typingIndicator = document.getElementById('typingIndicator');
                    if (typingIndicator) {
                        showLoadingIcon();
                    }
                    
                    // Check if typing indicator was removed (response received)
                    const removedNodes = Array.from(mutation.removedNodes);
                    const wasTypingIndicatorRemoved = removedNodes.some(node => 
                        node.id === 'typingIndicator' || 
                        (node.querySelector && node.querySelector('#typingIndicator'))
                    );
                    
                    if (wasTypingIndicatorRemoved) {
                        showSendIcon();
                    }
                }
            });
        });
        
        // Start observing the chat messages container
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            observer.observe(chatMessages, { childList: true, subtree: true });
        }
        
        // Also hook into the API response handlers
        const originalHandleBotResponse = window.handleBotResponse;
        if (typeof originalHandleBotResponse === 'function') {
            window.handleBotResponse = function(...args) {
                showLoadingIcon();
                return originalHandleBotResponse.apply(this, args);
            };
        }
        
        // Hook into removeTypingIndicator function if it exists
        const originalRemoveTypingIndicator = window.removeTypingIndicator;
        if (typeof originalRemoveTypingIndicator === 'function') {
            window.removeTypingIndicator = function(...args) {
                const result = originalRemoveTypingIndicator.apply(this, args);
                showSendIcon();
                return result;
            };
        }
        
        // Initialize with send icon
        showSendIcon();
        
        console.log('Send button icon management initialized');
    } catch (error) {
        console.error('Error initializing send button icon management:', error);
    }
});
