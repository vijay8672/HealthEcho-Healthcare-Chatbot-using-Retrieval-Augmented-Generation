/**
 * ZiaHR App Integration
 * Integrates the ChatGPT-style UI with the backend API
 */

// Device ID for tracking conversation history
const deviceId = generateDeviceId();

// Chat history and current chat ID
let chatHistory = [];
let currentChatId = null;

// Expose currentChatId to window object so it can be accessed from other scripts
window.currentChatId = currentChatId;

// API endpoints
const API_ENDPOINTS = {
    QUERY: '/api/query',
    UPLOAD: '/api/upload-document',
    SPEECH_TO_TEXT: '/api/speech-to-text',
    TEXT_TO_SPEECH: '/api/text-to-speech',
    CONFIRM_ESCALATION: '/api/confirm-escalation'
};

// Global function to stop all speech
function stopAllSpeech() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();

        // Reset all audio buttons
        document.querySelectorAll('.feedback-btn.audio-btn').forEach(btn => {
            if (btn.getAttribute('data-speaking') === 'true') {
                btn.classList.remove('active');
                btn.setAttribute('data-speaking', 'false');
                btn.setAttribute('title', 'Read aloud');
                btn.innerHTML = '<i class="fas fa-volume-up"></i>';
            }
        });
    }
}

// Clean up localStorage to remove all empty chats
function cleanupLocalStorage() {
    try {
        console.log('Cleaning up localStorage...');

        // Get saved chats
        let savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');

        // Count empty chats
        let emptyChatsCount = 0;

        // Remove all empty chats
        const filteredChats = savedChats.filter(chat => {
            if (chat.title === 'New Chat' && (!chat.messages || chat.messages.length === 0)) {
                emptyChatsCount++;
                console.log(`Removing empty chat with ID ${chat.id}`);
                return false;
            }
            return true;
        });

        // If we found empty chats, save the filtered list
        if (emptyChatsCount > 0) {
            console.log(`Found and removed ${emptyChatsCount} empty chats`);

            // Save back to localStorage
            localStorage.setItem('ziahr_chats', JSON.stringify(filteredChats));

            console.log('Empty chats removed from localStorage');
        } else {
            console.log('No empty chats found');
        }
    } catch (error) {
        console.error('Error cleaning up localStorage:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Initializing ZiaHR app integration...');

        // Clean up localStorage first to remove duplicate empty chats
        cleanupLocalStorage();

        // Clean up any duplicate chat input containers that might exist from previous sessions
        cleanupDuplicateChatInputs();

        // Add event listener to stop speech when page is unloaded
        window.addEventListener('beforeunload', stopAllSpeech);

        // Override the simulateBotResponse function to use the real API
        window.simulateBotResponse = handleBotResponse;

        // Override the submitSuggestion function to use the real API
        window.submitSuggestion = handleSuggestion;

        // Override the handleChatSubmit function to use the real API
        window.handleChatSubmit = handleChatSubmit;

        // Override the uploadDocument function to use the real API
        window.uploadDocument = handleFileUpload;

        // Store the original startNewChat function and override it with our version
        if (typeof startNewChat === 'function') {
            console.log('Storing original startNewChat function');
            window.originalStartNewChat = startNewChat;
        } else {
            console.log('Original startNewChat function not found, will use fallback');
        }

        // We'll use the centralized handler from new-chat-handler.js
        // But we'll also expose our functions for backward compatibility
        window.handleStartNewChat = handleStartNewChat;

        // If the centralized handler isn't loaded yet, use our function as a fallback
        if (!window.newChatHandler) {
            console.log('Centralized new chat handler not found, using app-integration.js version as fallback');
            window.startNewChat = handleStartNewChat;
        }

        // Setup voice input
        setupVoiceInput();

        // Initialize file manager
        if (!window.fileManager) {
            try {
                console.log('Initializing file manager...');
                window.fileManager = new FileManager();
                console.log('File manager initialized successfully');
            } catch (error) {
                console.error('Error initializing file manager:', error);
            }
        }

        // Setup quick upload
        setupQuickUpload();

        // Setup login functionality
        setupLoginFunctionality();

        // Setup new chat button
        setupNewChatButton();

        // Load saved chats
        loadSavedChats();

        // Check URL for chat ID parameter
        const urlParams = new URLSearchParams(window.location.search);
        const chatIdFromUrl = urlParams.get('chat');

        if (chatIdFromUrl) {
            console.log(`Found chat ID in URL: ${chatIdFromUrl}`);
            // Load the chat from the URL parameter
            loadChatFromUrl(chatIdFromUrl);

            // Skip the rest of the initial setup that might clear the chat or show welcome message
            console.log('Skipping default initial UI setup due to chatId in URL');
            return;
        }

        // Initialize greeting message if user is logged in (only if no chat ID in URL)
        try {
            const userData = JSON.parse(localStorage.getItem('user_data') || 'null');
            if (userData && typeof window.updateGreetingMessage === 'function') {
                console.log('User is logged in, initializing greeting message');
                window.updateGreetingMessage(userData);
                console.log('Greeting message shown for new chat');
                if (typeof window.ensureChatInputCentered === 'function') {
                    window.ensureChatInputCentered();
                }
            }
        } catch (error) {
            console.error('Error initializing greeting message:', error);
        }

        console.log('ZiaHR app integration initialized');
    } catch (error) {
        console.error('Error initializing app integration:', error);
    }

    // Ensure chatMessages still has relative position if needed for other elements
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.style.position = 'relative';
    }
});

// Generate a unique device ID for tracking conversation history
function generateDeviceId() {
    let id = localStorage.getItem('ziahr_device_id');
    if (!id) {
        id = 'device_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('ziahr_device_id', id);
    }
    return id;
}

// Handle chat form submission
function handleChatSubmit(e) {
    e.preventDefault();

    try {
        // Synchronize local currentChatId with the global window variable
        currentChatId = window.currentChatId;

        // Stop any ongoing speech
        stopAllSpeech();

        const userInput = document.getElementById('userInput');
        const message = userInput.value.trim();

        // Get files from file manager
        const files = window.fileManager ? window.fileManager.getFiles() : [];

        // Check if we have a message (files alone are not enough)
        if (message) {
            console.log(`Submitting message: ${message}${files.length > 0 ? ' with ' + files.length + ' files' : ''}`);
            console.log(`currentChatId in handleChatSubmit before check: ${currentChatId}`);

            // If no current chat ID, create one
            if (!currentChatId) {
                currentChatId = 'chat_' + Date.now();
                window.currentChatId = currentChatId;
                console.log(`Generated new chat ID for first message: ${currentChatId}`);

                // Get existing chats
                let savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');

                // Remove any empty chats (chats with no messages and title "New Chat")
                savedChats = savedChats.filter(chat => {
                    if (chat.title === 'New Chat' && (!chat.messages || chat.messages.length === 0)) {
                        console.log(`Removing empty chat with ID ${chat.id}`);
                        return false;
                    }
                    return true;
                });

                // Save back to localStorage (without adding a new empty chat)
                localStorage.setItem('ziahr_chats', JSON.stringify(savedChats));
                console.log(`Removed empty chats from localStorage for first message`);

                // Update URL with the new chat ID
                const url = new URL(window.location.href);
                url.searchParams.set('chat', currentChatId);
                window.history.pushState({}, '', url);

                // Call loadSavedChats to refresh the sidebar with the new chat
                loadSavedChats();
            }

            // Add user message to UI
            // Create a timestamp for this message
            const timestamp = new Date().toISOString();
            addMessageToUI('user', message, null, timestamp);

            // Clear input and reset height
            userInput.value = '';
            userInput.style.height = 'auto';
            document.getElementById('sendBtn').disabled = true;

            // Get response from API
            handleBotResponse(message);

            // Lock files after submission
            if (window.fileManager && files.length > 0) {
                window.fileManager.lockFiles();
            }

            // Save chat and update timestamp since a new message was sent
            saveCurrentChat(true);
        }
    } catch (error) {
        console.error('Error handling chat submit:', error);
    }
}

// Handle suggestion click
function handleSuggestion(text) {
    try {
        console.log(`Handling suggestion: ${text}`);

        // If no current chat ID, create one
        if (!currentChatId) {
            currentChatId = 'chat_' + Date.now();
            window.currentChatId = currentChatId;
            console.log(`Generated new chat ID for suggestion: ${currentChatId}`);

            // Get existing chats
            let savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');

            // Remove any empty chats (chats with no messages and title "New Chat")
            savedChats = savedChats.filter(chat => {
                if (chat.title === 'New Chat' && (!chat.messages || chat.messages.length === 0)) {
                    console.log(`Removing empty chat with ID ${chat.id}`);
                    return false;
                }
                return true;
            });

            // We don't create an empty chat in localStorage anymore
            // We'll only save it when the user actually sends a message

            // Save back to localStorage (without adding a new empty chat)
            localStorage.setItem('ziahr_chats', JSON.stringify(savedChats));
            console.log(`Removed empty chats from localStorage for suggestion`);
        }

        const userInput = document.getElementById('userInput');
        const chatForm = document.getElementById('chatForm');

        if (!userInput || !chatForm) {
            console.error('User input or chat form not found');
            return;
        }

        // Set the input value
        userInput.value = text;

        // Trigger input event to enable send button and adjust height
        userInput.dispatchEvent(new Event('input', { bubbles: true }));

        // Submit the form
        setTimeout(() => {
            chatForm.dispatchEvent(new Event('submit'));
        }, 10);

        console.log('Suggestion submitted successfully');
    } catch (error) {
        console.error('Error handling suggestion:', error);
    }
}

