/**
 * New Chat Handler
 * This is a centralized module for handling new chat functionality
 * to ensure consistent behavior across the application.
 */

// Global reference to the single instance of the handler
let newChatHandlerInstance = null;

class NewChatHandler {
    constructor() {
        // Singleton pattern - ensure only one instance exists
        if (newChatHandlerInstance) {
            return newChatHandlerInstance;
        }

        newChatHandlerInstance = this;
        this.initialize();
    }

    initialize() {
        console.log('Initializing NewChatHandler...');

        // Store references to important DOM elements
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.chatForm = document.getElementById('chatForm');

        // Bind methods to this instance
        this.startNewChat = this.startNewChat.bind(this);
        this.cleanupDuplicateElements = this.cleanupDuplicateElements.bind(this);

        // Set up event listeners for all new chat buttons
        this.setupEventListeners();

        console.log('NewChatHandler initialized successfully');
    }

    setupEventListeners() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.attachEventListeners());
        } else {
            this.attachEventListeners();
        }

        // Also set up a global click handler to catch dynamically added buttons
        document.addEventListener('click', (event) => {
            const target = event.target;

            // Check if the clicked element is a new chat button or has a parent that is
            const isNewChatButton =
                target.id === 'newChatBtn' ||
                target.closest('#newChatBtn') ||
                (target.classList && target.classList.contains('new-chat-item')) ||
                target.closest('.new-chat-item');

            if (isNewChatButton) {
                console.log('New chat button clicked via global handler');
                event.preventDefault();
                event.stopPropagation();

                // If this is inside a modal, close the modal first
                const modal = target.closest('.modal');
                if (modal) {
                    console.log('Closing modal before starting new chat');
                    modal.style.display = 'none';
                    setTimeout(() => {
                        if (document.body.contains(modal)) {
                            document.body.removeChild(modal);
                        }
                    }, 300);
                }

                // Start a new chat
                this.startNewChat();
            }
        });
    }

    attachEventListeners() {
        // Find all new chat buttons and attach event listeners
        const newChatBtns = document.querySelectorAll('#newChatBtn, .new-chat-btn, .new-chat-item');

        newChatBtns.forEach(btn => {
            console.log('Attaching event listener to new chat button:', btn);

            // Remove any existing event listeners by cloning
            const newBtn = btn.cloneNode(true);
            if (btn.parentNode) {
                btn.parentNode.replaceChild(newBtn, btn);
            }

            // Add new event listener
            newBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                console.log('New chat button clicked');
                this.startNewChat();
            });
        });
    }

    startNewChat() {
        try {
            console.log('Starting new chat via centralized handler...');

            // Explicitly set currentChatId to null to ensure a new chat is created on the next message
            window.currentChatId = null;

            // First, clean up any duplicate elements
            this.cleanupDuplicateElements();

            // Save current chat if there are messages
            this.saveCurrentChat();

            // Generate a new chat ID
            const newChatId = 'chat_' + Date.now();
            console.log(`Generated new chat ID in startNewChat: ${newChatId}`);
            console.log(`Previous currentChatId in startNewChat: ${window.currentChatId}`);

            // Update global variables
            window.currentChatId = newChatId;
            window.loadedFromSearch = false;

            // Update URL to remove chat parameter
            const url = new URL(window.location.href);
            url.searchParams.delete('chat');
            window.history.pushState({}, '', url);

            // Set a flag to indicate we're starting a new chat
            // This will be used to prevent other functions from hiding the greeting
            window.isStartingNewChat = true;

            // Remove active class from all chat history items in the sidebar
            const chatItems = document.querySelectorAll('.chat-history-item');
            chatItems.forEach(item => {
                item.classList.remove('active');
            });

            // Clear chat messages while preserving the greeting container
            if (this.chatMessages) {
                // Check if user is logged in before adding welcome message
                const isLoggedIn = !!localStorage.getItem('user_data');

                if (isLoggedIn) {
                    // For logged-in users, preserve the greeting container
                    let greetingContainer = document.getElementById('greetingMessageContainer');

                    // First, remove all messages except the greeting container
                    const allElements = Array.from(this.chatMessages.children);
                    allElements.forEach(element => {
                        if (element.id !== 'greetingMessageContainer') {
                            element.remove();
                        }
                    });

                    // If greeting container doesn't exist or was removed, create a new one
                    if (!document.getElementById('greetingMessageContainer')) {
                        console.log('Creating new greeting container');
                        greetingContainer = document.createElement('div');
                        greetingContainer.id = 'greetingMessageContainer';
                        greetingContainer.className = 'greeting-message-container';

                        const greetingMessage = document.createElement('p');
                        greetingMessage.id = 'greetingMessage';
                        greetingMessage.className = 'greeting-message';

                        greetingContainer.appendChild(greetingMessage);
                        this.chatMessages.insertBefore(greetingContainer, this.chatMessages.firstChild);
                    }

                    // Get user data and update greeting
                    const userData = JSON.parse(localStorage.getItem('user_data') || 'null');
                    if (userData) {
                        // Update the greeting message content
                        if (typeof window.updateGreetingMessage === 'function') {
                            window.updateGreetingMessage(userData);
                            console.log('Greeting message content updated');
                        }

                        // Make sure the greeting container is visible
                        greetingContainer = document.getElementById('greetingMessageContainer');
                        if (greetingContainer) {
                            greetingContainer.style.display = 'block';
                            greetingContainer.style.opacity = '1';
                            console.log('Explicitly set greeting container to visible');

                            // Force the greeting to stay visible with a delayed check
                            setTimeout(() => {
                                const container = document.getElementById('greetingMessageContainer');
                                if (container) {
                                    container.style.display = 'block';
                                    container.style.opacity = '1';
                                    console.log('Forced greeting visibility after delay');
                                }
                            }, 500);
                        }
                    }
                } else {
                    // For non-logged-in users, we can clear everything and add the welcome message
                    this.chatMessages.innerHTML = `
                        <div class="welcome-container">
                            <div class="welcome-message">
                                <h2>👋 Welcome</h2>
                                <p>I can help you with questions about company policies, employee guidelines, and HR procedures.</p>
                                <div class="suggestion-chips">
                                    <button class="suggestion-chip">🗓️ Leave Policy</button>
                                    <button class="suggestion-chip">👥 Referral Program</button>
                                    <button class="suggestion-chip">👔 Dress Code</button>
                                    <button class="suggestion-chip">🏠 Work from Home</button>
                                </div>
                            </div>
                        </div>
                    `;

                    // Set up suggestion chips
                    this.setupSuggestionChips();
                }
            } else {
                console.error('Chat messages container not found');
            }

            // Clear the starting new chat flag after a delay
            setTimeout(() => {
                window.isStartingNewChat = false;
                console.log('Cleared isStartingNewChat flag');

                // One final check to ensure greeting is visible
                if (!!localStorage.getItem('user_data')) {
                    const container = document.getElementById('greetingMessageContainer');
                    if (container) {
                        container.style.display = 'block';
                        container.style.opacity = '1';
                    }
                }
            }, 1000);

            // Clear user input
            if (this.userInput) {
                this.userInput.value = '';
                this.userInput.style.height = 'auto';
            }

            // Reset chat form
            if (this.chatForm) {
                this.chatForm.reset();
            }

            // Close sidebar on mobile
            const sidebar = document.getElementById('sidebar');
            if (sidebar && window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }

            // Run cleanup again after a short delay
            setTimeout(() => this.cleanupDuplicateElements(), 500);

            console.log('New chat started successfully');
        } catch (error) {
            console.error('Error starting new chat:', error);
        }
    }

    saveCurrentChat() {
        try {
            // Check if there are messages to save
            const messages = document.querySelectorAll('.message');
            if (messages.length > 0 && window.currentChatId) {
                console.log(`Saving current chat (${window.currentChatId}) before creating new one`);

                // If app-integration.js has a saveCurrentChat function, use it
                if (typeof window.saveCurrentChat === 'function') {
                    window.saveCurrentChat();
                } else {
                    // Basic implementation if the function doesn't exist
                    console.log('Using basic chat saving implementation');

                    // Get existing chats
                    let savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');

                    // Create chat object
                    const chatMessages = [];
                    messages.forEach(msg => {
                        const isUser = msg.classList.contains('user-message');
                        chatMessages.push({
                            role: isUser ? 'user' : 'assistant',
                            content: msg.querySelector('.message-content').textContent,
                            id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                        });
                    });

                    // Find title from first user message
                    const firstUserMsg = chatMessages.find(msg => msg.role === 'user');
                    const title = firstUserMsg ?
                        (firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '')) :
                        'New Chat';

                    // Create chat object
                    const chatObj = {
                        id: window.currentChatId,
                        title: title,
                        messages: chatMessages,
                        timestamp: new Date().toISOString()
                    };

                    // Add to saved chats
                    savedChats.push(chatObj);

                    // Save to localStorage
                    localStorage.setItem('ziahr_chats', JSON.stringify(savedChats));
                }
            }
        } catch (error) {
            console.error('Error saving current chat:', error);
        }
    }

    setupSuggestionChips() {
        try {
            const suggestionChips = document.querySelectorAll('.suggestion-chip');
            suggestionChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    const suggestion = chip.textContent.trim();
                    if (this.userInput) {
                        this.userInput.value = suggestion;
                        this.userInput.focus();

                        // Submit the form if possible
                        if (this.chatForm && typeof window.handleChatSubmit === 'function') {
                            const event = new Event('submit', { cancelable: true });
                            window.handleChatSubmit(event);
                        }
                    }
                });
            });
        } catch (error) {
            console.error('Error setting up suggestion chips:', error);
        }
    }

    cleanupDuplicateElements() {
        try {
            console.log('Cleaning up duplicate elements...');

            // Check for duplicate welcome containers
            const welcomeContainers = document.querySelectorAll('.welcome-container');
            if (welcomeContainers.length > 1) {
                console.warn(`Found ${welcomeContainers.length} welcome containers - should only have 1`);
                // Keep only the first one
                for (let i = 1; i < welcomeContainers.length; i++) {
                    welcomeContainers[i].remove();
                }
            }

            // Check for duplicate chat input containers
            const chatInputContainers = document.querySelectorAll('.chat-input-container');
            if (chatInputContainers.length > 1) {
                console.warn(`Found ${chatInputContainers.length} chat input containers - should only have 1`);
                // Keep the first one and remove the rest
                for (let i = 1; i < chatInputContainers.length; i++) {
                    chatInputContainers[i].remove();
                }

                // Make sure the remaining one is properly positioned
                const remainingContainer = document.querySelector('.chat-input-container');
                if (remainingContainer) {
                    remainingContainer.style.position = 'fixed';
                    remainingContainer.style.bottom = '24px';
                    remainingContainer.style.left = '50%';
                    remainingContainer.style.transform = 'translateX(-50%)';
                }
            }

            // Check for duplicate greeting message containers
            const greetingContainers = document.querySelectorAll('#greetingMessageContainer');
            if (greetingContainers.length > 1) {
                console.warn(`Found ${greetingContainers.length} greeting containers - should only have 1`);
                // Keep only the first one
                for (let i = 1; i < greetingContainers.length; i++) {
                    greetingContainers[i].remove();
                }
            } else if (greetingContainers.length === 0) {
                // If no greeting container exists but user is logged in, add it
                const isLoggedIn = !!localStorage.getItem('user_data');
                if (isLoggedIn && this.chatMessages) {
                    // Add the greeting container
                    const greetingContainer = document.createElement('div');
                    greetingContainer.id = 'greetingMessageContainer';
                    greetingContainer.className = 'greeting-message-container';
                    greetingContainer.style.display = 'none';

                    const greetingMessage = document.createElement('p');
                    greetingMessage.id = 'greetingMessage';
                    greetingMessage.className = 'greeting-message';

                    greetingContainer.appendChild(greetingMessage);
                    this.chatMessages.insertBefore(greetingContainer, this.chatMessages.firstChild);

                    // Show the greeting message
                    const userData = JSON.parse(localStorage.getItem('user_data') || 'null');
                    if (userData && typeof window.updateGreetingMessage === 'function') {
                        window.updateGreetingMessage(userData);
                    }
                }
            }
        } catch (error) {
            console.error('Error cleaning up duplicate elements:', error);
        }
    }
}

// Create the singleton instance
const newChatHandler = new NewChatHandler();

// Export the instance for use in other modules
window.newChatHandler = newChatHandler;

// Override the global startNewChat function
window.startNewChat = newChatHandler.startNewChat;
