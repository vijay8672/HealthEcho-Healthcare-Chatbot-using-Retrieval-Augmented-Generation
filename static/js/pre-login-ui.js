/**
 * Pre-login UI functionality
 * Handles the UI state before login and connects to login/register modals
 * Allows up to 10 messages before requiring login
 */

// Apply authentication state immediately before DOM content loads
// This prevents the login page flash during page refresh
(function() {
    try {
        // Check if user is already logged in
        const isLoggedIn = !!localStorage.getItem('user_data');

        // Set body class based on login state immediately
        if (isLoggedIn) {
            document.documentElement.classList.add('logged-in');
            document.documentElement.classList.remove('not-logged-in');
        } else {
            document.documentElement.classList.add('not-logged-in');
            document.documentElement.classList.remove('logged-in');
        }

        // Initialize pre-login message count if it doesn't exist
        if (!localStorage.getItem('pre_login_message_count')) {
            localStorage.setItem('pre_login_message_count', '0');
        }
    } catch (error) {
        console.error('Error applying initial auth state:', error);
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    initPreLoginUI();
});

/**
 * Initialize the pre-login UI
 */
function initPreLoginUI() {
    try {
        // Check if user is already logged in
        const isLoggedIn = !!localStorage.getItem('user_data');

        // Set body class based on login state
        if (isLoggedIn) {
            document.body.classList.remove('not-logged-in');
            document.body.classList.add('logged-in');
        } else {
            document.body.classList.add('not-logged-in');
            document.body.classList.remove('logged-in');
        }

        // Set up event listeners for pre-login buttons
        const preLoginBtn = document.getElementById('preLoginBtn');
        const preLoginInput = document.querySelector('.pre-login-input');
        const preLoginActionBtns = document.querySelectorAll('.pre-login-action-btn');
        const preLoginSendBtn = document.querySelector('.pre-login-send-btn');
        const preLoginSuggestionChips = document.querySelectorAll('.pre-login-suggestion-chip');

        if (preLoginBtn) {
            preLoginBtn.addEventListener('click', () => {
                openLoginModal();
            });
        }

        // Set up pre-login chat container
        const preLoginChatContainer = document.createElement('div');
        preLoginChatContainer.className = 'pre-login-chat-container';
        const preLoginMain = document.querySelector('.pre-login-main');
        if (preLoginMain) {
            const welcomeContainer = document.querySelector('.pre-login-welcome-container');
            if (welcomeContainer) {
                preLoginMain.insertBefore(preLoginChatContainer, welcomeContainer.nextSibling);
            }
        }

        // Handle pre-login input focus
        if (preLoginInput) {
            preLoginInput.addEventListener('focus', () => {
                // No action needed, just allow typing
            });
        }

        // Handle action buttons
        if (preLoginActionBtns) {
            preLoginActionBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    checkMessageCountAndProceed(() => {
                        // This will be called if under message limit
                        // For now, just show a notification
                        showPreLoginNotification('Feature available after login', 'Please log in to use this feature.');
                    });
                });
            });
        }

        // Handle send button
        if (preLoginSendBtn) {
            preLoginSendBtn.addEventListener('click', () => {
                handlePreLoginMessageSubmit();
            });

            // Also handle Enter key in textarea
            if (preLoginInput) {
                preLoginInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handlePreLoginMessageSubmit();
                    }
                });
            }
        }

        // Handle suggestion chips
        if (preLoginSuggestionChips) {
            preLoginSuggestionChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    const suggestionText = chip.textContent.trim();
                    handlePreLoginSuggestion(suggestionText);
                });
            });
        }

        // Listen for login/logout events to update UI
        window.addEventListener('user-logged-in', () => {
            document.body.classList.remove('not-logged-in');
            document.body.classList.add('logged-in');
            document.documentElement.classList.remove('not-logged-in');
            document.documentElement.classList.add('logged-in');
        });

        window.addEventListener('user-logged-out', () => {
            document.body.classList.add('not-logged-in');
            document.body.classList.remove('logged-in');
            document.documentElement.classList.add('not-logged-in');
            document.documentElement.classList.remove('logged-in');
        });

        console.log('Pre-login UI initialized');
    } catch (error) {
        console.error('Error initializing pre-login UI:', error);
    }
}

/**
 * Open the login modal
 */