// Add message to UI
function addMessageToUI(type, message, messageId = null, timestamp = null) {
    try {
        // Remove all welcome containers if they exist (there might be duplicates)
        const welcomeContainers = document.querySelectorAll('.welcome-container');
        if (welcomeContainers.length > 0) {
            welcomeContainers.forEach(container => {
                container.remove();
            });
            console.log(`Removed ${welcomeContainers.length} welcome container(s)`);

            // Reposition the chat input to the bottom when welcome container is removed
            const chatInputContainer = document.querySelector('.chat-input-container');
            if (chatInputContainer) {
                // Ensure the chat input is properly centered horizontally and positioned at the bottom
                chatInputContainer.style.position = 'fixed';
                chatInputContainer.style.top = 'auto';
                chatInputContainer.style.bottom = '24px';
                chatInputContainer.style.transform = 'translate(-50%, 0)';
                chatInputContainer.style.left = '50%';
                chatInputContainer.style.marginLeft = '0';
                chatInputContainer.style.right = 'auto';

                // Add a class to indicate the welcome message has been removed
                document.body.classList.add('welcome-removed');
            }
        }

        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}-message`;

        // If messageId is provided, set it as the element ID
        if (messageId) {
            messageElement.id = messageId;
        }

        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';

        if (type === 'bot' || type === 'system') {
            // Use marked.js to render markdown
            contentElement.innerHTML = marked.parse(message);

            // Add footer with timestamp and feedback buttons
            const footerElement = document.createElement('div');
            footerElement.className = 'message-footer';

            // Create feedback buttons (only for bot messages)
            if (type === 'bot') {
                // Create feedback element first
                const feedbackElement = document.createElement('div');
                feedbackElement.className = 'message-feedback';

                // Create a unique ID for this set of feedback buttons
                const feedbackId = 'feedback-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                feedbackElement.id = feedbackId;

                // Create copy button
                const copyBtn = document.createElement('button');
                copyBtn.className = 'feedback-btn copy-btn';
                copyBtn.innerHTML = '<i class="far fa-copy"></i>';
                copyBtn.setAttribute('title', 'Copy to clipboard');
                copyBtn.onclick = function() {
                    // Copy message content to clipboard
                    const textToCopy = contentElement.innerText || contentElement.textContent;
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        // Show temporary success state
                        copyBtn.classList.add('active');

                        // Change icon to checkmark to indicate success
                        const originalIcon = copyBtn.innerHTML;
                        copyBtn.innerHTML = '<i class="fas fa-check"></i>';

                        setTimeout(() => {
                            copyBtn.classList.remove('active');
                            copyBtn.innerHTML = originalIcon;
                        }, 1500);
                    });
                };

                // Create thumbs up button
                const thumbsUpBtn = document.createElement('button');
                thumbsUpBtn.className = 'feedback-btn thumbs-up';
                thumbsUpBtn.innerHTML = '<i class="far fa-thumbs-up"></i>';
                thumbsUpBtn.setAttribute('title', 'Thumbs up');
                thumbsUpBtn.onclick = function() {
                    // Toggle active state
                    if (thumbsUpBtn.classList.contains('active')) {
                        thumbsUpBtn.classList.remove('active');
                    } else {
                        thumbsUpBtn.classList.add('active');
                        thumbsDownBtn.classList.remove('active');
                    }
                };

                // Create thumbs down button
                const thumbsDownBtn = document.createElement('button');
                thumbsDownBtn.className = 'feedback-btn thumbs-down';
                thumbsDownBtn.innerHTML = '<i class="far fa-thumbs-down"></i>';
                thumbsDownBtn.setAttribute('title', 'Thumbs down');
                thumbsDownBtn.onclick = function() {
                    // Toggle active state
                    if (thumbsDownBtn.classList.contains('active')) {
                        thumbsDownBtn.classList.remove('active');
                    } else {
                        thumbsDownBtn.classList.add('active');
                        thumbsUpBtn.classList.remove('active');
                    }
                };

                // Create audio button
                const audioBtn = document.createElement('button');
                audioBtn.className = 'feedback-btn audio-btn';
                audioBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                audioBtn.setAttribute('title', 'Read aloud');
                audioBtn.setAttribute('data-speaking', 'false');

                // Store the utterance on the button element for later access
                audioBtn.utterance = null;

                audioBtn.onclick = function() {
                    // Check if already speaking
                    if (audioBtn.getAttribute('data-speaking') === 'true') {
                        // Stop speech
                        window.speechSynthesis.cancel();
                        audioBtn.classList.remove('active');
                        audioBtn.setAttribute('data-speaking', 'false');
                        audioBtn.setAttribute('title', 'Read aloud');
                        audioBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                        return;
                    }

                    // Read the message aloud using text-to-speech
                    const textToSpeak = contentElement.innerText || contentElement.textContent;
                    const utterance = new SpeechSynthesisUtterance(textToSpeak);

                    // Store the utterance for later access
                    audioBtn.utterance = utterance;

                    // Set up event handlers
                    utterance.onend = function() {
                        audioBtn.classList.remove('active');
                        audioBtn.setAttribute('data-speaking', 'false');
                        audioBtn.setAttribute('title', 'Read aloud');
                        audioBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                    };

                    utterance.onerror = function() {
                        audioBtn.classList.remove('active');
                        audioBtn.setAttribute('data-speaking', 'false');
                        audioBtn.setAttribute('title', 'Read aloud');
                        audioBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                    };

                    // Start speaking
                    window.speechSynthesis.speak(utterance);

                    // Show active state while speaking
                    audioBtn.classList.add('active');
                    audioBtn.setAttribute('data-speaking', 'true');
                    audioBtn.setAttribute('title', 'Stop reading');
                    audioBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
                };

                // Add buttons to feedback element in the order shown in the image
                feedbackElement.appendChild(copyBtn);
                feedbackElement.appendChild(thumbsUpBtn);
                feedbackElement.appendChild(thumbsDownBtn);
                feedbackElement.appendChild(audioBtn);

                // Add feedback element to footer first
                footerElement.appendChild(feedbackElement);
            }

            // Add timestamp - use provided timestamp if available
            const timeElement = document.createElement('span');
            timeElement.className = 'message-time';
            if (timestamp) {
                const messageDate = new Date(timestamp);
                timeElement.textContent = messageDate.toLocaleTimeString();
            } else {
                timeElement.textContent = new Date().toLocaleTimeString();
            }

            // Create time container and add to footer
            const timeContainer = document.createElement('div');
            timeContainer.className = 'time-container';
            timeContainer.appendChild(timeElement);
            footerElement.appendChild(timeContainer);

            // Add content and footer to message
            messageElement.appendChild(contentElement);
            messageElement.appendChild(footerElement);

        } else { // User message
            contentElement.textContent = message;
            messageElement.appendChild(contentElement);

            // Add timestamp to user message
            const footerElement = document.createElement('div');
            footerElement.className = 'message-footer';
            const timeElement = document.createElement('span');
            timeElement.className = 'message-time';
            if (timestamp) {
                const messageDate = new Date(timestamp);
                timeElement.textContent = messageDate.toLocaleTimeString();
            } else {
                timeElement.textContent = new Date().toLocaleTimeString();
            }
            footerElement.appendChild(timeElement);
            messageElement.appendChild(footerElement);
        }

        elements.chatMessages.appendChild(messageElement);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

        // Add to chat log (This happens after appending the message)
        chatLog.push({ type, message, messageId, sources: [], timestamp: timestamp || new Date().toISOString() });

        // Hide the greeting message AFTER the message has been added to the DOM
        // But only if we're not in the process of starting a new chat
        if ((type === 'user' || type === 'bot') && !window.isStartingNewChat) {
            if (typeof window.hideGreetingMessage === 'function') {
                window.hideGreetingMessage();
                console.log('Greeting message hidden when user/bot message is added');
            }
        }

        // Reposition the chat input to the bottom when messages are present
        // Removed dynamic positioning logic as CSS now handles fixed positioning
        // const chatInputContainer = document.querySelector('.chat-input-container');
        // if (chatInputContainer) {
        //     chatInputContainer.style.top = 'auto';
        //     chatInputContainer.style.bottom = '24px';
        //     chatInputContainer.style.transform = 'translate(-50%, 0)';
        // }

        console.log(`Added ${type} message to UI`);
    } catch (error) {
        console.error('Error adding message to UI:', error);
    }
}

// Make addMessageToUI and updateMessageInChat available globally
window.addMessageToUI = addMessageToUI;
window.updateMessageInChat = function(messageId, newMessage) {
    try {
        // Find the message element by ID
        const messageElement = document.getElementById(messageId);
        if (!messageElement) {
            console.error(`Message with ID ${messageId} not found`);
            return;
        }

        // Update the content
        const contentElement = messageElement.querySelector('.message-content');
        if (contentElement) {
            contentElement.innerHTML = marked.parse(newMessage);
        }

        console.log(`Updated message with ID ${messageId}`);
    } catch (error) {
        console.error('Error updating message in chat:', error);
    }
};

// Handle bot response
function handleBotResponse(userMessage) {
    try {
        // Stop any ongoing speech
        stopAllSpeech();

        // Show typing indicator
        showTypingIndicator();

        // Get files from file manager
        const files = window.fileManager ? window.fileManager.getFiles() : [];
        let filesInfo = [];

        if (files.length > 0) {
            // Format files info for API request
            filesInfo = files.map(file => ({
                name: file.name,
                id: file.id,
                type: file.extension,
                status: file.status
            }));
        }

        // Call the API
        axios.post(API_ENDPOINTS.QUERY, {
            query: userMessage,
            device_id: deviceId,
            files_info: filesInfo // Include multiple files info in the API request
        })
        .then(response => {
            // Remove typing indicator
            removeTypingIndicator();

            const data = response.data;

            // Add bot message to UI without any confirmation message
            // Create a timestamp for this message
            const timestamp = new Date().toISOString();
            addMessageToUI('bot', data.response, null, timestamp);

            // Check if the response contains escalation confirmation request
            if (data.escalated) {
                // Add escalation confirmation buttons
                setTimeout(() => {
                    const lastBotMessage = document.querySelector('.bot-message:last-child');
                    if (lastBotMessage) {
                        const confirmationDiv = document.createElement('div');
                        confirmationDiv.className = 'escalation-confirmation';
                        confirmationDiv.innerHTML = `
                            <button class="escalation-btn confirm-escalation">Yes, escalate to HR</button>
                            <button class="escalation-btn cancel-escalation">No, thanks</button>
                        `;

                        // Add the confirmation div after the message content
                        const messageContent = lastBotMessage.querySelector('.message-content');
                        if (messageContent) {
                            messageContent.appendChild(confirmationDiv);

                            // Add event listeners to the buttons
                            const confirmBtn = confirmationDiv.querySelector('.confirm-escalation');
                            const cancelBtn = confirmationDiv.querySelector('.cancel-escalation');

                            if (confirmBtn) {
                                confirmBtn.addEventListener('click', () => {
                                    // Send confirmation to the server
                                    axios.post(API_ENDPOINTS.CONFIRM_ESCALATION, {
                                        query: userMessage,
                                        device_id: deviceId
                                    })
                                    .then(response => {
                                        // Show success message
                                        addMessageToUI('system', response.data.message, null, new Date().toISOString());

                                        // Remove the confirmation buttons
                                        confirmationDiv.remove();
                                    })
                                    .catch(error => {
                                        console.error('Error confirming escalation:', error);
                                        let errorMsg = 'There was an error escalating your question. Please try again later.';
                                        if (error.response && error.response.data && error.response.data.message) {
                                            errorMsg = error.response.data.message;
                                        }
                                        addMessageToUI('system', errorMsg, null, new Date().toISOString());

                                        // Remove the confirmation buttons
                                        confirmationDiv.remove();
                                    });
                                });
                            }

                            if (cancelBtn) {
                                cancelBtn.addEventListener('click', () => {
                                    // Just remove the confirmation buttons
                                    confirmationDiv.remove();
                                    addMessageToUI('system', 'Escalation cancelled. I\'ll try my best to help with the information I have.', null, new Date().toISOString());
                                });
                            }
                        }
                    }
                }, 500);
            }

            // Don't show sources panel
            // Sources are disabled as per user request

            // Call loadSavedChats to refresh the sidebar after interaction is saved
            loadSavedChats();

            // Handle text-to-speech if enabled
            const voiceToggle = document.getElementById('voiceToggle');
            if (voiceToggle && voiceToggle.checked && data.audio_url) {
                playAudio(data.audio_url);
            }
        })
        .catch(error => {
            console.error('API error:', error);
            removeTypingIndicator();

            // Show detailed error message for debugging
            let errorMessage = 'Sorry, I encountered an error processing your request. Please try again later.';
            let shouldRetry = true;
            let retryDelay = 2000; // 2 seconds default retry delay

            // If we have a more specific error message from the API, use it
            if (error.response && error.response.data) {
                console.log('API error details:', error.response.data);

                // Check for custom error message
                if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response.data.error) {
                    errorMessage = error.response.data.error;
                }

                // Check for error type to determine if we should retry
                if (error.response.data.error_type) {
                    // Don't retry for authentication or invalid input errors
                    if (['AuthenticationError', 'InvalidInputError', 'ValidationError'].includes(error.response.data.error_type)) {
                        shouldRetry = false;
                    }

                    // For rate limit errors, wait longer before retry
                    if (error.response.data.error_type === 'RateLimitError') {
                        retryDelay = 5000; // 5 seconds for rate limit errors
                    }
                }

                // If the API already attempted retries, don't retry again
                if (error.response.data.retry_attempted) {
                    shouldRetry = false;
                    errorMessage += " The system already attempted to retry your request.";
                }
            }

            // Add a more user-friendly message with timestamp
            const timestamp = new Date().toISOString();
            addMessageToUI('bot', errorMessage, null, timestamp);

            // Automatically retry once after a short delay for certain errors
            if (shouldRetry && error.response && error.response.status === 500) {
                setTimeout(() => {
                    console.log('Automatically retrying request...');
                    // Add a retry indicator with timestamp
                    const retryTimestamp = new Date().toISOString();
                    addMessageToUI('system', 'Retrying request...', null, retryTimestamp);

                    // Retry the request with a slightly modified query to avoid exact same processing
                    axios.post(API_ENDPOINTS.QUERY, {
                        query: userMessage + ' (retry)',
                        device_id: deviceId,
                        files_info: filesInfo
                    })
                    .then(response => {
                        removeTypingIndicator();
                        const data = response.data;
                        const responseTimestamp = new Date().toISOString();
                        addMessageToUI('bot', data.response, null, responseTimestamp);
                    })
                    .catch(retryError => {
                        console.error('Retry failed:', retryError);

                        // Check if we have a specific error message from the retry
                        let retryErrorMessage = 'I apologize, but I\'m still having trouble processing your request. Please try again later or rephrase your question.';

                        if (retryError.response && retryError.response.data) {
                            if (retryError.response.data.message) {
                                retryErrorMessage = retryError.response.data.message;
                            } else if (retryError.response.data.error) {
                                retryErrorMessage = retryError.response.data.error;
                            }
                        }

                        const errorTimestamp = new Date().toISOString();
                        addMessageToUI('bot', retryErrorMessage, null, errorTimestamp);
                    });
                }, retryDelay);
            }
        });
    } catch (error) {
        console.error('Error handling bot response:', error);
        removeTypingIndicator();
    }
}

// Update source panel with citation information
function updateSourcePanel(sources) {
    try {
        const sourcePanel = document.getElementById('sourcePanel');
        const sourcePanelContent = document.getElementById('sourcePanelContent');
        const closeSourcePanel = document.getElementById('closeSourcePanel');

        if (!sourcePanel || !sourcePanelContent) return;

        // Clear existing content
        sourcePanelContent.innerHTML = '';

        // Add sources
        if (sources.length > 0) {
            const sourceList = document.createElement('ul');
            sourceList.className = 'source-list';

            sources.forEach(source => {
                const sourceItem = document.createElement('li');
                sourceItem.className = 'source-item';

                const sourceTitle = document.createElement('div');
                sourceTitle.className = 'source-title';
                sourceTitle.textContent = source.title || 'Document';

                const sourceContent = document.createElement('div');
                sourceContent.className = 'source-content';
                sourceContent.textContent = source.content || '';

                sourceItem.appendChild(sourceTitle);
                sourceItem.appendChild(sourceContent);
                sourceList.appendChild(sourceItem);
            });

            sourcePanelContent.appendChild(sourceList);
        } else {
            sourcePanelContent.innerHTML = '<p>No sources available for this response.</p>';
        }

        // Show the panel
        sourcePanel.classList.add('active');

        // Add close button event listener if not already added
        if (closeSourcePanel && !closeSourcePanel._hasClickListener) {
            closeSourcePanel.addEventListener('click', () => {
                sourcePanel.classList.remove('active');
            });
            closeSourcePanel._hasClickListener = true;
        }
    } catch (error) {
        console.error('Error updating source panel:', error);
    }
}

// Handle file upload - Deprecated, now using FileManager
function handleFileUpload(file) {
    try {
        // Use the file manager to handle the file upload
        if (Array.isArray(file)) {
            // If an array of files is passed
            window.fileManager.handleFileUpload(file);
        } else if (file instanceof FileList) {
            // If a FileList is passed
            window.fileManager.handleFileUpload(file);
        } else {
            // If a single file is passed
            window.fileManager.handleFileUpload([file]);
        }
    } catch (error) {
        console.error('Error handling file upload:', error);
    }
}

// Setup voice input
function setupVoiceInput() {
    try {
        const voiceInputBtn = document.getElementById('voiceInputBtn');
        const voiceModal = document.getElementById('voiceModal');
        const closeVoiceModal = document.getElementById('closeVoiceModal');
        const cancelVoiceInput = document.getElementById('cancelVoiceInput');
        const submitVoiceInput = document.getElementById('submitVoiceInput');

        if (!voiceInputBtn || !voiceModal) return;

        // Open voice modal and start recording
        voiceInputBtn.addEventListener('click', () => {
            voiceModal.style.display = 'flex';

            // Clear previous transcription
            const transcriptionResult = document.getElementById('transcriptionResult');
            if (transcriptionResult) {
                transcriptionResult.textContent = '';
            }

            // Reset recording status
            const recordingStatus = document.getElementById('recordingStatus');
            if (recordingStatus) {
                recordingStatus.textContent = 'Listening...';
            }

            // Reset submit button
            const submitVoiceInput = document.getElementById('submitVoiceInput');
            if (submitVoiceInput) {
                submitVoiceInput.disabled = true;
            }

            // Auto-start recording
            setTimeout(() => {
                const startRecording = document.getElementById('startRecording');
                if (startRecording && !startRecording.disabled) {
                    startRecording.click();
                }
            }, 300);
        });

        // Close voice modal and stop recording
        if (closeVoiceModal) {
            closeVoiceModal.addEventListener('click', () => {
                // Stop recording if active
                const stopRecording = document.getElementById('stopRecording');
                if (stopRecording && !stopRecording.disabled) {
                    stopRecording.click();
                }
                voiceModal.style.display = 'none';
            });
        }

        // Cancel voice input and stop recording
        if (cancelVoiceInput) {
            cancelVoiceInput.addEventListener('click', () => {
                // Stop recording if active
                const stopRecording = document.getElementById('stopRecording');
                if (stopRecording && !stopRecording.disabled) {
                    stopRecording.click();
                }
                voiceModal.style.display = 'none';
            });
        }

        // Submit voice input
        if (submitVoiceInput) {
            submitVoiceInput.addEventListener('click', () => {
                const transcriptionResult = document.getElementById('transcriptionResult');
                if (transcriptionResult && transcriptionResult.innerText) {
                    const text = transcriptionResult.innerText.trim();
                    if (text) {
                        // Set the input value
                        const userInput = document.getElementById('userInput');
                        if (userInput) {
                            userInput.value = text;
                            userInput.dispatchEvent(new Event('input', { bubbles: true }));

                            // Focus on the input field so user can edit if needed
                            userInput.focus();
                        }

                        // Close modal
                        voiceModal.style.display = 'none';

                        // Don't automatically submit the form
                        // Let the user press Enter or click the send button
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error setting up voice input:', error);
    }
}

// Setup quick upload functionality
function setupQuickUpload() {
    try {
        const quickUploadBtn = document.getElementById('quickUploadBtn');
        const quickFileUpload = document.getElementById('quickFileUpload');

        if (!quickUploadBtn || !quickFileUpload) {
            console.error('Quick upload elements not found');
            return;
        }

        console.log('Found quick upload elements:', quickUploadBtn, quickFileUpload);

        // Open file dialog when quick upload button is clicked
        quickUploadBtn.addEventListener('click', () => {
            console.log('Quick upload button clicked');
            quickFileUpload.click();
        });

        // Handle file selection
        quickFileUpload.addEventListener('change', (e) => {
            console.log('File input change event triggered');

            if (e.target.files.length > 0) {
                console.log(`${e.target.files.length} files selected for upload`);

                if (!window.fileManager) {
                    console.error('File manager not available');
                    // Show a toast notification to the user
                    showToastNotification('Error', 'File manager not available. Please refresh the page and try again.');
                    return;
                }

                try {
                    // Use the file manager to handle multiple files
                    window.fileManager.handleFileUpload(e.target.files);

                    // Show a toast notification about file limit
                    if (e.target.files.length > 7) {
                        showToastNotification('File Limit', 'Only a maximum of 7 files can be uploaded at once.', true); // true indicates error
                    }
                } catch (uploadError) {
                    console.error('Error handling file upload:', uploadError);
                    showToastNotification('Upload Error', 'There was an error uploading your files.', true); // true indicates error
                }

                // Clear the input to allow selecting the same files again
                e.target.value = '';
            } else {
                console.log('No files selected');
            }
        });

        console.log('Multi-file upload functionality set up');
    } catch (error) {
        console.error('Error setting up quick upload:', error);
    }
}

// Show a simple toast notification
function showToastNotification(title, message) {
    console.log(`Toast notification: ${title} - ${message}`);

    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <div class="toast-header">
            <strong>${title}</strong>
            <button class="close-toast">×</button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;

    // Style the toast
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = 'var(--bg-primary)';
    toast.style.color = 'var(--text-primary)';
    toast.style.borderRadius = '4px';
    toast.style.padding = '10px';
    toast.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    toast.style.zIndex = '9999';
    toast.style.minWidth = '250px';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';

    // Add to document
    document.body.appendChild(toast);

    // Fade in
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);

    // Add close button event
    const closeBtn = toast.querySelector('.close-toast');
    closeBtn.style.float = 'right';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.marginLeft = '10px';

    closeBtn.addEventListener('click', () => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
        }, 300);
    });

    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }, 3000);
}

// Play audio from URL
function playAudio(audioUrl) {
    try {
        const audio = new Audio(audioUrl);
        audio.play().catch(error => {
            console.error('Error playing audio:', error);
        });
    } catch (error) {
        console.error('Error playing audio:', error);
    }
}

// Note: chatHistory and currentChatId are already declared at the top of the file

// Helper function to clean up any duplicate chat input containers and other UI elements
function cleanupDuplicateChatInputs() {
    try {
        // Find all chat input containers
        const chatInputContainers = document.querySelectorAll('.chat-input-container');

        // If there's more than one, keep only the first one (the original)
        if (chatInputContainers.length > 1) {
            console.log(`Found ${chatInputContainers.length} chat input containers, removing duplicates`);

            // Keep the first one (index 0) and remove the rest
            for (let i = 1; i < chatInputContainers.length; i++) {
                chatInputContainers[i].remove();
            }

            // Make sure the remaining one is properly positioned
            const remainingContainer = document.querySelector('.chat-input-container');
            if (remainingContainer) {
                remainingContainer.style.position = 'fixed';
                remainingContainer.style.top = 'auto';
                remainingContainer.style.bottom = '24px';
                remainingContainer.style.transform = 'translate(-50%, 0)';
                remainingContainer.style.left = '50%';
                remainingContainer.style.marginLeft = '0';
                remainingContainer.style.right = 'auto';
            }
        }

        // Also check for duplicate chat forms
        const chatForms = document.querySelectorAll('#chatForm');
        if (chatForms.length > 1) {
            console.log(`Found ${chatForms.length} chat forms, removing duplicates`);

            // Keep the first one and remove the rest
            const originalForm = chatForms[0];
            for (let i = 1; i < chatForms.length; i++) {
                chatForms[i].remove();
            }

            // Make sure the original form is properly set up
            if (originalForm && typeof handleChatSubmit === 'function') {
                originalForm.onsubmit = handleChatSubmit;
            }
        }

        // Check for duplicate welcome containers
        const welcomeContainers = document.querySelectorAll('.welcome-container');
        if (welcomeContainers.length > 1) {
            console.log(`Found ${welcomeContainers.length} welcome containers, removing duplicates`);

            // Keep only the first one
            for (let i = 1; i < welcomeContainers.length; i++) {
                welcomeContainers[i].remove();
            }
        }

        // Check for duplicate greeting message containers
        const greetingContainers = document.querySelectorAll('#greetingMessageContainer');
        if (greetingContainers.length > 1) {
            console.log(`Found ${greetingContainers.length} greeting containers, removing duplicates`);

            // Keep only the first one
            for (let i = 1; i < greetingContainers.length; i++) {
                greetingContainers[i].remove();
            }
        }
    } catch (error) {
        console.error('Error cleaning up duplicate chat inputs:', error);
    }
}

// Handle starting a new chat (saves current chat first)
function handleStartNewChat() {
    try {
        console.log('handleStartNewChat called in app-integration.js');

        // Explicitly set local currentChatId to null to ensure a new chat is created on the next message
        currentChatId = null;

        // Use the centralized handler if available
        if (window.newChatHandler && typeof window.newChatHandler.startNewChat === 'function') {
            console.log('Delegating to centralized new chat handler');
            window.newChatHandler.startNewChat();
            return;
        }

        console.log('Centralized handler not available, using local implementation');

        // Clean up any duplicate chat input containers that might exist
        cleanupDuplicateChatInputs();

        // Save current chat if there are messages
        const messages = document.querySelectorAll('.message');
        if (messages.length > 0 && currentChatId) {
            console.log(`Saving current chat (${currentChatId}) before creating new one`);
            saveCurrentChat();
        }

        // Generate a new chat ID but don't save it to localStorage yet
        // We'll only save it when the user actually sends a message
        const newChatId = 'chat_' + Date.now();
        console.log(`Generated new chat ID: ${newChatId}`);

        // Update global variables
        currentChatId = newChatId;
        window.currentChatId = newChatId;
        window.loadedFromSearch = false;

        // Update URL to remove chat parameter when starting a new chat
        const url = new URL(window.location.href);
        url.searchParams.delete('chat');
        window.history.pushState({}, '', url);

        // Get existing chats
        let savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');

        // Remove any empty chats (chats with no messages and title "New Chat")
        savedChats = savedChats.filter(chat => {
            if (chat.title === 'New Chat' && (!chat.messages || chat.messages.length === 0)) {
                console.log(`Removing empty chat with ID ${chat.id}`);
                return false;
            }
            return true;
        });

        // Save back to localStorage (without adding a new empty chat)
        localStorage.setItem('ziahr_chats', JSON.stringify(savedChats));
        console.log('Removed empty chats from localStorage');

        // Reset file manager if it exists
        if (window.fileManager) {
            window.fileManager.reset();
            console.log('File manager reset completely');
        }

        // Clear the chat messages area
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            // Clear UI
            chatMessages.innerHTML = '';

            // Remove the welcome-removed class if it exists
            document.body.classList.remove('welcome-removed');

            // Reset the chat input container position
            const chatInputContainer = document.querySelector('.chat-input-container');
            if (chatInputContainer) {
                // Ensure the chat input is properly positioned at the bottom
                chatInputContainer.style.position = 'fixed';
                chatInputContainer.style.top = 'auto';
                chatInputContainer.style.bottom = '24px';
                chatInputContainer.style.transform = 'translate(-50%, 0)';
                chatInputContainer.style.left = '50%';
                chatInputContainer.style.marginLeft = '0';
                chatInputContainer.style.right = 'auto';
                console.log('Reset chat input container position for new chat');
            }

            // Show the greeting message if the user is logged in
            const userData = JSON.parse(localStorage.getItem('user_data') || 'null');
            if (userData && typeof window.updateGreetingMessage === 'function') {
                window.updateGreetingMessage(userData);
                console.log('Greeting message shown for new chat');
                if (typeof window.ensureChatInputCentered === 'function') {
                    window.ensureChatInputCentered();
                }
            }

            // Add only the welcome message (not a duplicate input container)
            chatMessages.innerHTML = `
                <div class="welcome-container">
                    <div class="welcome-message">
                        <h2>Welcome to HR Assistant</h2>
                        <p>I can help you with questions about company policies, employee guidelines, and HR procedures.</p>
                        <div class="suggestion-chips">
                            <button class="suggestion-chip">Leave Policy</button>
                            <button class="suggestion-chip">Referral Program</button>
                            <button class="suggestion-chip">Dress Code</button>
                            <button class="suggestion-chip">Work from Home</button>
                        </div>
                    </div>
                </div>
            `;

            // Set up suggestion chips
            const suggestionChips = document.querySelectorAll('.welcome-container .suggestion-chip');
            suggestionChips.forEach(chip => {
                chip.addEventListener('click', function() {
                    const suggestion = this.textContent.trim();
                    handleSuggestion(suggestion);
                });
            });

            // Make sure we're using the original chat form and input elements
            const originalChatForm = document.getElementById('chatForm');
            const originalUserInput = document.getElementById('userInput');
            const originalSendBtn = document.getElementById('sendBtn');

            if (originalChatForm && originalUserInput && originalSendBtn) {
                // Re-attach event listeners to the original form
                originalChatForm.onsubmit = handleChatSubmit;

                // Make sure the input field is empty
                originalUserInput.value = '';
                originalUserInput.style.height = 'auto';

                // Disable the send button
                originalSendBtn.disabled = true;

                console.log('Re-attached event listeners to original chat form elements');
            }
        }

        // Handle sidebar state
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            if (window.innerWidth <= 768) {
                // On mobile, just remove active state
                sidebar.classList.remove('active');
            } else if (localStorage.getItem('sidebarCollapsed') === 'true') {
                // On desktop, maintain collapsed state if that was the user's preference
                sidebar.classList.add('collapsed');
            }
        }

        // Update the chat history sidebar
        loadSavedChats();

        console.log('New chat started successfully');
    } catch (error) {
        console.error('Error starting new chat with history saving:', error);
    }
}

// Save the current chat to localStorage
function saveCurrentChat(updateTimestamp = false) {
    try {
        console.log('saveCurrentChat called');
        if (!currentChatId) {
            console.log('No current chat to save');
            return;
        }

        console.log(`Saving current chat with ID: ${currentChatId}`);

        // Get all messages from the UI
        const messages = document.querySelectorAll('.message');
        if (messages.length === 0) {
            console.log('No messages to save');
            return;
        }

        // Get saved chats to check if this chat already exists
        let savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');
        const existingChat = savedChats.find(c => c.id === currentChatId);

        // Determine the title - preserve existing title if it exists and isn't the default
        let title = 'New Chat';
        if (existingChat && existingChat.title && existingChat.title !== 'New Chat') {
            // Keep the existing title (especially if it was renamed)
            title = existingChat.title;
            console.log(`Preserving existing chat title: "${title}"`);
        } else {
            // Use first user message as title for new chats
            title = getFirstUserMessage(messages) || 'New Chat';
            console.log(`Using first user message for title: "${title}"`);
        }

        // Create chat object with minimal metadata
        const chat = {
            id: currentChatId,
            title: title,
            timestamp: (updateTimestamp || !(existingChat && existingChat.timestamp))
                ? new Date().toISOString()
                : existingChat.timestamp
        };

        // Check if chat already exists
        const existingChatIndex = savedChats.findIndex(c => c.id === currentChatId);
        if (existingChatIndex !== -1) {
            // Update existing chat
            savedChats[existingChatIndex] = chat;
        } else {
            // Add new chat
            savedChats.push(chat);
        }

        console.log('Saving chat object:', chat);
        localStorage.setItem('ziahr_chats', JSON.stringify(savedChats));
        console.log('ziahr_chats after saving:', localStorage.getItem('ziahr_chats'));

        // Update chat item in sidebar if it exists
        const chatItem = document.querySelector(`.chat-history-item[data-id="${currentChatId}"]`);
        if (chatItem) {
            const titleElement = chatItem.querySelector('.chat-title');
            if (titleElement) {
                titleElement.textContent = title;
            }
        }

        console.log('Chat saved successfully');
    } catch (error) {
        console.error('Error saving chat:', error);
    }
}

// Fix any chats with invalid timestamps
function fixChatTimestamps(chats) {
    let fixed = false;
    const now = new Date();

    chats.forEach(chat => {
        if (!chat.timestamp || isNaN(new Date(chat.timestamp).getTime())) {
            console.warn(`Fixing invalid timestamp for chat "${chat.title}" (${chat.id})`);
            chat.timestamp = now.toISOString();
            fixed = true;
        }
    });

    return fixed;
}

// Load saved chats from localStorage and populate sidebar
function loadSavedChats() {
    try {
        console.log('loadSavedChats called');
        const chatHistoryElement = document.getElementById('chatHistory');
        if (!chatHistoryElement) {
            console.error('Chat history element not found');
            return;
        }

        // Clear chat history
        chatHistoryElement.innerHTML = '';

        // Get saved chats
        let savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');
        console.log('Loaded savedChats from localStorage:', savedChats);

        // Filter out empty chats (chats with no messages and title "New Chat")
        savedChats = savedChats.filter(chat => {
            if (chat.title === 'New Chat' && (!chat.messages || chat.messages.length === 0)) {
                console.log(`Filtering out empty chat with ID ${chat.id} from sidebar`);
                return false;
            }
            return true;
        });

        // Fix any invalid timestamps
        const timestampsFixed = fixChatTimestamps(savedChats);
        if (timestampsFixed) {
            console.log('Fixed invalid timestamps in saved chats');
        }

        // Save filtered chats back to localStorage
        localStorage.setItem('ziahr_chats', JSON.stringify(savedChats));

        // Add chats to sidebar
        if (savedChats.length === 0) {
            // Use sample data for demonstration
            createSampleChatHistory(chatHistoryElement);
        } else {
            // Group chats by date
            console.log(`Processing ${savedChats.length} chats to add to sidebar.`);
            const now = new Date();
            const todayMidnight = getLocalMidnight(now);
            const yesterdayMidnight = todayMidnight - 24 * 60 * 60 * 1000;
            const oneWeekAgoMidnight = todayMidnight - 7 * 24 * 60 * 60 * 1000;
            const oneMonthAgoMidnight = todayMidnight - 30 * 24 * 60 * 60 * 1000;

            let todayChats = [];
            let yesterdayChats = [];
            let previousWeekChats = [];
            let previousMonthChats = [];
            let olderChats = [];

            savedChats.forEach(chat => {
                // Parse the chat timestamp
                const chatMidnight = getLocalMidnight(chat.timestamp || 0);
                if (isNaN(chatMidnight)) {
                    todayChats.push(chat);
                    return;
                }
                if (chatMidnight === todayMidnight) {
                    todayChats.push(chat);
                } else if (chatMidnight === yesterdayMidnight) {
                    yesterdayChats.push(chat);
                } else if (chatMidnight >= oneWeekAgoMidnight && chatMidnight < yesterdayMidnight) {
                    previousWeekChats.push(chat);
                } else if (chatMidnight >= oneMonthAgoMidnight && chatMidnight < oneWeekAgoMidnight) {
                    previousMonthChats.push(chat);
                } else if (chatMidnight < oneMonthAgoMidnight) {
                    olderChats.push(chat);
                }
            });

            // Sort each group by timestamp (newest first)
            todayChats.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
            yesterdayChats.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
            previousWeekChats.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
            previousMonthChats.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
            olderChats.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

            // Add "Today" section
            if (todayChats.length > 0) {
                const todayHeader = document.createElement('div');
                todayHeader.className = 'chat-history-header';
                todayHeader.textContent = 'Today';
                chatHistoryElement.appendChild(todayHeader);
                todayChats.forEach(chat => addChatItem(chat, chatHistoryElement));
            }

            // Add "Yesterday" section
            if (yesterdayChats.length > 0) {
                const yesterdayHeader = document.createElement('div');
                yesterdayHeader.className = 'chat-history-header';
                yesterdayHeader.textContent = 'Yesterday';
                chatHistoryElement.appendChild(yesterdayHeader);
                yesterdayChats.forEach(chat => addChatItem(chat, chatHistoryElement));
            }

            // Add "Previous Week" section
            if (previousWeekChats.length > 0) {
                const previousWeekHeader = document.createElement('div');
                previousWeekHeader.className = 'chat-history-header';
                previousWeekHeader.textContent = 'Previous Week';
                chatHistoryElement.appendChild(previousWeekHeader);
                previousWeekChats.forEach(chat => addChatItem(chat, chatHistoryElement));
            }

            // Add "Previous Month" section
            if (previousMonthChats.length > 0) {
                const previousMonthHeader = document.createElement('div');
                previousMonthHeader.className = 'chat-history-header';
                previousMonthHeader.textContent = 'Previous Month';
                chatHistoryElement.appendChild(previousMonthHeader);
                previousMonthChats.forEach(chat => addChatItem(chat, chatHistoryElement));
            }

            // Group older chats by month
            if (olderChats.length > 0) {
                const monthGroups = {};

                olderChats.forEach(chat => {
                    const chatDate = new Date(chat.timestamp || 0);
                    const monthName = chatDate.toLocaleString('default', { month: 'long' });
                    const year = chatDate.getFullYear();
                    const monthKey = `${monthName} ${year}`;

                    if (!monthGroups[monthKey]) {
                        monthGroups[monthKey] = [];
                    }
                    monthGroups[monthKey].push(chat);
                });

                // Add each month group
                Object.keys(monthGroups).forEach(monthKey => {
                    const monthHeader = document.createElement('div');
                    monthHeader.className = 'chat-history-header';
                    monthHeader.textContent = monthKey;
                    chatHistoryElement.appendChild(monthHeader);
                    monthGroups[monthKey].forEach(chat => addChatItem(chat, chatHistoryElement));
                });
            }
        }

        console.log(`Loaded ${savedChats.length} saved chats`);
    } catch (error) {
        console.error('Error loading saved chats:', error);
    }
}

// Add demo chats to the history
function addDemoChats() {
    // Do nothing - we don't want to add demo chats anymore
    return;
}

// Create empty chat history (no sample chats)
function createSampleChatHistory(container) {
    // Do nothing - we don't want to create sample chats anymore
    return;
}

// Close all dropdown menus
function closeAllDropdowns() {
    const dropdowns = document.querySelectorAll('.chat-menu-dropdown');
    dropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
        setTimeout(() => {
            // Remove from document body
            if (document.body.contains(dropdown)) {
                document.body.removeChild(dropdown);
            }
        }, 200);
    });

    // Remove click event listener
    document.removeEventListener('click', closeDropdownOnClickOutside);
}

// Close dropdown when clicking outside
function closeDropdownOnClickOutside(e) {
    if (!e.target.closest('.chat-menu-dropdown') && !e.target.closest('.chat-history-item-menu')) {
        closeAllDropdowns();
    }
}

// Show notification dialog
function showNotificationDialog(title, message, buttonText = 'OK') {
    // For success notifications about archiving, deleting, etc., use toast instead
    if ((title.includes('Archived') || title.includes('Deleted') || title.includes('Restored')) &&
        message.includes('successfully')) {
        showToastNotification(title, message);
        return;
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'notification-dialog-overlay';
    document.body.appendChild(overlay);

    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'notification-dialog light-theme-notification';

    // Force light theme styling with inline styles
    dialog.style.backgroundColor = '#ffffff';
    dialog.style.color = '#333333';
    dialog.style.border = '1px solid rgba(0, 0, 0, 0.1)';
    dialog.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';

    dialog.innerHTML = `
        <div class="notification-dialog-header" style="color: #333333; font-weight: 600;">${title}</div>
        <div class="notification-dialog-content" style="color: #555555;">${message}</div>
        <div class="notification-dialog-footer">
            <button class="notification-dialog-button" style="background-color: #4285f4; color: white;">${buttonText}</button>
        </div>
    `;
    document.body.appendChild(dialog);

    // Add event listener to button
    const button = dialog.querySelector('.notification-dialog-button');
    button.addEventListener('click', () => {
        document.body.removeChild(overlay);
        document.body.removeChild(dialog);
    });

    // Add hover effect to button
    button.addEventListener('mouseover', () => {
        button.style.backgroundColor = '#3367d6';
    });

    button.addEventListener('mouseout', () => {
        button.style.backgroundColor = '#4285f4';
    });

    // Add event listener to overlay
    overlay.addEventListener('click', () => {
        document.body.removeChild(overlay);
        document.body.removeChild(dialog);
    });
}

// Show toast notification that auto-dismisses after 3 seconds
function showToastNotification(title, message, isError = false) {
    console.log(`Toast notification: ${title} - ${message} - isError: ${isError}`);

    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'simple-toast';

    // Add appropriate class based on message type
    if (isError) {
        toast.classList.add('error'); // Red for error
    } else {
        toast.classList.add('success'); // Green for success
    }

    // Format the message in a more elegant way
    let formattedMessage;

    if (isError) {
        // For error messages, simplify by showing just the message without the title
        formattedMessage = message;
    } else {
        // For success messages, show a simple message
        formattedMessage = message;
    }

    // Add appropriate icon based on message type
    const icon = isError ?
        '<i class="fas fa-exclamation-circle" style="margin-right: 10px; font-size: 16px;"></i>' :
        '<i class="fas fa-check-circle" style="margin-right: 10px; font-size: 16px;"></i>';

    toast.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; flex: 1;">
            ${icon}${formattedMessage}
        </div>
        <button class="toast-close-btn">&times;</button>
    `;

    // Use CSS classes for positioning instead of inline styles
    // This will ensure it uses the styles from notifications.css
    toast.style.zIndex = '9999';

    // Add to body
    document.body.appendChild(toast);

    // Add close button functionality
    const closeBtn = toast.querySelector('.toast-close-btn');
    closeBtn.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    });

    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Auto-dismiss after 5 seconds (increased from 3 for better visibility)
    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.classList.remove('show');

            // Remove from DOM after animation completes
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300); // Animation duration
        }
    }, 5000);
}

