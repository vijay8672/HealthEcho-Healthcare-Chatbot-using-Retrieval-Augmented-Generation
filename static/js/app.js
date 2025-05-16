// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const sidebar = document.getElementById('sidebar');
const toggleSidebar = document.getElementById('toggleSidebar');
const closeSidebar = document.getElementById('closeSidebar');
const chatHistory = document.getElementById('chatHistory');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const voiceToggle = document.getElementById('voiceToggle');
const voiceInputBtn = document.getElementById('voiceInputBtn');
const voiceModal = document.getElementById('voiceModal');
const closeVoiceModal = document.getElementById('closeVoiceModal');
const startRecording = document.getElementById('startRecording');
const stopRecording = document.getElementById('stopRecording');
const recordingStatus = document.getElementById('recordingStatus');
const transcriptionResult = document.getElementById('transcriptionResult');
const submitVoiceInput = document.getElementById('submitVoiceInput');
const cancelVoiceInput = document.getElementById('cancelVoiceInput');
const sourcePanel = document.getElementById('sourcePanel');
const closeSourcePanel = document.getElementById('closeSourcePanel');
const sourcePanelContent = document.getElementById('sourcePanelContent');
const fileUpload = document.getElementById('fileUpload');
const uploadStatus = document.getElementById('uploadStatus');
const exportChat = document.getElementById('exportChat');
const clearChat = document.getElementById('clearChat');
const uploadDocumentBtn = document.getElementById('uploadDocumentBtn');

// Device ID for tracking conversation
let deviceID = localStorage.getItem('deviceID') || 'device_' + Math.random().toString(36).substr(2, 9);
localStorage.setItem('deviceID', deviceID);

// Chat history
let chatLog = JSON.parse(localStorage.getItem('chatLog')) || [];
let savedChats = JSON.parse(localStorage.getItem('savedChats')) || [];
let currentSources = [];

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Initializing app...');

        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
        if (themeToggle) {
            themeToggle.checked = savedTheme === 'dark';
            updateThemeIcon(savedTheme === 'dark');
        }

        // Load voice preference
        const voiceEnabled = localStorage.getItem('voiceEnabled') !== 'false';
        if (voiceToggle) {
            voiceToggle.checked = voiceEnabled;
        }

        // Setup textarea auto-resize and send button state
        setupTextareaHandlers();

        // Render saved chats
        renderSavedChats();

        // Load current chat
        loadCurrentChat();

        // Process HR files on startup
        processHrFiles();

        // Set up all event listeners
        setupAllEventListeners();

        console.log('App initialization complete');
    } catch (error) {
        console.error('Error initializing app:', error);
    }
});