function openLoginModal() {
    // Check if this is a page refresh - don't show login modal on refresh
    const isPageRefresh = sessionStorage.getItem('is_page_refresh') === 'true';

    if (isPageRefresh) {
        console.log('Page refresh detected in pre-login-ui.js, not showing login modal automatically');
        return; // Don't show the modal on page refresh
    }

    const loginModal = document.getElementById('loginModal');
    const usernameInput = document.getElementById('username');
    const loginMessage = document.getElementById('loginMessage');

    if (loginModal) {
        loginModal.style.display = 'flex';
        if (usernameInput) usernameInput.focus();
        if (loginMessage) loginMessage.textContent = '';
    }
}

/**
 * Open the register modal
 */
function openRegisterModal() {
    const registerModal = document.getElementById('registerModal');
    const fullNameInput = document.getElementById('fullName');
    const registerMessage = document.getElementById('registerMessage');

    if (registerModal) {
        registerModal.style.display = 'flex';
        if (fullNameInput) fullNameInput.focus();
        if (registerMessage) registerMessage.textContent = '';
    }
}

/**
 * Check message count and proceed with action or show login modal
 * @param {Function} action - Function to execute if under message limit
 */
function checkMessageCountAndProceed(action) {
    const messageCount = parseInt(localStorage.getItem('pre_login_message_count') || '0');
    const MAX_MESSAGES = 5; // Changed from 10 to 5

    if (messageCount < MAX_MESSAGES) {
        // Under the limit, proceed with action
        if (typeof action === 'function') {
            action();
        }
    } else {
        // Over the limit, show login modal
        openLoginModal();
    }
}

/**
 * Handle pre-login message submission
 */