// Show confirmation dialog with custom buttons
function showConfirmationDialog(title, message, confirmText, cancelText, onConfirm) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'notification-dialog-overlay';
    document.body.appendChild(overlay);

    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'notification-dialog light-theme-notification';

    // Force light theme styling with inline styles
    dialog.style.backgroundColor = '#ffffff';
    dialog.style.color = '#333333';
    dialog.style.border = '1px solid rgba(0, 0, 0, 0.1)';
    dialog.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';

    dialog.innerHTML = `
        <div class="notification-dialog-header" style="color: #333333; font-weight: 600;">${title}</div>
        <div class="notification-dialog-content" style="color: #555555;">${message}</div>
        <div class="notification-dialog-footer">
            <button class="notification-dialog-button cancel-button" style="background-color: #f1f3f4; color: #333333; border: 1px solid #dadce0;">${cancelText}</button>
            <button class="notification-dialog-button confirm-button" style="background-color: #4285f4; color: white;">${confirmText}</button>
        </div>
    `;
    document.body.appendChild(dialog);

    // Style the confirm button (for delete actions)
    const confirmButton = dialog.querySelector('.confirm-button');
    if (confirmText.toLowerCase().includes('delete')) {
        confirmButton.style.backgroundColor = '#e53935';
    }

    // Add event listener to confirm button
    confirmButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
        document.body.removeChild(dialog);
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    });

    // Add hover effects to buttons
    confirmButton.addEventListener('mouseover', () => {
        if (confirmText.toLowerCase().includes('delete')) {
            confirmButton.style.backgroundColor = '#d32f2f';
        } else {
            confirmButton.style.backgroundColor = '#3367d6';
        }
    });

    confirmButton.addEventListener('mouseout', () => {
        if (confirmText.toLowerCase().includes('delete')) {
            confirmButton.style.backgroundColor = '#e53935';
        } else {
            confirmButton.style.backgroundColor = '#4285f4';
        }
    });

    // Add event listener to cancel button
    const cancelButton = dialog.querySelector('.cancel-button');
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
        document.body.removeChild(dialog);
    });

    // Add hover effects to cancel button
    cancelButton.addEventListener('mouseover', () => {
        cancelButton.style.backgroundColor = '#e8eaed';
    });

    cancelButton.addEventListener('mouseout', () => {
        cancelButton.style.backgroundColor = '#f1f3f4';
    });

    // Cancel when clicking overlay
    overlay.addEventListener('click', () => {
        document.body.removeChild(overlay);
        document.body.removeChild(dialog);
    });
}

