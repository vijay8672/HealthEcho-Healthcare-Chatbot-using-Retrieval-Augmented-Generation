/**
 * HR Escalation Manager
 * Handles the HR escalation form and related functionality
 */

class EscalationManager {
    constructor() {
        this.modal = document.getElementById('escalationModal');
        this.form = document.getElementById('escalationForm');
        this.userDetailsBox = document.getElementById('userDetails');
        this.hrPersonSelect = document.getElementById('hrPerson');
        
        this.initializeEventListeners();
        this.loadHRRepresentatives();
    }

    initializeEventListeners() {
        // Close modal when clicking the X
        const closeBtn = this.modal.querySelector('.close');
        closeBtn.addEventListener('click', () => this.closeModal());

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Handle form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Handle cancel button
        const cancelBtn = document.getElementById('cancelEscalation');
        cancelBtn.addEventListener('click', () => this.closeModal());
    }

    async loadHRRepresentatives() {
        try {
            const response = await fetch('/api/hr-representatives');
            const data = await response.json();
            
            if (data.success) {
                this.populateHRSelect(data.representatives);
            } else {
                console.error('Failed to load HR representatives:', data.message);
                showToastNotification('Error', 'Failed to load HR representatives', true);
            }
        } catch (error) {
            console.error('Error loading HR representatives:', error);
            showToastNotification('Error', 'Failed to load HR representatives', true);
        }
    }

    populateHRSelect(representatives) {
        this.hrPersonSelect.innerHTML = '<option value="">Select HR Representative</option>';
        
        representatives.forEach(rep => {
            const option = document.createElement('option');
            option.value = rep.id;
            option.textContent = `${rep.name} - ${rep.department}`;
            this.hrPersonSelect.appendChild(option);
        });
    }

    showModal() {
        this.populateUserDetails();
        this.modal.style.display = 'block';
    }

    closeModal() {
        this.modal.style.display = 'none';
        this.form.reset();
    }

    populateUserDetails() {
        // Get user details from settings
        const appSettings = JSON.parse(localStorage.getItem('hr_assistant_settings') || '{}');
        const userDetails = appSettings.personal || {};
        
        // Update the user details box to contain input fields
        this.userDetailsBox.innerHTML = `
            <div class="form-group">
                <label for="escalationName">Name:</label>
                <input type="text" id="escalationName" class="form-control" value="${userDetails.fullName || 'N/A'}">
            </div>
            <div class="form-group">
                <label for="escalationEmail">Email:</label>
                <input type="email" id="escalationEmail" class="form-control" value="${userDetails.email || 'N/A'}">
            </div>
            <div class="form-group">
                <label for="escalationDepartment">Department:</label>
                <input type="text" id="escalationDepartment" class="form-control" value="${userDetails.department || 'N/A'}">
            </div>
            <div class="form-group">
                <label for="escalationEmployeeId">Employee ID:</label>
                <input type="text" id="escalationEmployeeId" class="form-control" value="${userDetails.employeeId || 'N/A'}">
            </div>
        `;
    }

    async handleSubmit(e) {
        e.preventDefault();

        // Get updated user details from the form
        const updatedUserDetails = {
            fullName: document.getElementById('escalationName').value,
            email: document.getElementById('escalationEmail').value,
            department: document.getElementById('escalationDepartment').value,
            employeeId: document.getElementById('escalationEmployeeId').value
        };

        // Save updated user details to settings
        const appSettings = JSON.parse(localStorage.getItem('hr_assistant_settings') || '{}');
        appSettings.personal = updatedUserDetails;
        localStorage.setItem('hr_assistant_settings', JSON.stringify(appSettings));

        const formData = {
            hrPerson: this.hrPersonSelect.value,
            issueType: document.getElementById('issueType').value,
            issueDescription: document.getElementById('issueDescription').value,
            priority: document.getElementById('priority').value
        };

        try {
            const response = await fetch('/api/submit-escalation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                showToastNotification('Success', data.message);
                this.closeModal();
                
                // Add a system message to the chat
                if (typeof addMessageToUI === 'function') {
                    addMessageToUI('system', `Your issue has been escalated to HR (ID: ${data.escalation_id}). They will contact you shortly.`, null, new Date().toISOString());
                }
            } else {
                showToastNotification('Error', data.message || 'Failed to submit escalation', true);
            }
        } catch (error) {
            console.error('Error submitting escalation:', error);
            showToastNotification('Error', 'Failed to submit escalation', true);
        }
    }
}

// Add a button to the chat interface to open the escalation form
function addEscalationButton() {
    // Find the new inline escalation icon container
    const inlineIconContainer = document.getElementById('inlineEscalationIconContainer');

    if (inlineIconContainer) {
        // Make the icon visible
        inlineIconContainer.style.display = 'flex'; // Use flex if icon-button uses flex

        // Remove any existing listeners first to prevent duplicates
        const existingClickListener = inlineIconContainer.clickListener;
        if (existingClickListener) {
            inlineIconContainer.removeEventListener('click', existingClickListener);
        }
        const newClickListener = () => {
            if (window.escalationManager) {
                window.escalationManager.showModal();
            }
        };
        inlineIconContainer.addEventListener('click', newClickListener);
        inlineIconContainer.clickListener = newClickListener; // Store the listener for removal

        console.log('Inline escalation icon made visible and click listener added.');
    } else {
        console.error('Inline escalation icon container not found.');
    }

    // Remove the old floating escalation button and its styles
    const oldFloatingButtonContainer = document.querySelector('.escalation-button-container');
    if (oldFloatingButtonContainer) {
        oldFloatingButtonContainer.remove();
        console.log('Removed old floating escalation button container.');
    }

    // Remove the style block for the old floating button if it exists
    // Find the style element by checking its content
    const styleElements = document.querySelectorAll('style');
    styleElements.forEach(style => {
        if (style.textContent.includes('.escalation-button-container')) {
            style.remove();
            console.log('Removed old floating escalation button styles.');
        }
    });
}

// Initialize the escalation manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.escalationManager = new EscalationManager();

    // Check if user is logged in on page load using auth_token or body class
    const isLoggedIn = !!localStorage.getItem('auth_token') || document.documentElement.classList.contains('logged-in');
    if (isLoggedIn) {
        addEscalationButton();
    }
});

// Listen for the custom event dispatched after successful login
window.addEventListener('user-logged-in', () => {
    console.log('user-logged-in event received in escalation-manager.js');
    addEscalationButton();
});

// Listen for the custom event dispatched after logout
window.addEventListener('user-logged-out', () => {
    console.log('user-logged-out event received in escalation-manager.js');
    // Find the inline escalation icon container
    const inlineIconContainer = document.getElementById('inlineEscalationIconContainer');
    if (inlineIconContainer) {
        // Hide the icon
        inlineIconContainer.style.display = 'none';
        console.log('Inline escalation icon hidden after logout.');
    }
}); 