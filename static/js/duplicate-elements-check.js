/**
 * Duplicate Elements Check
 * This script checks for duplicate UI elements that might cause issues
 * and automatically fixes them when possible
 */

// Function to check for and fix duplicate elements
function checkAndFixDuplicateElements() {
    try {
        console.log('Running duplicate elements check...');

        // Check for duplicate welcome containers
        const welcomeContainers = document.querySelectorAll('.welcome-container');
        if (welcomeContainers.length > 1) {
            console.warn(`Found ${welcomeContainers.length} welcome containers - should only have 1`);
            // Keep only the first one
            for (let i = 1; i < welcomeContainers.length; i++) {
                welcomeContainers[i].remove();
            }
            console.log('Fixed duplicate welcome containers');
        } else {
            console.log('Welcome container check passed');
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
                remainingContainer.style.top = 'auto';
                remainingContainer.style.bottom = '24px';
                remainingContainer.style.transform = 'translate(-50%, 0)';
                remainingContainer.style.left = '50%';
                remainingContainer.style.marginLeft = '0';
                remainingContainer.style.right = 'auto';
            }
            console.log('Fixed duplicate chat input containers');
        } else {
            console.log('Chat input container check passed');
        }

        // Check for duplicate chat forms
        const chatForms = document.querySelectorAll('#chatForm');
        if (chatForms.length > 1) {
            console.warn(`Found ${chatForms.length} chat forms with id 'chatForm' - should only have 1`);
            // Keep the first one and remove the rest
            for (let i = 1; i < chatForms.length; i++) {
                chatForms[i].remove();
            }
            console.log('Fixed duplicate chat forms');
        } else {
            console.log('Chat form check passed');
        }

        // Check for duplicate user inputs
        const userInputs = document.querySelectorAll('#userInput');
        if (userInputs.length > 1) {
            console.warn(`Found ${userInputs.length} user inputs with id 'userInput' - should only have 1`);
            // Keep the first one and remove the rest
            for (let i = 1; i < userInputs.length; i++) {
                userInputs[i].remove();
            }
            console.log('Fixed duplicate user inputs');
        } else {
            console.log('User input check passed');
        }

        // Check for duplicate send buttons
        const sendBtns = document.querySelectorAll('#sendBtn');
        if (sendBtns.length > 1) {
            console.warn(`Found ${sendBtns.length} send buttons with id 'sendBtn' - should only have 1`);
            // Keep the first one and remove the rest
            for (let i = 1; i < sendBtns.length; i++) {
                sendBtns[i].remove();
            }
            console.log('Fixed duplicate send buttons');
        } else {
            console.log('Send button check passed');
        }

        // Check for duplicate greeting message containers
        const greetingContainers = document.querySelectorAll('#greetingMessageContainer');
        if (greetingContainers.length > 1) {
            console.warn(`Found ${greetingContainers.length} greeting containers - should only have 1`);
            // Keep only the first one
            for (let i = 1; i < greetingContainers.length; i++) {
                greetingContainers[i].remove();
            }
            console.log('Fixed duplicate greeting containers');
        } else {
            console.log('Greeting container check passed');
        }

        console.log('Duplicate elements check completed');
    } catch (error) {
        console.error('Error running duplicate elements check:', error);
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
    // Run immediately
    checkAndFixDuplicateElements();

    // Run again after a short delay to catch any elements added by other scripts
    setTimeout(checkAndFixDuplicateElements, 1000);

    // Run again after a longer delay to catch any elements added by async operations
    setTimeout(checkAndFixDuplicateElements, 3000);
});

// Also run when the "New Chat" button is clicked
document.addEventListener('click', (event) => {
    // Check if the clicked element is a new chat button or has a parent that is
    const target = event.target;
    const isNewChatButton =
        target.id === 'newChatBtn' ||
        target.closest('#newChatBtn') ||
        (target.classList && target.classList.contains('new-chat-item')) ||
        target.closest('.new-chat-item');

    if (isNewChatButton) {
        console.log('New chat button clicked, scheduling duplicate element check');
        // Run the check after a short delay to allow the UI to update
        setTimeout(checkAndFixDuplicateElements, 500);
    }
});