// Make showConfirmationDialog available globally
window.showConfirmationDialog = showConfirmationDialog;

// Setup login functionality
function setupLoginFunctionality() {
    try {
        console.log('Setting up login functionality...');

        // Get elements
        const userAccountBtn = document.getElementById('userAccountBtn');
        const loginModal = document.getElementById('loginModal');
        const registerModal = document.getElementById('registerModal');
        const closeLoginModal = document.getElementById('closeLoginModal');
        const closeRegisterModal = document.getElementById('closeRegisterModal');
        const submitLogin = document.getElementById('submitLogin');
        const submitRegister = document.getElementById('submitRegister');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const fullNameInput = document.getElementById('fullName');
        const registerEmailInput = document.getElementById('registerEmail');
        const registerPasswordInput = document.getElementById('registerPassword');
        const companyNameInput = document.getElementById('companyName');
        const loginMessage = document.getElementById('loginMessage');
        const registerMessage = document.getElementById('registerMessage');
        const registerLink = document.getElementById('registerLink');
        const loginLink = document.getElementById('loginLink');
        const forgotPassword = document.getElementById('forgotPassword');

        // Check if login modal exists
        if (!loginModal) {
            console.error('Login modal not found');
            return;
        }

        // Setup password toggle functionality
        setupPasswordToggle();

        // Check if user is already logged in
        updateUserAccountUI();

        // We don't need to add a click handler here anymore
        // The user-account.js file handles this functionality

        // Close login modal
        closeLoginModal.addEventListener('click', () => {
            loginModal.style.display = 'none';
        });

        // Handle forgot password
        if (forgotPassword) {
            forgotPassword.addEventListener('click', (e) => {
                e.preventDefault();
                showNotificationDialog('Forgot Password', 'A password reset link has been sent to your email address.', 'OK');
            });
        }

        // Submit login
        submitLogin.addEventListener('click', async () => {
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            if (!username || !password) {
                // Show error message as a toast notification with simplified format
                showToastNotification('', 'Please enter both email and password.', true);
                return;
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(username)) {
                // Show error message as a toast notification with simplified format
                showToastNotification('', 'Please enter a valid email address.', true);
                return;
            }

            // Show loading message
            loginMessage.style.display = 'block';
            loginMessage.textContent = 'Logging in...';

            try {
                // Send login request to API
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: username,
                        password: password
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // Store token in localStorage
                    localStorage.setItem('auth_token', data.token);
                    localStorage.setItem('user_data', JSON.stringify(data.user));

                    // Hide the in-form message
                    loginMessage.style.display = 'none';

                    // Close modal
                    loginModal.style.display = 'none';

                    // Show success notification with simplified format
                    showToastNotification('', 'Login successful');

                    // Update UI to show logged in state
                    if (typeof updateUserAccountUI === 'function') {
                        updateUserAccountUI(data.user);
                    } else if (typeof window.updateUserAccountUI === 'function') {
                        window.updateUserAccountUI(data.user);
                    } else {
                        console.error('updateUserAccountUI function not found');
                        // Reload the page to ensure the UI is updated correctly
                        window.location.reload();
                    }

                    // Add the escalation button after successful login
                    if (typeof addEscalationButton === 'function') {
                         addEscalationButton();
                    } else if (typeof window.addEscalationButton === 'function') {
                         window.addEscalationButton();
                    } else {
                         console.error('addEscalationButton function not found');
                    }

                    // Check if there was a pre-login suggestion and use it
                    const preSuggestion = localStorage.getItem('pre_login_suggestion');
                    if (preSuggestion) {
                        // Clear the suggestion from localStorage
                        localStorage.removeItem('pre_login_suggestion');

                        // Wait a moment for the UI to update
                        setTimeout(() => {
                            // Submit the suggestion
                            if (typeof submitSuggestion === 'function') {
                                submitSuggestion(preSuggestion);
                            }
                        }, 1000);
                    }
                } else {
                    // Show error message as a toast notification with simplified format
                    const errorMessage = data.message || 'Login failed. Please try again.';
                    showToastNotification('', errorMessage, true);

                    // Hide the in-form message
                    loginMessage.style.display = 'none';
                    loginMessage.textContent = '';
                }
            } catch (error) {
                console.error('Error logging in:', error);
                // Show error message as a toast notification with simplified format
                showToastNotification('', 'An error occurred. Please try again.', true);

                // Hide the in-form message
                loginMessage.style.display = 'none';
                loginMessage.textContent = '';
            }
        });

        // Switch to register modal
        if (registerLink) {
            registerLink.addEventListener('click', (e) => {
                e.preventDefault();
                loginModal.style.display = 'none';
                registerModal.style.display = 'flex';
                fullNameInput.focus();
                registerMessage.textContent = '';
            });
        }

        // Also handle the hidden register link
        const registerLinkHidden = document.getElementById('registerLinkHidden');
        if (registerLinkHidden) {
            registerLinkHidden.addEventListener('click', (e) => {
                e.preventDefault();
                loginModal.style.display = 'none';
                registerModal.style.display = 'flex';
                fullNameInput.focus();
                registerMessage.textContent = '';
            });
        }

        // Switch to login modal
        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                registerModal.style.display = 'none';
                loginModal.style.display = 'flex';
                usernameInput.focus();
                loginMessage.textContent = '';
            });
        }

        // Also handle the hidden login link
        const loginLinkHidden = document.getElementById('loginLinkHidden');
        if (loginLinkHidden) {
            loginLinkHidden.addEventListener('click', (e) => {
                e.preventDefault();
                registerModal.style.display = 'none';
                loginModal.style.display = 'flex';
                usernameInput.focus();
                loginMessage.textContent = '';
            });
        }

        // Close register modal
        if (closeRegisterModal) {
            closeRegisterModal.addEventListener('click', () => {
                registerModal.style.display = 'none';
            });
        }

        // Submit register
        if (submitRegister) {
            submitRegister.addEventListener('click', async () => {
                const fullName = fullNameInput.value.trim();
                const email = registerEmailInput.value.trim();
                const password = registerPasswordInput.value.trim();
                const employeeIdInput = document.getElementById('employeeId'); // Get the new input element
                const employeeId = employeeIdInput ? employeeIdInput.value.trim() : ''; // Get value, handle case where element not found

                if (!fullName || !email || !password) {
                    // Show error message as a toast notification with simplified format
                    showToastNotification('', 'Please fill in all required fields.', true); // Updated message
                    return;
                }

                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    // Show error message as a toast notification with simplified format
                    showToastNotification('', 'Please enter a valid email address.', true);
                    return;
                }

                // Show loading message
                registerMessage.style.display = 'block';
                registerMessage.textContent = 'Creating account...';

                try {
                    // Send registration request to API
                    const response = await fetch('/api/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            full_name: fullName,
                            email: email,
                            password: password,
                            employee_id: employeeId // Send employee_id instead of company_name
                        })
                    });

                    const data = await response.json();

                    if (data.success) {
                        // Hide the in-form message
                        registerMessage.style.display = 'none';

                        // Close modal
                        registerModal.style.display = 'none';

                        // Show success notification with simplified format
                        showToastNotification('', 'Account created successfully');

                        // Open login modal
                        loginModal.style.display = 'flex';
                        usernameInput.value = email;
                        passwordInput.value = '';

                        // Show login message
                        loginMessage.style.display = 'block';
                        loginMessage.textContent = 'Please log in with your new account.';
                    } else {
                        // Show error message as a toast notification with simplified format
                        const errorMessage = data.message || 'Registration failed. Please try again.';
                        showToastNotification('', errorMessage, true);

                        // Hide the in-form message
                        registerMessage.style.display = 'none';
                        registerMessage.textContent = '';
                    }
                } catch (error) {
                    console.error('Error registering:', error);
                    // Show error message as a toast notification with simplified format
                    showToastNotification('', 'An error occurred. Please try again.', true);

                    // Hide the in-form message
                    registerMessage.style.display = 'none';
                    registerMessage.textContent = '';
                }
            });
        }

        console.log('Login functionality set up successfully');
    } catch (error) {
        console.error('Error setting up login functionality:', error);
    }
}

