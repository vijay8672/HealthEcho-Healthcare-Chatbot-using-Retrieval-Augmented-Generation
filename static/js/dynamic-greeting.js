/**
 * Dynamic Greeting Message
 *
 * This script adds a personalized greeting message above the chat input box
 * that changes based on the time of day and includes the user's name.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Dynamic greeting script loaded');

    // Initialize once after a short delay
    setTimeout(() => {
        initDynamicGreeting();
    }, 500);

    // Listen for login/logout events to update the greeting
    window.addEventListener('user-logged-in', () => {
        checkChatAndShowGreeting();
    });

    window.addEventListener('user-logged-out', () => {
        hideGreetingMessage();
    });
});

// We've removed the MutationObserver to improve performance

/**
 * Initialize the dynamic greeting
 */
function initDynamicGreeting() {
    try {
        // Check if user is logged in
        const userData = JSON.parse(localStorage.getItem('user_data') || 'null');

        if (userData) {
            // Check if chat is empty and show greeting if needed
            checkChatAndShowGreeting();
        } else {
            // Hide greeting if user is not logged in
            hideGreetingMessage();
        }
    } catch (error) {
        console.error('Error initializing dynamic greeting:', error);
    }
}

/**
 * Update the greeting message with user's name and time-appropriate greeting
 * @param {Object} userData - The user data object containing name information
 */
function updateGreetingMessage(userData) {
    try {
        // Get or create the greeting container and element
        let greetingContainer = document.getElementById('greetingMessageContainer');
        let greetingElement = document.getElementById('greetingMessage');

        // If the greeting container doesn't exist, create it
        if (!greetingContainer) {
            console.log('Greeting container not found, creating it');
            const chatMessages = document.getElementById('chatMessages');
            if (!chatMessages) {
                console.error('Chat messages container not found');
                return;
            }

            greetingContainer = document.createElement('div');
            greetingContainer.id = 'greetingMessageContainer';
            greetingContainer.className = 'greeting-message-container';
            greetingContainer.style.display = 'none';

            greetingElement = document.createElement('p');
            greetingElement.id = 'greetingMessage';
            greetingElement.className = 'greeting-message';

            greetingContainer.appendChild(greetingElement);
            chatMessages.insertBefore(greetingContainer, chatMessages.firstChild);
        } else if (!greetingElement) {
            // If the container exists but the element doesn't, create it
            greetingElement = document.createElement('p');
            greetingElement.id = 'greetingMessage';
            greetingElement.className = 'greeting-message';
            greetingContainer.appendChild(greetingElement);
        }

        // Check if there are any user or bot messages in the chat
        const userMessages = document.querySelectorAll('.user-message, .bot-message');
        const hasMessages = userMessages.length > 0;

        // Only show the greeting message if there are no messages
        if (hasMessages) {
            hideGreetingMessage();
            return;
        }

        // Get user's first name
        let userName = 'there';
        if (userData && userData.email) {
            // Try to extract a name from the email (before the @ symbol)
            const emailName = userData.email.split('@')[0];
            // Capitalize the first letter
            userName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }

        // Get time-appropriate greeting
        const greeting = getTimeBasedGreeting();

        // Set the greeting message with emojis
        const message = `👋 Hi ${userName}, ${greeting}!`;
        greetingElement.textContent = message;

        // Show the greeting container
        greetingContainer.style.display = 'block';

        // Fade in effect
        greetingContainer.style.opacity = '0';
        setTimeout(() => {
            greetingContainer.style.opacity = '1';
        }, 10);
    } catch (error) {
        console.error('Error updating greeting message:', error);
    }
}

/**
 * Hide the greeting message
 */
function hideGreetingMessage() {
    try {
        // If we're in the process of starting a new chat, don't hide the greeting
        if (window.isStartingNewChat) {
            console.log('Not hiding greeting because new chat is starting');
            return;
        }

        const greetingContainer = document.getElementById('greetingMessageContainer');
        if (!greetingContainer) {
            return;
        }

        // Check if there are any messages in the chat
        const userMessages = document.querySelectorAll('.user-message, .bot-message');
        if (userMessages.length === 0) {
            // If there are no messages, don't hide the greeting
            console.log('Not hiding greeting because chat is empty');

            // Make sure it's visible
            greetingContainer.style.display = 'block';
            greetingContainer.style.opacity = '1';
            return;
        }

        // Instantly hide the greeting (no fade-out, no delay)
        greetingContainer.style.opacity = '0';
        greetingContainer.style.display = 'none';
        console.log('Greeting message instantly hidden because chat has messages');
        if (typeof window.ensureChatInputCentered === 'function') {
            window.ensureChatInputCentered();
        }
    } catch (error) {
        console.error('Error hiding greeting message:', error);
    }
}

/**
 * Get a greeting based on the current time of day with appropriate emoji
 * @returns {string} A time-appropriate greeting with emoji
 */
function getTimeBasedGreeting() {
    try {
        const hour = new Date().getHours();

        if (hour >= 5 && hour < 12) {
            return '🌅 Good morning';
        } else if (hour >= 12 && hour < 18) {
            return '☀️ Good afternoon';
        } else if (hour >= 18 && hour < 22) {
            return '🌆 Good evening';
        } else {
            return '🌙 Good evening';
        }
    } catch (error) {
        console.error('Error getting time-based greeting:', error);
        return '👋 Hello';
    }
}

/**
 * Check if chat is empty and show greeting if needed
 */
function checkChatAndShowGreeting() {
    try {
        // Check if user is logged in
        const userData = JSON.parse(localStorage.getItem('user_data') || 'null');
        if (!userData) {
            console.log('User not logged in, not showing greeting');
            return;
        }

        // Check if there are any user or bot messages in the chat
        const userMessages = document.querySelectorAll('.user-message, .bot-message');
        const hasMessages = userMessages.length > 0;

        // Get or ensure the greeting container exists
        let greetingContainer = document.getElementById('greetingMessageContainer');

        // If no greeting container exists, we'll create one in updateGreetingMessage

        if (!hasMessages) {
            // Show the greeting message - this will create the container if needed
            updateGreetingMessage(userData);
            console.log('Chat is empty, showing greeting message');

            // Make sure the greeting is visible
            if (greetingContainer) {
                greetingContainer.style.display = 'block';
                greetingContainer.style.opacity = '1';
            }
        } else {
            // Hide the greeting message
            hideGreetingMessage();
            console.log('Chat has messages, hiding greeting message');
        }
    } catch (error) {
        console.error('Error checking chat and showing greeting:', error);
    }
}

// Make functions available globally
window.updateGreetingMessage = updateGreetingMessage;
window.hideGreetingMessage = hideGreetingMessage;
window.checkChatAndShowGreeting = checkChatAndShowGreeting;