// Setup all event listeners
function setupAllEventListeners() {
    try {
        console.log('Setting up all event listeners...');

        // Main form and chat interactions
        if (chatForm) chatForm.addEventListener('submit', handleChatSubmit);

        // Sidebar controls
        if (toggleSidebar) toggleSidebar.addEventListener('click', () => {
            if (sidebar) sidebar.classList.toggle('active');
        });

        if (closeSidebar) closeSidebar.addEventListener('click', () => {
            if (sidebar) sidebar.classList.remove('active');
        });

        // Theme toggle
        if (themeToggle) themeToggle.addEventListener('change', (e) => {
            const isDarkMode = e.target.checked;
            setTheme(isDarkMode ? 'dark' : 'light');
            updateThemeIcon(isDarkMode);
        });

        // Voice toggle
        if (voiceToggle) voiceToggle.addEventListener('change', (e) => {
            localStorage.setItem('voiceEnabled', e.target.checked);
        });

        // Voice input controls
        if (voiceInputBtn) voiceInputBtn.addEventListener('click', openVoiceModal);
        if (closeVoiceModal) closeVoiceModal.addEventListener('click', closeVoiceModalHandler);
        if (submitVoiceInput) submitVoiceInput.addEventListener('click', submitVoiceInputHandler);
        if (cancelVoiceInput) cancelVoiceInput.addEventListener('click', closeVoiceModalHandler);

        // Source panel
        if (closeSourcePanel) closeSourcePanel.addEventListener('click', () => {
            if (sourcePanel) sourcePanel.classList.remove('active');
        });

        // File upload
        if (fileUpload) fileUpload.addEventListener('change', handleFileUpload);
        if (uploadDocumentBtn) uploadDocumentBtn.addEventListener('click', () => {
            if (fileUpload) fileUpload.click();
        });

        // Chat management - disabled as per user request
        // if (exportChat) exportChat.addEventListener('click', exportChatHistory);
        // if (clearChat) clearChat.addEventListener('click', clearChatHistory);

        // New chat button
        const newChatBtn = document.querySelector('.new-chat-btn');
        if (newChatBtn) {
            console.log('Adding event listener to new chat button');
            newChatBtn.addEventListener('click', startNewChat);
        } else {
            console.warn('New chat button not found');
        }

        // Add click handlers to suggestion chips
        setupSuggestionChips();

        console.log('All event listeners set up successfully');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

// Setup suggestion chips
function setupSuggestionChips() {
    try {
        const suggestionChips = document.querySelectorAll('.suggestion-chip');
        suggestionChips.forEach(chip => {
            chip.addEventListener('click', function() {
                const suggestion = this.textContent.trim();
                console.log('Suggestion chip clicked:', suggestion);
                submitSuggestion(suggestion);
            });
        });
        console.log(`Set up ${suggestionChips.length} suggestion chips`);
    } catch (error) {
        console.error('Error setting up suggestion chips:', error);
    }
}

// Setup textarea auto-resize and send button state
function setupTextareaHandlers() {
    try {
        console.log('Setting up textarea handlers...');

        const textarea = document.getElementById('userInput');
        const sendBtn = document.getElementById('sendBtn');

        if (!textarea || !sendBtn) {
            console.error('Textarea or send button not found');
            return;
        }

        // Initial state
        sendBtn.disabled = true;

        // Auto-resize textarea and toggle send button
        textarea.addEventListener('input', function() {
            try {
                // Enable/disable send button based on content
                const hasContent = this.value.trim() !== '';
                sendBtn.disabled = !hasContent;

                // Auto-resize
                this.style.height = 'auto';
                const newHeight = Math.min(this.scrollHeight, 200);
                this.style.height = newHeight + 'px';
            } catch (error) {
                console.error('Error in textarea input handler:', error);
            }
        });

        // Handle Enter key (send on Enter, new line on Shift+Enter)
        textarea.addEventListener('keydown', function(e) {
            try {
                if (e.key === 'Enter' && !e.shiftKey) {
                    if (!sendBtn.disabled) {
                        e.preventDefault();
                        if (chatForm) {
                            chatForm.dispatchEvent(new Event('submit'));
                        }
                    }
                }
            } catch (error) {
                console.error('Error in textarea keydown handler:', error);
            }
        });

        console.log('Textarea handlers set up successfully');
    } catch (error) {
        console.error('Error setting up textarea handlers:', error);
    }
}

// Handle chat form submission
async function handleChatSubmit(e) {
    e.preventDefault();
    const query = userInput.value.trim();
    if (query === '') return;

    // Add user message to UI
    addMessageToUI('user', query);
    userInput.value = '';

    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = `<div class="typing-indicator-content"><span></span><span></span><span></span></div>`;
    chatMessages.appendChild(typingIndicator);
    scrollToBottom();

    // Reset textarea height
    userInput.style.height = 'auto';

    try {
        // Send query to API
        const response = await axios.post('/api/query', {
            query: query,
            device_id: deviceID
        });

        // Remove typing indicator
        typingIndicator.remove();

        // Process response
        const responseText = response.data.response;
        const sources = response.data.sources || [];
        currentSources = sources;

        // Add bot message to UI
        addMessageToUI('bot', responseText, sources);

        // Speak response if enabled
        if (voiceToggle.checked) {
            speakText(stripHtml(responseText));
        }

    } catch (error) {
        console.error('Error:', error);
        typingIndicator.remove();
        addMessageToUI('bot', 'Sorry, I encountered an error. Please try again.');
    }
}

// Add message to UI
function addMessageToUI(type, message, messageId = null, sources = []) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}-message`;

    // If messageId is provided, set it as the element ID
    if (messageId) {
        messageElement.id = messageId;
    }

    // Create message content
    const contentElement = document.createElement('div');
    contentElement.className = 'message-content';

    // Use marked.js to render markdown
    if (type === 'bot' || type === 'system') {
        contentElement.innerHTML = marked.parse(message);
    } else {
        contentElement.textContent = message;
    }

    messageElement.appendChild(contentElement);

    // Add footer with timestamp and sources button for bot messages
    if (type === 'bot' && sources.length > 0) {
        const footerElement = document.createElement('div');
        footerElement.className = 'message-footer';

        const timeElement = document.createElement('span');
        timeElement.className = 'message-time';
        timeElement.textContent = new Date().toLocaleTimeString();

        const sourcesElement = document.createElement('span');
        sourcesElement.className = 'message-sources';
        sourcesElement.textContent = `${sources.length} sources`;
        sourcesElement.addEventListener('click', () => showSources(sources));

        footerElement.appendChild(timeElement);
        footerElement.appendChild(sourcesElement);
        messageElement.appendChild(footerElement);
    }

    // Remove welcome container if it exists
    const welcomeContainer = document.querySelector('.welcome-container');
    if (welcomeContainer) {
        welcomeContainer.remove();
    }

    chatMessages.appendChild(messageElement);
    scrollToBottom();

    // Save to chat log
    chatLog.push({ type, message, messageId, sources, timestamp: new Date().toISOString() });
    localStorage.setItem('chatLog', JSON.stringify(chatLog));
}

// Update a message in the chat by ID
function updateMessageInChat(messageId, newMessage) {
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

        // Update in chat log
        const messageIndex = chatLog.findIndex(msg => msg.messageId === messageId);
        if (messageIndex !== -1) {
            chatLog[messageIndex].message = newMessage;
            localStorage.setItem('chatLog', JSON.stringify(chatLog));
        }

        console.log(`Updated message with ID ${messageId}`);
    } catch (error) {
        console.error('Error updating message in chat:', error);
    }
}

// Show sources in the side panel
function showSources(sources) {
    sourcePanelContent.innerHTML = '';

    if (sources.length === 0) {
        sourcePanelContent.innerHTML = '<p>No sources available for this response.</p>';
    } else {
        sources.forEach(source => {
            const sourceElement = document.createElement('div');
            sourceElement.className = 'source-item';

            const titleElement = document.createElement('div');
            titleElement.className = 'source-title';
            titleElement.textContent = source.title;

            const fileElement = document.createElement('div');
            fileElement.className = 'source-file';
            fileElement.textContent = source.source_file;

            const relevanceElement = document.createElement('div');
            relevanceElement.className = 'source-relevance';
            relevanceElement.textContent = `Relevance: ${(source.score * 100).toFixed(1)}%`;

            sourceElement.appendChild(titleElement);
            sourceElement.appendChild(fileElement);
            sourceElement.appendChild(relevanceElement);

            sourcePanelContent.appendChild(sourceElement);
        });
    }

    sourcePanel.classList.add('active');
}

// Voice input functions
function openVoiceModal() {
    voiceModal.classList.add('active');
    transcriptionResult.textContent = '';
    submitVoiceInput.disabled = true;
}

function closeVoiceModalHandler() {
    voiceModal.classList.remove('active');
    stopVoiceRecording();
}

// Voice recording functions are now implemented in speech-recognition.js

function submitVoiceInputHandler() {
    const text = transcriptionResult.textContent.trim();
    if (text) {
        userInput.value = text;
        voiceModal.classList.remove('active');
        chatForm.dispatchEvent(new Event('submit'));
    }
}

// File upload handler
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    uploadStatus.textContent = `Uploading ${file.name}...`;

    const formData = new FormData();
    formData.append('file', file);

    fetch('/api/upload-document', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            uploadStatus.textContent = `${file.name} uploaded and processed successfully!`;
            setTimeout(() => {
                uploadStatus.textContent = '';
            }, 5000);
        } else {
            uploadStatus.textContent = `Error: ${data.error}`;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        uploadStatus.textContent = 'Error uploading file';
    });

    // Clear the input
    e.target.value = '';
}

// Process HR files
function processHrFiles() {
    fetch('/api/process-hr-files', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ directory: 'Hr Files' })
    })
    .then(response => response.json())
    .then(data => {
        console.log('HR files processed:', data);
    })
    .catch(error => {
        console.error('Error processing HR files:', error);
    });
}

// Chat history functions
function startNewChat() {
    try {
        console.log('Starting new chat...');

        // Save current chat
        if (chatLog.length > 0) {
            const title = chatLog.find(msg => msg.type === 'user')?.message || `Chat ${savedChats.length + 1}`;
            savedChats.push({
                id: Date.now().toString(),
                title: title.substring(0, 30) + (title.length > 30 ? '...' : ''),
                log: chatLog,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('savedChats', JSON.stringify(savedChats));
            renderSavedChats();
            console.log('Current chat saved to history');
        }

        // Clear current chat
        chatLog = [];
        localStorage.setItem('chatLog', JSON.stringify(chatLog));
        console.log('Chat log cleared');

        if (!chatMessages) {
            console.error('Chat messages container not found');
            return;
        }

        // Clear UI
        chatMessages.innerHTML = '';

        // Add welcome message
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
        setupSuggestionChips();

        // Close sidebar on mobile
        if (sidebar && window.innerWidth <= 768) {
            sidebar.classList.remove('active');
        }

        console.log('New chat started successfully');
    } catch (error) {
        console.error('Error starting new chat:', error);
    }
}

function renderSavedChats() {
    chatHistory.innerHTML = '';

    if (savedChats.length === 0) {
        chatHistory.innerHTML = '<div class="empty-history">No saved chats</div>';
        return;
    }

    // Sort by timestamp (newest first)
    savedChats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    savedChats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-history-item';
        chatItem.innerHTML = `<i class="fas fa-comment"></i> ${chat.title}`;
        chatItem.addEventListener('click', () => loadChat(chat));
        chatHistory.appendChild(chatItem);
    });
}

function loadChat(chat) {
    chatLog = chat.log;
    localStorage.setItem('chatLog', JSON.stringify(chatLog));
    loadCurrentChat();
    sidebar.classList.remove('active');
}

function loadCurrentChat() {
    try {
        console.log('Loading current chat...');

        if (!chatMessages) {
            console.error('Chat messages container not found');
            return;
        }

        chatMessages.innerHTML = '';

        if (chatLog.length === 0) {
            // Show welcome message
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
            setupSuggestionChips();

            console.log('Welcome message displayed');
            return;
        }

        // Render chat messages
        chatLog.forEach(message => {
            addMessageToUI(message.type, message.message, message.sources || []);
        });

        console.log(`Loaded ${chatLog.length} messages from chat history`);
    } catch (error) {
        console.error('Error loading current chat:', error);
    }
}

function submitSuggestion(text) {
    try {
        console.log('Submitting suggestion:', text);

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
        }, 10); // Small delay to ensure input event is processed

        console.log('Suggestion submitted successfully');
    } catch (error) {
        console.error('Error submitting suggestion:', error);
    }
}

function exportChatHistory() {
    if (chatLog.length === 0) {
        alert('No chat history to export');
        return;
    }

    let exportText = '# Chat History\n\n';

    chatLog.forEach(message => {
        const role = message.type === 'user' ? 'User' : 'Assistant';
        const timestamp = new Date(message.timestamp || Date.now()).toLocaleString();
        exportText += `## ${role} (${timestamp})\n\n${message.message}\n\n`;

        if (message.sources && message.sources.length > 0) {
            exportText += '### Sources\n\n';
            message.sources.forEach(source => {
                exportText += `- ${source.title} (${source.source_file})\n`;
            });
            exportText += '\n';
        }
    });

    const blob = new Blob([exportText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function clearChatHistory() {
    if (confirm('Are you sure you want to clear the current chat?')) {
        fetch('/api/clear-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ device_id: deviceID })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                startNewChat();
            }
        })
        .catch(error => {
            console.error('Error clearing history:', error);
        });
    }
}

// Utility functions
function setTheme(theme) {
    document.body.className = `theme-${theme}`;
    localStorage.setItem('theme', theme);
}

function updateThemeIcon(isDarkMode) {
    if (isDarkMode) {
        themeIcon.className = 'fas fa-sun';
    } else {
        themeIcon.className = 'fas fa-moon';
    }
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function stripHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

function speakText(text) {
    // In a real app, this would use the Web Speech API or a similar technology
    // For now, we'll just log it
    console.log('Speaking:', text);
}