// Setup new chat button
function setupNewChatButton() {
    try {
        console.log('Setting up new chat button...');

        // Get the new chat button
        const newChatBtn = document.getElementById('newChatBtn');
        if (!newChatBtn) {
            console.error('New chat button not found in the DOM');
            return;
        }

        // Create a completely new button to replace the existing one (removes all event listeners)
        const newButton = document.createElement('button');
        newButton.id = 'newChatBtn';
        newButton.className = 'sidebar-action-btn';
        newButton.title = 'New Chat';
        // Use the appropriate icon based on the current theme
        // In dark mode, use white circle with black plus (new-chat-icon-dark-larger.svg)
        // In light mode, use black circle with white plus (new-chat-icon-larger.svg)
        const isDarkMode = document.body.classList.contains('theme-dark');
        const iconPath = isDarkMode ? '/static/img/new-chat-icon-dark-larger.svg' : '/static/img/new-chat-icon-larger.svg';
        newButton.innerHTML = `<img src="${iconPath}" alt="New Chat" class="new-chat-icon">`;
        console.log('Sidebar new chat icon set for theme:', isDarkMode ? 'dark' : 'light');

        // Replace the old button with the new one
        newChatBtn.parentNode.replaceChild(newButton, newChatBtn);

        // Add click event listener to the new button with a higher z-index
        newButton.style.position = 'relative';
        newButton.style.zIndex = '1050'; // Higher z-index to ensure it's clickable

        // Add click event listener to the new button
        newButton.addEventListener('click', function(event) {
            // Prevent default behavior
            event.preventDefault();
            event.stopPropagation();

            console.log('New chat button clicked');

            // Save the current chat if it exists
            if (currentChatId) {
                console.log(`Saving current chat (${currentChatId}) before creating new one`);
                saveCurrentChat();
            }

            // Generate a new chat ID
            const newChatId = 'chat_' + Date.now();
            console.log(`Generated new chat ID: ${newChatId}`);

            // Update global variables
            currentChatId = newChatId;
            window.currentChatId = newChatId;
            window.loadedFromSearch = false;

            // Get existing chats
            let savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');

            // Remove any empty chats (chats with no messages and title "New Chat")
            savedChats = savedChats.filter(chat => {
                if (chat.title === 'New Chat' && (!chat.messages || chat.messages.length === 0)) {
                    console.log(`Removing empty chat with ID ${chat.id}`);
                    return false;
                }
                return true;
            });

            // We don't create an empty chat in localStorage anymore
            // We'll only save it when the user actually sends a message

            // Save back to localStorage (without adding a new empty chat)
            localStorage.setItem('ziahr_chats', JSON.stringify(savedChats));
            console.log(`Removed empty chats from localStorage`);

            // Clear the chat messages area
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                chatMessages.innerHTML = '';

                // Check if user is logged in before adding welcome message
                const isLoggedIn = !!localStorage.getItem('user_data');

                if (!isLoggedIn) {
                    // Only add welcome message if user is not logged in
                    chatMessages.innerHTML = `
                        <div class="welcome-container">
                            <div class="welcome-message">
                                <h2>Welcome to HR Assistant</h2>
                                <p>I can help you with questions about company policies, employee guidelines, and HR procedures.</p>
                                <div class="suggestion-chips">
                                    <button class="suggestion-chip">Leave Policy</button>
                                    <button class="suggestion-chip">Referral Program</button>
                                    <button class="suggestion-chip">Dress Code</button>
                                    <button class="suggestion-chip">Work from Home</button>
                                </div>
                            </div>
                        </div>
                    `;
                }

                // Set up suggestion chips
                const suggestionChips = document.querySelectorAll('.suggestion-chip');
                suggestionChips.forEach(chip => {
                    chip.addEventListener('click', function() {
                        const suggestion = this.textContent.trim();
                        handleSuggestion(suggestion);
                    });
                });
            }

            // Clear the user input field
            const userInput = document.getElementById('userInput');
            if (userInput) {
                userInput.value = '';
                userInput.style.height = 'auto';
            }

            // Disable the send button
            const sendBtn = document.getElementById('sendBtn');
            if (sendBtn) {
                sendBtn.disabled = true;
            }

            // Clear file manager if it exists
            if (window.fileManager) {
                window.fileManager.clearFiles();
            }

            // Update the chat history sidebar
            loadSavedChats();

            console.log('New chat created successfully');
        });

        // Add tooltip functionality
        newButton.addEventListener('mouseover', () => {
            // Create tooltip if it doesn't exist
            let tooltip = document.getElementById('newChatTooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'newChatTooltip';
                tooltip.className = 'tooltip';
                tooltip.textContent = 'New Chat';
                document.body.appendChild(tooltip);
            }

            // Position tooltip
            const btnRect = newButton.getBoundingClientRect();
            tooltip.style.top = (btnRect.top + btnRect.height + 5) + 'px';
            tooltip.style.left = (btnRect.left + btnRect.width/2 - 40) + 'px';
            tooltip.style.display = 'block';
        });

        // Hide tooltip on mouseout
        newButton.addEventListener('mouseout', () => {
            const tooltip = document.getElementById('newChatTooltip');
            if (tooltip) {
                tooltip.style.display = 'none';
            }
        });

        console.log('New chat button setup complete');
    } catch (error) {
        console.error('Error setting up new chat button:', error);
    }
}