function handlePreLoginMessageSubmit() {
    const preLoginInput = document.querySelector('.pre-login-input');
    if (!preLoginInput) return;

    const message = preLoginInput.value.trim();
    if (!message) return;

    checkMessageCountAndProceed(() => {
        // Add message to UI
        addPreLoginMessage('user', message);

        // Clear input and reset height
        preLoginInput.value = '';
        preLoginInput.style.height = 'auto';

        // Simulate bot response after a short delay
        setTimeout(() => {
            // Add typing indicator
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'pre-login-message pre-login-bot-typing';
            typingIndicator.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';

            const chatContainer = document.querySelector('.pre-login-chat-container');
            if (chatContainer) {
                chatContainer.appendChild(typingIndicator);
                // Scroll to the bottom
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }

            // Remove typing indicator and add response after 1-2 seconds
            setTimeout(() => {
                if (typingIndicator.parentNode) {
                    typingIndicator.remove();
                }

                // Generate a simple response
                let response = "❓ I'm sorry, but I need more information to provide a helpful response. Could you please log in to access the full capabilities of ZiaHR?";

                // Check for common HR questions
                if (message.toLowerCase().includes('leave') || message.toLowerCase().includes('vacation') || message.toLowerCase().includes('time off')) {
                    response = "🗓️ **Leave Policy**\nOur company's leave policy allows employees to accrue paid time off based on tenure. For specific details about your leave balance or to request time off, please log in to access your personal information.";
                } else if (message.toLowerCase().includes('dress code')) {
                    response = "👔 **Dress Code**\nOur dress code is business casual for most positions. For specific guidelines related to your department, please log in to view the complete policy.";
                } else if (message.toLowerCase().includes('referral') || message.toLowerCase().includes('refer')) {
                    response = "👥 **Referral Program**\nWe have an employee referral program that offers bonuses for successful hires. For details on the current bonus structure and to submit a referral, please log in.";
                } else if (message.toLowerCase().includes('work from home') || message.toLowerCase().includes('remote') || message.toLowerCase().includes('wfh')) {
                    response = "🏠 **Work From Home**\nOur flexible work policy allows for remote work options depending on your role and department. For specific guidelines applicable to your position, please log in.";
                } else if (message.toLowerCase() === 'hello' || message.toLowerCase() === 'hi' || message.toLowerCase() === 'hey') {
                    response = "👋 Hello! I'm ZiaHR, your HR assistant. How can I help you today? You can ask me about company policies, benefits, or procedures.";
                }

                addPreLoginMessage('bot', response);

                // Increment message count
                const currentCount = parseInt(localStorage.getItem('pre_login_message_count') || '0');
                localStorage.setItem('pre_login_message_count', (currentCount + 1).toString());

                // If this was the 5th message, show a notification about the limit
                if (currentCount + 1 >= 5) {
                    setTimeout(() => {
                        showPreLoginNotification('Message limit reached', 'You\'ve reached the limit of 5 messages. Please log in to continue the conversation.');
                    }, 1000);
                }
            }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
        }, 500);
    });
}

/**
 * Handle pre-login suggestion click
 * @param {string} suggestion - The suggestion text
 */
function handlePreLoginSuggestion(suggestion) {
    checkMessageCountAndProceed(() => {
        // Add suggestion as user message
        addPreLoginMessage('user', suggestion);

        // Simulate bot response after a short delay
        setTimeout(() => {
            // Add typing indicator
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'pre-login-message pre-login-bot-typing';
            typingIndicator.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';

            const chatContainer = document.querySelector('.pre-login-chat-container');
            if (chatContainer) {
                chatContainer.appendChild(typingIndicator);
                // Scroll to the bottom
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }

            // Remove typing indicator and add response after 1-2 seconds
            setTimeout(() => {
                if (typingIndicator.parentNode) {
                    typingIndicator.remove();
                }

                // Generate a response based on the suggestion
                let response = "❓ I'm sorry, but I need more information to provide a helpful response. Could you please log in to access the full capabilities of ZiaHR?";

                if (suggestion.toLowerCase().includes('leave policy')) {
                    response = "🗓️ **Leave Policy**\nOur company's leave policy allows employees to accrue paid time off based on tenure. For specific details about your leave balance or to request time off, please log in to access your personal information.";
                } else if (suggestion.toLowerCase().includes('dress code')) {
                    response = "👔 **Dress Code**\nOur dress code is business casual for most positions. For specific guidelines related to your department, please log in to view the complete policy.";
                } else if (suggestion.toLowerCase().includes('referral program')) {
                    response = "👥 **Referral Program**\nWe have an employee referral program that offers bonuses for successful hires. For details on the current bonus structure and to submit a referral, please log in.";
                } else if (suggestion.toLowerCase().includes('work from home')) {
                    response = "🏠 **Work From Home**\nOur flexible work policy allows for remote work options depending on your role and department. For specific guidelines applicable to your position, please log in.";
                }

                addPreLoginMessage('bot', response);

                // Increment message count
                const currentCount = parseInt(localStorage.getItem('pre_login_message_count') || '0');
                localStorage.setItem('pre_login_message_count', (currentCount + 1).toString());

                // If this was the 5th message, show a notification about the limit
                if (currentCount + 1 >= 5) {
                    setTimeout(() => {
                        showPreLoginNotification('Message limit reached', 'You\'ve reached the limit of 5 messages. Please log in to continue the conversation.');
                    }, 1000);
                }
            }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
        }, 500);
    });
}

/**
 * Add a message to the pre-login chat container
 * @param {string} role - 'user' or 'bot'
 * @param {string} content - The message content
 */
function addPreLoginMessage(role, content) {
    const chatContainer = document.querySelector('.pre-login-chat-container');
    if (!chatContainer) return;

    // Hide welcome message on first message
    const welcomeContainer = document.querySelector('.pre-login-welcome-container');
    if (welcomeContainer) {
        if (chatContainer.childElementCount === 0) {
            // This is the first message, hide the welcome container
            welcomeContainer.style.display = 'none';
            // Move input box to bottom
            movePreLoginInputToBottom();
            // Make chat container take full height
            chatContainer.style.maxHeight = '60vh';
            chatContainer.style.height = '60vh';
            chatContainer.style.marginTop = '20px';
        }
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `pre-login-message pre-login-${role}-message`;

    // Format the content with simple markdown-like processing
    let formattedContent = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
        .replace(/\n/g, '<br>'); // Line breaks

    messageDiv.innerHTML = formattedContent;
    chatContainer.appendChild(messageDiv);

    // Scroll to the bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Helper to move the input box to the bottom with space
function movePreLoginInputToBottom() {
    const inputContainer = document.querySelector('.pre-login-bottom-input-container');
    if (inputContainer) {
        inputContainer.classList.add('pre-login-bottom-fixed');
    }
}

/**
 * Show a notification in the pre-login UI
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 */
function showPreLoginNotification(title, message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'pre-login-notification';

    toast.innerHTML = `
        <div class="pre-login-notification-content">
            <div class="pre-login-notification-title">${title}</div>
            <div class="pre-login-notification-message">${message}</div>
        </div>
        <button class="pre-login-notification-close">&times;</button>
    `;

    document.body.appendChild(toast);

    // Show the notification
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Add close button functionality
    const closeBtn = toast.querySelector('.pre-login-notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        });
    }

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }
    }, 5000);
}