// Setup password toggle functionality
function setupPasswordToggle() {
    try {
        const passwordInputs = document.querySelectorAll('input[type="password"]');

        passwordInputs.forEach(input => {
            // Find the toggle button
            const wrapper = input.closest('.password-input-wrapper');
            if (!wrapper) return;

            const toggleBtn = wrapper.querySelector('.password-toggle-btn');
            if (!toggleBtn) return;

            // Add click event to toggle password visibility
            toggleBtn.addEventListener('click', () => {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);

                // Toggle icon
                const icon = toggleBtn.querySelector('i');
                if (icon) {
                    if (type === 'password') {
                        icon.classList.remove('fa-eye-slash');
                        icon.classList.add('fa-eye');
                    } else {
                        icon.classList.remove('fa-eye');
                        icon.classList.add('fa-eye-slash');
                    }
                }
            });
        });

        console.log('Password toggle functionality set up');
    } catch (error) {
        console.error('Error setting up password toggle:', error);
    }
}

// Analytics tracking and export functionality removed

// Helper function to add a chat item to the history
function addChatItem(chat, container) {
    console.log('addChatItem called for chat:', chat); // Added console log
    // Skip empty chats (chats with no messages and title "New Chat")
    if (chat.title === 'New Chat' && (!chat.messages || chat.messages.length === 0)) {
        console.log(`Skipping empty chat with ID ${chat.id} in addChatItem`);
        return;
    }

    const chatItem = document.createElement('div');
    chatItem.className = 'chat-history-item';
    if (chat.id === currentChatId) {
        chatItem.classList.add('active');
    }

    // Create chat item with title and ellipsis menu
    chatItem.innerHTML = `
        <div class="chat-history-item-content">
            <div class="chat-history-item-title">${chat.title}</div>
        </div>
        <div class="chat-history-item-menu">
            <i class="fas fa-ellipsis-h"></i>
        </div>
    `;
    chatItem.setAttribute('data-id', chat.id);

    // Add click event to the chat item content
    chatItem.addEventListener('click', () => {
        // When clicking from sidebar, it's not from search
        loadChat(chat.id, false);
    });

    // Add double-click event to the title for quick renaming
    const titleElement = chatItem.querySelector('.chat-history-item-title');
    if (titleElement) {
        titleElement.addEventListener('dblclick', (e) => {
            e.stopPropagation(); // Prevent triggering the chat item click
            renameChat(chat.id);
        });
    }

    // Add click event to the ellipsis menu
    const menuBtn = chatItem.querySelector('.chat-history-item-menu');
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        // Close any open dropdowns first
        closeAllDropdowns();

        // Create dropdown menu
        const dropdown = document.createElement('div');
        dropdown.className = 'chat-menu-dropdown';
        dropdown.innerHTML = `
            <div class="chat-menu-item rename">
                <i class="fas fa-edit"></i> Rename
            </div>
            <div class="chat-menu-item archive">
                <i class="fas fa-archive"></i> Archive
            </div>
            <div class="chat-menu-item share">
                <i class="fas fa-share-alt"></i> Share
            </div>
            <div class="chat-menu-item download">
                <i class="fas fa-download"></i> Download
            </div>
            <div class="chat-menu-item delete">
                <i class="fas fa-trash-alt"></i> Delete
            </div>
        `;

        // Add event listeners to menu items
        const renameItem = dropdown.querySelector('.chat-menu-item.rename');
        renameItem.addEventListener('click', (e) => {
            e.stopPropagation();
            renameChat(chat.id);
            closeAllDropdowns();
        });

        const archiveItem = dropdown.querySelector('.chat-menu-item.archive');
        archiveItem.addEventListener('click', (e) => {
            e.stopPropagation();
            archiveChat(chat.id);
            closeAllDropdowns();
        });

        const shareItem = dropdown.querySelector('.chat-menu-item.share');
        shareItem.addEventListener('click', (e) => {
            e.stopPropagation();
            shareChat(chat.id);
            closeAllDropdowns();
        });

        const downloadItem = dropdown.querySelector('.chat-menu-item.download');
        downloadItem.addEventListener('click', (e) => {
            e.stopPropagation();
            downloadChat(chat.id);
            closeAllDropdowns();
        });

        const deleteItem = dropdown.querySelector('.chat-menu-item.delete');
        deleteItem.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
            closeAllDropdowns();
        });

        // Add dropdown to the document body for proper positioning
        document.body.appendChild(dropdown);

        // Position the dropdown next to the menu button
        const rect = menuBtn.getBoundingClientRect();

        // Calculate the best position for the dropdown
        let top = rect.top;
        let left = rect.right + 5; // Position to the right of the menu button with a small gap

        // Check if sidebar is collapsed
        const sidebar = document.getElementById('sidebar');
        const isSidebarCollapsed = sidebar && sidebar.classList.contains('collapsed');

        // Get the dropdown dimensions
        const dropdownRect = dropdown.getBoundingClientRect();

        // Check if the dropdown would go off the bottom of the screen
        if (top + dropdownRect.height > window.innerHeight) {
            top = Math.max(window.innerHeight - dropdownRect.height - 10, 0);
        }

        // Check if the dropdown would go off the right of the screen
        if (left + dropdownRect.width > window.innerWidth) {
            left = rect.left - dropdownRect.width - 5; // Position to the left of the menu button
        }

        // If sidebar is collapsed, adjust position to ensure dropdown is visible
        if (isSidebarCollapsed) {
            // Make sure dropdown is not too close to the left edge
            left = Math.max(left, 70); // 70px gives some space from the collapsed sidebar
        }

        // Apply the calculated position
        dropdown.style.top = top + 'px';
        dropdown.style.left = left + 'px';

        // Show dropdown
        setTimeout(() => {
            dropdown.classList.add('active');
        }, 10);

        // Add click event to document to close dropdown when clicking outside
        document.addEventListener('click', closeDropdownOnClickOutside);
    });

    // Prepend to container instead of append (add to top)
    if (container.firstChild && container.firstChild.className === 'chat-history-header') {
        // Insert after the header
        container.insertBefore(chatItem, container.firstChild.nextSibling);
    } else {
        // Insert at the beginning if no header
        container.insertBefore(chatItem, container.firstChild);
    }
}

// Download a chat as markdown
function downloadChat(chatId) {
    try {
        console.log(`Downloading chat with ID: ${chatId}`);

        // Find the chat in history
        const chat = chatHistory.find(c => c.id === chatId);
        if (!chat) {
            console.error(`Chat with ID ${chatId} not found`);
            return;
        }

        // Prepare chat content
        let content = '# ZiaHR Chat Export\n\n';
        content += `Title: ${chat.title}\n`;
        content += `Exported on: ${new Date().toLocaleString()}\n\n`;

        // Add messages
        chat.messages.forEach(message => {
            content += `## ${message.type === 'user' ? 'You' : 'ZiaHR'}\n\n`;
            content += `${message.type === 'user' ? message.content : message.content.replace(/<[^>]*>/g, '')}\n\n`;
        });

        // Create and download file
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `ziahr-chat-${chat.id}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`Chat with ID ${chatId} downloaded successfully`);
    } catch (error) {
        console.error('Error downloading chat:', error);
    }
}

// Delete a chat from history
function deleteChat(chatId) {
    try {
        console.log(`Deleting chat with ID: ${chatId}`);

        // Find the chat in history to get its title
        const chatToDelete = chatHistory.find(c => c.id === chatId);
        if (!chatToDelete) {
            console.error(`Chat with ID ${chatId} not found`);
            return;
        }

        // Get saved chats to check if this is the last one
        let savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');
        const isLastChat = savedChats.length === 1;

        // Use custom confirmation dialog instead of browser confirm
        showConfirmationDialog(
            'Delete Chat',
            `Are you sure you want to delete "${chatToDelete.title}"? This action cannot be undone.`,
            'Delete',
            'Cancel',
            () => {
                // If this is the last chat, set the flag before deleting
                if (isLastChat) {
                    localStorage.setItem('all_chats_deleted', 'true');
                    console.log('Setting all_chats_deleted flag to true');
                }
                // This code runs if user confirms deletion
                deleteConfirmedChat(chatId);
            }
        );

        // Return early - the actual deletion happens in the callback
        return;
    } catch (error) {
        console.error('Error deleting chat:', error);
    }
}

// Function to handle chat deletion after confirmation
function deleteConfirmedChat(chatId) {
    try {
        console.log(`Proceeding with deletion of chat ID: ${chatId}`);

        // Get saved chats
        let savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');

        // Find the chat to get its title for the notification
        const chatToDelete = savedChats.find(chat => chat.id === chatId);
        if (!chatToDelete) {
            console.error(`Chat with ID ${chatId} not found`);
            return;
        }

        const chatTitle = chatToDelete.title;

        // Remove the chat
        savedChats = savedChats.filter(chat => chat.id !== chatId);

        // Check if this was the last chat
        if (savedChats.length === 0) {
            // Set a flag to prevent sample chats from being added
            localStorage.setItem('all_chats_deleted', 'true');
        }

        // Save back to localStorage
        localStorage.setItem('ziahr_chats', JSON.stringify(savedChats));

        // Update chat history
        chatHistory = savedChats;

        // If the current chat is being deleted, start a new chat
        if (currentChatId === chatId) {
            currentChatId = null;
            window.currentChatId = null;
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                // Clear UI and show welcome message with input container
                chatMessages.innerHTML = `
                    <div class="welcome-container">
                        <div class="welcome-message">
                            <h2>Welcome to HR Assistant</h2>
                            <p>I can help you with questions about company policies, employee guidelines, and HR procedures.</p>
                            <div class="suggestion-chips">
                                <button class="suggestion-chip">Leave Policy</button>
                                <button class="suggestion-chip">Referral Program</button>
                                <button class="suggestion-chip">Dress Code</button>
                                <button class="suggestion-chip">Work from Home</button>
                            </div>
                        </div>
                    </div>
`;

                // Set up suggestion chips
                const suggestionChips = document.querySelectorAll('.suggestion-chip');
                suggestionChips.forEach(chip => {
                    chip.addEventListener('click', function() {
                        const suggestion = this.textContent.trim();
                        if (typeof window.submitSuggestion === 'function') {
                            window.submitSuggestion(suggestion);
                        }
                    });
                });
            }
        }

        // Reload chat history
        loadSavedChats();

        // Show success notification
        showToastNotification('', `"${chatTitle}" has been deleted successfully.`);

        console.log(`Chat with ID ${chatId} deleted successfully`);
    } catch (error) {
        console.error('Error in deleteConfirmedChat:', error);
        showNotificationDialog('Error', 'Failed to delete the chat. Please try again.', 'OK');
    }
}

// Function to load a chat from URL parameter
function loadChatFromUrl(chatId) {
    try {
        // Find the chat in saved chats
        let savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');
        const chat = savedChats.find(c => c.id === chatId);

        if (chat) {
            // Load the chat
            loadChat(chatId, false);
        } else {
            console.error(`Chat with ID ${chatId} not found in saved chats`);
        }
    } catch (error) {
        console.error('Error loading chat from URL:', error);
    }
}

// Load a specific chat by ID
async function loadChat(chatId, fromSearch = false) {
    try {
        console.log(`Loading chat with ID: ${chatId}${fromSearch ? ' from search' : ''}`);

        // Remove any existing typing indicator
        removeTypingIndicator();

        // Save current chat first if there are messages
        const messages = document.querySelectorAll('.message');
        if (messages.length > 0 && currentChatId !== chatId) {
            saveCurrentChat(false); // Do not update timestamp when just opening a chat
        }

        // Set current chat ID
        currentChatId = chatId;
        window.currentChatId = chatId;

        // Store whether this chat was loaded from search
        window.loadedFromSearch = fromSearch;

        // Update URL with chat ID parameter without reloading the page
        const url = new URL(window.location.href);
        url.searchParams.set('chat', chatId);
        window.history.pushState({}, '', url);

        // Reset file manager if it exists
        if (window.fileManager) {
            window.fileManager.reset();
            console.log('File manager reset when loading chat');
        }

        // Clear chat messages
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) {
            console.error('Chat messages container not found');
            return;
        }

        chatMessages.innerHTML = '';

        // Fetch total message count first
        const countResponse = await fetch(`/api/chats/${chatId}/count`); // Assuming a new endpoint for count
        const countData = await countResponse.json();

        if (!countData.success) {
            throw new Error(countData.error || 'Failed to get message count');
        }

        const totalMessages = countData.count;
        console.log(`Chat ${chatId} has ${totalMessages} messages.`);

        // If the chat is empty, show the welcome message instead of loading indicator
        if (totalMessages === 0) {
             // Check if user is logged in before adding welcome message
            const isLoggedIn = !!localStorage.getItem('user_data');

            if (!isLoggedIn) {
                // Only add welcome message if user is not logged in
                chatMessages.innerHTML = `
                    <div class="welcome-container">
                        <div class="welcome-message">
                            <h2>Welcome to HR Assistant</h2>
                            <p>I can help you with questions about company policies, employee guidelines, and HR procedures.</p>
                            <div class="suggestion-chips">
                                <button class="suggestion-chip">Leave Policy</button>
                                <button class="suggestion-chip">Referral Program</button>
                                <button class="suggestion-chip">Dress Code</button>
                                <button class="suggestion-chip">Work from Home</button>
                            </div>
                        </div>
                    </div>
                `;
            }
             // Also ensure the chat input is centered for a new chat
            const chatInputContainer = document.querySelector('.chat-input-container');
            if (chatInputContainer) {
                 chatInputContainer.style.position = 'fixed';
                 chatInputContainer.style.top = 'auto';
                 chatInputContainer.style.bottom = '24px';
                 chatInputContainer.style.transform = 'translate(-50%, 0)';
                 chatInputContainer.style.left = '50%';
                 chatInputContainer.style.marginLeft = '0';
                 chatInputContainer.style.right = 'auto';
                 document.body.classList.remove('welcome-removed'); // Ensure welcome state classes are correct
                 console.log('Reset chat input container position for new chat');
            }

            // Set up suggestion chips
            const suggestionChips = document.querySelectorAll('.welcome-container .suggestion-chip');
            suggestionChips.forEach(chip => {
                chip.addEventListener('click', function() {
                    const suggestion = this.textContent.trim();
                    handleSuggestion(suggestion);
                });
            });

            // Clear input field and disable send button
            const userInput = document.getElementById('userInput');
            const sendBtn = document.getElementById('sendBtn');
            if(userInput) userInput.value = '';
            if(sendBtn) sendBtn.disabled = true;

            isLoading = false; // Ensure isLoading is false for empty chat
            hasMoreMessages = false; // No messages to load

        } else {
             // Initialize virtual scroll container only for chats with messages
            const virtualScrollContainer = document.createElement('div');
            virtualScrollContainer.className = 'virtual-scroll-container';
            chatMessages.appendChild(virtualScrollContainer);

            // Track pagination state
            let currentPage = 1;
            const pageSize = 20;
            let isLoading = false;
            let hasMoreMessages = true;

             // Add scroll event listener for infinite scroll only for chats with messages
            chatMessages.addEventListener('scroll', async () => {
                if (chatMessages.scrollTop === 0 && !isLoading && hasMoreMessages) {
                    currentPage++;
                    await loadMessages(currentPage);
                }
            });

            // Function to load messages for a specific page
            async function loadMessages(page) {
                if (isLoading || !hasMoreMessages) return;

                isLoading = true;

                // Add loading indicator
                const loadingIndicator = document.createElement('div');
                loadingIndicator.className = 'loading-messages';
                loadingIndicator.textContent = 'Loading messages...';
                // Add indicator at the top of the virtual scroll container
                virtualScrollContainer.insertBefore(loadingIndicator, virtualScrollContainer.firstChild);

                try {
                    const response = await fetch(`/api/chats/${chatId}?page=${page}&page_size=${pageSize}`);
                    const data = await response.json();

                    if (!data.success) {
                        throw new Error(data.error || 'Failed to load messages');
                    } else if (data.messages.length === 0 && page > 1) {
                         // If no messages returned for subsequent pages, indicate no more messages
                         hasMoreMessages = false;
                    }

                    // Remove loading indicator
                    loadingIndicator.remove();

                    // Update pagination state
                    // hasMoreMessages = page < data.pagination.total_pages; // Re-evaluate this logic based on actual message count
                    if(data.messages.length < pageSize) { // If fewer messages than page size, assume no more pages
                         hasMoreMessages = false;
                    }

                    // Add messages to virtual scroll container
                    // Need to prepend messages for infinite scroll (loading older messages)
                    const fragment = document.createDocumentFragment();
                    data.messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.type}-message`;

            const contentElement = document.createElement('div');
            contentElement.className = 'message-content';

                         if (message.type === 'bot' || message.type === 'system') { // Handle system messages similarly to bot for rendering
                            contentElement.innerHTML = marked.parse(message.content); // Parse markdown for bot/system messages

                // Add footer with timestamp and feedback buttons
                const footerElement = document.createElement('div');
                footerElement.className = 'message-footer';

                             // Create feedback element first (only for bot messages, not system)
                             if (message.type === 'bot') {
                const feedbackElement = document.createElement('div');
                feedbackElement.className = 'message-feedback';

                // Create a unique ID for this set of feedback buttons
                const feedbackId = 'feedback-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                feedbackElement.id = feedbackId;

                // Create copy button
                const copyBtn = document.createElement('button');
                copyBtn.className = 'feedback-btn copy-btn';
                copyBtn.innerHTML = '<i class="far fa-copy"></i>';
                copyBtn.setAttribute('title', 'Copy to clipboard');
                                 copyBtn.onclick = () => {
                                     // Use textContent for accurate copy, not innerHTML
                                     const textToCopy = contentElement.textContent;
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        // Show temporary success state
                        copyBtn.classList.add('active');
                        const originalIcon = copyBtn.innerHTML;
                        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                        setTimeout(() => {
                            copyBtn.classList.remove('active');
                            copyBtn.innerHTML = originalIcon;
                        }, 1500);
                                     }).catch(err => console.error('Failed to copy text: ', err));
                };

                // Create thumbs up button
                const thumbsUpBtn = document.createElement('button');
                thumbsUpBtn.className = 'feedback-btn thumbs-up';
                thumbsUpBtn.innerHTML = '<i class="far fa-thumbs-up"></i>';
                                 thumbsUpBtn.setAttribute('title', 'Helpful');
                thumbsUpBtn.onclick = function() {
                    // Toggle active state
                    if (thumbsUpBtn.classList.contains('active')) {
                        thumbsUpBtn.classList.remove('active');
                    } else {
                        thumbsUpBtn.classList.add('active');
                                         const thumbsDownBtn = this.closest('.message-footer').querySelector('.thumbs-down');
                                         if (thumbsDownBtn) thumbsDownBtn.classList.remove('active');
                    }
                };

                // Create thumbs down button
                const thumbsDownBtn = document.createElement('button');
                thumbsDownBtn.className = 'feedback-btn thumbs-down';
                thumbsDownBtn.innerHTML = '<i class="far fa-thumbs-down"></i>';
                                 thumbsDownBtn.setAttribute('title', 'Not helpful');
                thumbsDownBtn.onclick = function() {
                    // Toggle active state
                    if (thumbsDownBtn.classList.contains('active')) {
                        thumbsDownBtn.classList.remove('active');
                    } else {
                        thumbsDownBtn.classList.add('active');
                                          const thumbsUpBtn = this.closest('.message-footer').querySelector('.thumbs-up');
                                         if (thumbsUpBtn) thumbsUpBtn.classList.remove('active');
                    }
                };

                // Create audio button
                const audioBtn = document.createElement('button');
                audioBtn.className = 'feedback-btn audio-btn';
                audioBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                audioBtn.setAttribute('title', 'Read aloud');
                audioBtn.setAttribute('data-speaking', 'false');
                audioBtn.onclick = function() {
                    // Check if already speaking
                    if (audioBtn.getAttribute('data-speaking') === 'true') {
                        // Stop speech
                        window.speechSynthesis.cancel();
                        audioBtn.classList.remove('active');
                        audioBtn.setAttribute('data-speaking', 'false');
                        audioBtn.setAttribute('title', 'Read aloud');
                        audioBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                        return;
                    }

                    // Read the message aloud using text-to-speech
                                     const textToSpeak = contentElement.textContent; // Use textContent to avoid reading HTML tags
                    const utterance = new SpeechSynthesisUtterance(textToSpeak);

                                     // Store the utterance on the button element for later access
                    audioBtn.utterance = utterance;

                    // Set up event handlers
                    utterance.onend = function() {
                        audioBtn.classList.remove('active');
                        audioBtn.setAttribute('data-speaking', 'false');
                        audioBtn.setAttribute('title', 'Read aloud');
                        audioBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                    };

                    utterance.onerror = function() {
                        audioBtn.classList.remove('active');
                        audioBtn.setAttribute('data-speaking', 'false');
                        audioBtn.setAttribute('title', 'Read aloud');
                        audioBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                    };

                    // Start speaking
                    window.speechSynthesis.speak(utterance);

                    // Show active state while speaking
                    audioBtn.classList.add('active');
                    audioBtn.setAttribute('data-speaking', 'true');
                    audioBtn.setAttribute('title', 'Stop reading');
                    audioBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
                };

                // Add buttons to feedback element in the order shown in the image
                feedbackElement.appendChild(copyBtn);
                feedbackElement.appendChild(thumbsUpBtn);
                feedbackElement.appendChild(thumbsDownBtn);
                feedbackElement.appendChild(audioBtn);

                // Add feedback element to footer first
                footerElement.appendChild(feedbackElement);
                             }

                             // Add timestamp - use provided timestamp if available
                const timeElement = document.createElement('span');
                timeElement.className = 'message-time';
                if (message.timestamp) {
                    const messageDate = new Date(message.timestamp);
                    timeElement.textContent = messageDate.toLocaleTimeString();
                } else {
                    timeElement.textContent = new Date().toLocaleTimeString();
                }

                const timeContainer = document.createElement('div');
                timeContainer.className = 'time-container';
                timeContainer.appendChild(timeElement);
                footerElement.appendChild(timeContainer);

                messageElement.appendChild(contentElement);
                messageElement.appendChild(footerElement);
                         } else { // User message
                contentElement.textContent = message.content;
                messageElement.appendChild(contentElement);

                // Add footer with timestamp for user messages
                const footerElement = document.createElement('div');
                footerElement.className = 'message-footer';

                             // Add timestamp
                const timeElement = document.createElement('span');
                timeElement.className = 'message-time';
                if (message.timestamp) {
                    const messageDate = new Date(message.timestamp);
                    timeElement.textContent = messageDate.toLocaleTimeString();
                } else {
                    timeElement.textContent = new Date().toLocaleTimeString();
                }

                const timeContainer = document.createElement('div');
                timeContainer.className = 'time-container';
                timeContainer.appendChild(timeElement);
                footerElement.appendChild(timeContainer);
                messageElement.appendChild(footerElement);
            }

                        fragment.appendChild(messageElement);
        });

                    // Prepend messages to the virtual scroll container
                    virtualScrollContainer.insertBefore(fragment, virtualScrollContainer.firstChild);

                    // Scroll to bottom if this is the first page being loaded (i.e., loading the chat initially)
                    // Or if we're loading the very latest messages in a live chat scenario (less likely with this logic)
                    if (page === 1) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }

                } catch (error) {
                    console.error('Error loading messages:', error);
                    // Show error notification
                    showToastNotification('Error', 'Error loading messages. Please try again.', true);
                } finally {
                    isLoading = false;
                }
            }

            // Load initial messages (page 1)
            await loadMessages(1);

        }


        // Update active state in sidebar
        const chatItems = document.querySelectorAll('.chat-history-item');
        chatItems.forEach(item => {
            if (item.getAttribute('data-id') === chatId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Handle sidebar state
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            if (window.innerWidth <= 768) {
                // On mobile, just remove active state
                sidebar.classList.remove('active');
            } else if (localStorage.getItem('sidebarCollapsed') === 'true') {
                // On desktop, maintain collapsed state if that was the user's preference
                sidebar.classList.add('collapsed');
            }
        }

        console.log(`Chat with ID ${chatId} loaded successfully`);
    } catch (error) {
        console.error('Error loading chat:', error);
        showToastNotification('Error', 'Error loading chat. Please try again.', true);
    }
}

// Direct initialization for login functionality removed

// Password toggle functionality removed as it was only used by login functionality

// Load saved chats from localStorage
function loadSavedChats() {
    try {
        console.log('Loading saved chats...');

        // Get saved chats from localStorage
        let savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');

        // Check if we just deleted all chats
        const justDeleted = localStorage.getItem('all_chats_deleted') === 'true';

        // Don't add sample chats anymore
        if (justDeleted) {
            // Reset the flag
            localStorage.removeItem('all_chats_deleted');
        }

        // Filter out duplicate empty "New Chat" entries
        // Keep only the most recent empty chat if multiple exist
        let foundEmptyChat = false;
        savedChats = savedChats.filter(chat => {
            // If it's not an empty "New Chat", keep it
            if (chat.title !== 'New Chat' || (chat.messages && chat.messages.length > 0)) {
                return true;
            }

            // If we already found an empty chat and this is another one, filter it out
            if (foundEmptyChat) {
                console.log(`Filtering out duplicate empty chat with ID ${chat.id}`);
                return false;
            }

            // This is the first empty chat we've found, keep it
            foundEmptyChat = true;
            return true;
        });

        // Sort by timestamp (newest first)
        savedChats.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

        chatHistory = savedChats;

        // Clear chat history container
        const chatHistoryContainer = document.getElementById('chatHistory');
        if (!chatHistoryContainer) {
            console.error('Chat history container not found');
            return;
        }

        chatHistoryContainer.innerHTML = '';

        // If no saved chats, just return without adding sample chats
        if (savedChats.length === 0) {
            return;
        }

        // Group chats by date
        const now = new Date();
        const todayMidnight = getLocalMidnight(now);
        const yesterdayMidnight = todayMidnight - 24 * 60 * 60 * 1000;
        const oneWeekAgoMidnight = todayMidnight - 7 * 24 * 60 * 60 * 1000;
        const oneMonthAgoMidnight = todayMidnight - 30 * 24 * 60 * 60 * 1000;

        let todayChats = [];
        let yesterdayChats = [];
        let previousWeekChats = [];
        let previousMonthChats = [];
        let olderChats = [];

        savedChats.forEach(chat => {
            // Parse the chat timestamp
            const chatMidnight = getLocalMidnight(chat.timestamp || 0);
            if (isNaN(chatMidnight)) {
                todayChats.push(chat);
                return;
            }
            if (chatMidnight === todayMidnight) {
                todayChats.push(chat);
            } else if (chatMidnight === yesterdayMidnight) {
                yesterdayChats.push(chat);
            } else if (chatMidnight >= oneWeekAgoMidnight && chatMidnight < yesterdayMidnight) {
                previousWeekChats.push(chat);
            } else if (chatMidnight >= oneMonthAgoMidnight && chatMidnight < oneWeekAgoMidnight) {
                previousMonthChats.push(chat);
            } else if (chatMidnight < oneMonthAgoMidnight) {
                olderChats.push(chat);
            }
        });

        // Add "Today" section
        if (todayChats.length > 0) {
            const todayHeader = document.createElement('div');
            todayHeader.className = 'chat-history-header';
            todayHeader.textContent = 'Today';
            chatHistoryContainer.appendChild(todayHeader);
            todayChats.forEach(chat => addChatItem(chat, chatHistoryContainer));
        }

        // Add "Yesterday" section
        if (yesterdayChats.length > 0) {
            const yesterdayHeader = document.createElement('div');
            yesterdayHeader.className = 'chat-history-header';
            yesterdayHeader.textContent = 'Yesterday';
            chatHistoryContainer.appendChild(yesterdayHeader);
            yesterdayChats.forEach(chat => addChatItem(chat, chatHistoryContainer));
        }

        // Add "Previous Week" section
        if (previousWeekChats.length > 0) {
            const previousWeekHeader = document.createElement('div');
            previousWeekHeader.className = 'chat-history-header';
            previousWeekHeader.textContent = 'Previous Week';
            chatHistoryContainer.appendChild(previousWeekHeader);
            previousWeekChats.forEach(chat => addChatItem(chat, chatHistoryContainer));
        }

        // Add "Previous Month" section
        if (previousMonthChats.length > 0) {
            const previousMonthHeader = document.createElement('div');
            previousMonthHeader.className = 'chat-history-header';
            previousMonthHeader.textContent = 'Previous Month';
            chatHistoryContainer.appendChild(previousMonthHeader);
            previousMonthChats.forEach(chat => addChatItem(chat, chatHistoryContainer));
        }

        // Group older chats by month
        if (olderChats.length > 0) {
            const monthGroups = {};

            olderChats.forEach(chat => {
                const chatDate = new Date(chat.timestamp || 0);
                const monthName = chatDate.toLocaleString('default', { month: 'long' });
                const year = chatDate.getFullYear();
                const monthKey = `${monthName} ${year}`;

                if (!monthGroups[monthKey]) {
                    monthGroups[monthKey] = [];
                }
                monthGroups[monthKey].push(chat);
            });

            // Add each month group
            Object.keys(monthGroups).forEach(monthKey => {
                const monthHeader = document.createElement('div');
                monthHeader.className = 'chat-history-header';
                monthHeader.textContent = monthKey;
                chatHistoryContainer.appendChild(monthHeader);
                monthGroups[monthKey].forEach(chat => addChatItem(chat, chatHistoryContainer));
            });
        }

        console.log(`Loaded ${savedChats.length} saved chats`);
    } catch (error) {
        console.error('Error loading saved chats:', error);
        // Don't add demo chats as fallback anymore
    }
}

// Get the first user message for the chat title
function getFirstUserMessage(messages) {
    for (const message of messages) {
        if (message.classList.contains('user-message')) {
            const content = message.querySelector('.message-content');
            if (content && content.textContent) {
                // Limit title length
                const text = content.textContent.trim();
                return text.length > 30 ? text.substring(0, 27) + '...' : text;
            }
        }
    }
    return 'New Chat';
}

// Archive a chat - uses the settings-manager.js archiveChat function
function archiveChat(chatId) {
    try {
        console.log(`Archiving chat with ID: ${chatId}`);

        // Find the chat in history
        const chat = chatHistory.find(c => c.id === chatId);
        if (!chat) {
            console.error(`Chat with ID ${chatId} not found`);
            return;
        }

        // Call the archiveChat function from settings-manager.js
        if (typeof window.archiveChat === 'function') {
            window.archiveChat(chatId);
        } else {
            console.error('archiveChat function not found in window object');
            showNotificationDialog('Error', 'Archive functionality is not available. Please try again later.', 'OK');
        }
    } catch (error) {
        console.error('Error archiving chat:', error);
        showNotificationDialog('Error', 'Failed to archive the chat. Please try again.', 'OK');
    }
}

// Rename a chat with inline editing (like ChatGPT)
function renameChat(chatId) {
    try {
        console.log(`Renaming chat with ID: ${chatId}`);

        // Find the chat in history
        const chat = chatHistory.find(c => c.id === chatId);
        if (!chat) {
            console.error(`Chat with ID ${chatId} not found`);
            return;
        }

        // Find the chat item in the sidebar
        const chatItem = document.querySelector(`.chat-history-item[data-id="${chatId}"]`);
        if (!chatItem) {
            console.error(`Chat item with ID ${chatId} not found in the DOM`);
            return;
        }

        // Get the title element
        const titleElement = chatItem.querySelector('.chat-history-item-title');
        if (!titleElement) {
            console.error(`Title element not found for chat ${chatId}`);
            return;
        }

        // Store the original title in case user cancels
        const originalTitle = chat.title;

        // Create an input element for inline editing
        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.className = 'chat-history-item-title-input';
        inputElement.value = originalTitle;
        inputElement.maxLength = 50; // Limit title length

        // Replace the title element with the input
        titleElement.innerHTML = '';
        titleElement.appendChild(inputElement);

        // Focus the input and select all text
        inputElement.focus();
        inputElement.select();

        // Function to save the new title
        const saveNewTitle = () => {
            const newTitle = inputElement.value.trim();

            // If empty, revert to original title
            if (newTitle === '') {
                titleElement.textContent = originalTitle;
                return;
            }

            // Update chat title
            chat.title = newTitle;

            // Update UI
            titleElement.textContent = newTitle;

            // Save to localStorage
            localStorage.setItem('ziahr_chats', JSON.stringify(chatHistory));

            console.log(`Chat ${chatId} renamed to "${chat.title}"`);
        };

        // Function to cancel editing
        const cancelEditing = () => {
            titleElement.textContent = originalTitle;
        };

        // Handle Enter key to save
        inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveNewTitle();
                inputElement.blur(); // Remove focus
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEditing();
                inputElement.blur(); // Remove focus
            }
        });

        // Handle blur event to save when clicking outside
        inputElement.addEventListener('blur', () => {
            saveNewTitle();
        });

        // Prevent click events from bubbling up to the chat item
        inputElement.addEventListener('click', (e) => {
            e.stopPropagation();
        });

    } catch (error) {
        console.error('Error renaming chat:', error);
        showNotificationDialog('Error', 'Failed to rename the chat. Please try again.', 'OK');
    }
}

// Share a chat
function shareChat(chatId) {
    try {
        console.log(`Sharing chat with ID: ${chatId}`);

        // Find the chat in history
        const chat = chatHistory.find(c => c.id === chatId);
        if (!chat) {
            console.error(`Chat with ID ${chatId} not found`);
            return;
        }

        // Generate a share link (in a real app, this would create a unique URL)
        const shareLink = `${window.location.origin}/share/${chatId}`;

        // Create a temporary input to copy the link
        const tempInput = document.createElement('input');
        tempInput.value = shareLink;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);

        // Show share dialog with options
        showShareDialog(chat.title, shareLink);

        console.log(`Share link for chat with ID ${chatId} copied to clipboard`);
    } catch (error) {
        console.error('Error sharing chat:', error);
        showNotificationDialog('Error', 'Failed to share the chat. Please try again.', 'OK');
    }
}

// Show share dialog with options
function showShareDialog(chatTitle, shareLink) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'notification-dialog-overlay';
    document.body.appendChild(overlay);

    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'notification-dialog share-dialog';
    dialog.innerHTML = `
        <div class="notification-dialog-header">Share "${chatTitle}"</div>
        <div class="notification-dialog-content">
            <p>Share this conversation with others:</p>
            <div class="share-link-container">
                <input type="text" class="share-link-input" value="${shareLink}" readonly>
                <button class="copy-link-btn"><i class="fas fa-copy"></i> Copy</button>
            </div>
            <div class="share-options">
                <button class="share-option email-share">
                    <i class="fas fa-envelope"></i> Email
                </button>
                <button class="share-option slack-share">
                    <i class="fab fa-slack"></i> Slack
                </button>
                <button class="share-option teams-share">
                    <i class="fas fa-users"></i> Teams
                </button>
            </div>
        </div>
        <div class="notification-dialog-footer">
            <button class="notification-dialog-button">Close</button>
        </div>
    `;
    document.body.appendChild(dialog);

    // Add event listener to copy button
    const copyBtn = dialog.querySelector('.copy-link-btn');
    copyBtn.addEventListener('click', () => {
        const linkInput = dialog.querySelector('.share-link-input');
        linkInput.select();
        document.execCommand('copy');
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
        }, 2000);
    });

    // Add event listeners to share options
    const emailShare = dialog.querySelector('.email-share');
    emailShare.addEventListener('click', () => {
        window.open(`mailto:?subject=Shared Chat: ${chatTitle}&body=Check out this conversation: ${shareLink}`);
    });

    const slackShare = dialog.querySelector('.slack-share');
    slackShare.addEventListener('click', () => {
        showNotificationDialog('Slack Share', 'The conversation has been shared to Slack.', 'OK');
    });

    const teamsShare = dialog.querySelector('.teams-share');
    teamsShare.addEventListener('click', () => {
        showNotificationDialog('Teams Share', 'The conversation has been shared to Microsoft Teams.', 'OK');
    });

    // Add event listener to close button
    const closeBtn = dialog.querySelector('.notification-dialog-button');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
        document.body.removeChild(dialog);
    });

    // Add event listener to overlay
    overlay.addEventListener('click', () => {
        document.body.removeChild(overlay);
        document.body.removeChild(dialog);
    });
}

// Add event listener for theme changes to update the new chat button icon
document.addEventListener('themeChanged', function(e) {
    // Update new chat button icon in sidebar
    const newChatBtn = document.getElementById('newChatBtn');
    if (newChatBtn) {
        const icon = newChatBtn.querySelector('img.new-chat-icon');
        if (icon) {
            // In dark mode, use white circle with black plus (new-chat-icon-dark-larger.svg)
            // In light mode, use black circle with white plus (new-chat-icon-larger.svg)
            icon.src = e.detail.theme === 'dark'
                ? '/static/img/new-chat-icon-dark-larger.svg'
                : '/static/img/new-chat-icon-larger.svg';
            console.log('Theme changed: Updated sidebar new chat icon for', e.detail.theme, 'mode');
        }
    }
});

// Helper to get local midnight timestamp
function getLocalMidnight(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}