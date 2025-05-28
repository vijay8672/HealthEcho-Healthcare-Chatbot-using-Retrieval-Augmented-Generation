/**
 * File Manager for handling multiple file uploads, previews, and state management
 */

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

class FileManager {
    constructor() {
        this.files = []; // Array to store file objects
        this.isLocked = false; // State to track if files are locked (after query submission)
        this.fileListContainer = document.getElementById('fileListContainer');
        this.inputAttachmentsContainer = document.getElementById('inputAttachmentsContainer');
        this.fileDisplayArea = document.querySelector('.file-display-area');
        this.previewModal = document.getElementById('filePreviewModal');
        this.previewContainer = document.getElementById('filePreviewContainer');
        this.previewFileName = document.getElementById('previewFileName');
        this.closePreviewBtn = document.getElementById('closePreview');
        this.closeFilePreviewModalBtn = document.getElementById('closeFilePreviewModal');

        // Make sure the file list container exists
        if (!this.fileListContainer) {
            console.warn('File list container not found, creating one');
            this.fileListContainer = document.createElement('div');
            this.fileListContainer.id = 'fileListContainer';
            this.fileListContainer.className = 'file-list-container';
            document.body.appendChild(this.fileListContainer);
        }

        // Make sure the input attachments container exists
        if (!this.inputAttachmentsContainer) {
            console.warn('Input attachments container not found, creating one');
            this.inputAttachmentsContainer = document.createElement('div');
            this.inputAttachmentsContainer.id = 'inputAttachmentsContainer';
            this.inputAttachmentsContainer.className = 'input-attachments-container';

            // Position it inside the input wrapper
            const userInput = document.getElementById('userInput');
            if (userInput) {
                const inputWrapper = userInput.closest('.input-wrapper');
                if (inputWrapper) {
                    // Insert the container before the textarea
                    inputWrapper.insertBefore(this.inputAttachmentsContainer, userInput);
                } else {
                    document.body.appendChild(this.inputAttachmentsContainer);
                }
            } else {
                document.body.appendChild(this.inputAttachmentsContainer);
            }
        } else {
            // Reposition the existing container inside the input wrapper
            const userInput = document.getElementById('userInput');
            if (userInput) {
                const inputWrapper = userInput.closest('.input-wrapper');
                if (inputWrapper) {
                    // Insert the container before the textarea
                    inputWrapper.insertBefore(this.inputAttachmentsContainer, userInput);
                }
            }
        }

        // Ensure the file list container is hidden when empty
        if (this.fileListContainer.innerHTML.trim() === '') {
            this.fileListContainer.style.display = 'none';
        }

        // Initialize event listeners
        this.initEventListeners();
    }

    initEventListeners() {
        // Close preview modal
        if (this.closePreviewBtn) {
            this.closePreviewBtn.addEventListener('click', () => this.closePreviewModal());
        }

        if (this.closeFilePreviewModalBtn) {
            this.closeFilePreviewModalBtn.addEventListener('click', () => this.closePreviewModal());
        }

        // Handle chat form submission to lock files
        const chatForm = document.getElementById('chatForm');
        if (chatForm) {
            chatForm.addEventListener('submit', () => {
                if (this.files.length > 0) {
                    this.lockFiles();
                }
            });
        }
    }

    /**
     * Handle multiple file uploads
     * @param {FileList} fileList - List of files from input element
     */
    handleFileUpload(fileList) {
        console.log('Handling file upload:', fileList);

        // If files are locked, don't allow new uploads
        if (this.isLocked) {
            console.log('Files are locked. Cannot upload new files.');
            this.showToastNotification('Files Locked', 'Files are locked during processing. Please wait.', true);
            return;
        }

        try {
            // Make sure the input attachments container is visible
            if (this.inputAttachmentsContainer) {
                this.inputAttachmentsContainer.style.display = 'flex';
                console.log('Ensuring input attachments container is visible');
            }

            // Process each file
            const files = Array.from(fileList);
            if (files.length > 0) {
                console.log(`Processing ${files.length} files for upload`);

                // Log current files for debugging
                console.log(`Current files in manager: ${this.files.length}`);
                this.files.forEach(file => {
                    console.log(`Existing file: ${file.name} (ID: ${file.id})`);
                });

                // Limit to 7 files maximum
                const maxFiles = 7;
                const currentFileCount = this.files.length;
                const availableSlots = maxFiles - currentFileCount;

                console.log(`Available slots: ${availableSlots} (max: ${maxFiles}, current: ${currentFileCount})`);

                if (availableSlots <= 0) {
                    console.log('Maximum file limit reached (7 files)');
                    // Show notification to user about max file limit
                    this.showMaxFilesNotification();
                    return;
                }

                // Check for duplicate files
                const uniqueFiles = [];
                const duplicateFiles = [];

                files.forEach(file => {
                    // Check if file with same name already exists
                    const isDuplicate = this.files.some(existingFile => existingFile.name === file.name);

                    if (isDuplicate) {
                        duplicateFiles.push(file.name);
                        console.log(`Skipping duplicate file: ${file.name}`);
                    } else {
                        uniqueFiles.push(file);
                        console.log(`Adding unique file: ${file.name}`);
                    }
                });

                // Show notification if duplicates were found
                if (duplicateFiles.length > 0) {
                    this.showDuplicateFilesNotification(duplicateFiles);
                }

                // Process only unique files up to the available slots
                const filesToProcess = uniqueFiles.slice(0, availableSlots);
                console.log(`Processing ${filesToProcess.length} unique files (${duplicateFiles.length} duplicates removed)`);

                // Process each file with a slight delay between uploads to prevent race conditions
                if (filesToProcess.length > 0) {
                    // Upload the first file immediately
                    this.uploadFile(filesToProcess[0]);

                    // Upload the rest with a slight delay between each
                    for (let i = 1; i < filesToProcess.length; i++) {
                        ((index) => {
                            setTimeout(() => {
                                console.log(`Uploading file ${index + 1} of ${filesToProcess.length}`);
                                this.uploadFile(filesToProcess[index]);
                            }, index * 300); // 300ms delay between uploads
                        })(i);
                    }
                }

                // Update send button state
                this.updateSendButtonState();
            }
        } catch (error) {
            console.error('Error in handleFileUpload:', error);
            this.showToastNotification('Upload Error', 'An error occurred while processing files.', true);
        }
    }

    /**
     * Show notification for maximum file limit reached
     */
    showMaxFilesNotification() {
        console.log('Showing maximum file limit notification');

        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'duplicate-files-notification';
        notification.innerHTML = `
            <div class="notification-header">
                <i class="fas fa-exclamation-circle"></i>
                <span>Maximum File Limit Reached</span>
                <button class="close-notification">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="notification-content">
                <p>You can only upload a maximum of 7 files at a time.</p>
                <p>Please remove some files before uploading more.</p>
            </div>
        `;

        // Add to document
        document.body.appendChild(notification);

        // Add event listener for close button
        const closeBtn = notification.querySelector('.close-notification');
        closeBtn.addEventListener('click', () => {
            notification.classList.add('slideOut');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.classList.add('slideOut');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 5000);

        // Show a toast notification as a backup in case the main notification doesn't appear
        this.showToastNotification('Maximum File Limit', 'You can only upload a maximum of 7 files at a time.', true); // true indicates error
    }

    /**
     * Show a simple toast notification
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {boolean} isError - Whether this is an error notification
     */
    showToastNotification(title, message, isError = false) {
        console.log(`Toast notification: ${title} - ${message}`);

        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'simple-toast';

        // Add error class if it's an error message
        if (isError) {
            toast.classList.add('error');
        } else {
            toast.classList.add('success');
        }

        // Use the title in the message if provided
        const displayMessage = title ? `${title}: ${message}` : message;

        toast.innerHTML = `
            ${displayMessage}
            <button class="toast-close-btn">&times;</button>
        `;

        // Add to document
        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Add close button event
        const closeBtn = toast.querySelector('.toast-close-btn');
        closeBtn.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        });

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(toast)) {
                        document.body.removeChild(toast);
                    }
                }, 300);
            }
        }, 3000);
    }

    /**
     * Show notification for duplicate files
     * @param {Array} duplicateFiles - Array of duplicate file names
     */
    showDuplicateFilesNotification(duplicateFiles) {
        console.log('Showing duplicate files notification');

        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'duplicate-files-notification';
        notification.innerHTML = `
            <div class="notification-header">
                <i class="fas fa-exclamation-circle"></i>
                <span>Duplicate Files Found</span>
                <button class="close-notification">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="notification-content">
                <p>The following duplicate files were removed:</p>
                <ul>
                    ${duplicateFiles.map(fileName => `<li>${fileName}</li>`).join('')}
                </ul>
            </div>
        `;

        // Add to document
        document.body.appendChild(notification);

        // Add event listener for close button
        const closeBtn = notification.querySelector('.close-notification');
        closeBtn.addEventListener('click', () => {
            notification.classList.add('slideOut');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.classList.add('slideOut');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 5000);

        // Show a toast notification as a backup in case the main notification doesn't appear
        this.showToastNotification('Duplicate Files', `${duplicateFiles.length} duplicate file(s) were not added.`, true); // true indicates error
    }

    /**
     * Upload a single file
     * @param {File} file - File object to upload
     */
    uploadFile(file) {
        try {
            // Create FormData for API request
            const formData = new FormData();
            formData.append('file', file);

            // Generate a unique ID for this file
            const fileId = `file-${Date.now()}-${file.name.replace(/[^a-z0-9]/gi, '-')}`;
            console.log(`Starting upload for file: ${file.name} with ID: ${fileId}`);

            // Add file to UI immediately (optimistic UI)
            this.addFileToUI(file, fileId, 'uploading');

            // Make sure the input attachments container is visible
            if (this.inputAttachmentsContainer) {
                this.inputAttachmentsContainer.style.display = 'flex';
                console.log('Ensuring input attachments container is visible during upload');
            }

            // Upload file to server
            axios.post('/api/upload-document', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            .then(response => {
                console.log(`Server response for ${file.name}:`, response.data);

                // Update file status in UI
                this.updateFileStatus(fileId, 'success');

                // Create file object
                const fileObj = {
                    id: fileId,
                    file: file,
                    name: file.name,
                    type: file.type,
                    extension: file.name.split('.').pop().toLowerCase(),
                    status: 'success',
                    serverData: response.data
                };

                // Add file to internal array
                this.files.push(fileObj);

                console.log(`File uploaded successfully: ${file.name}`);
                console.log(`Current files in manager after adding: ${this.files.length}`);

                // Log all files for debugging
                this.files.forEach(f => {
                    console.log(`- File in array: ${f.name} (ID: ${f.id})`);
                });

                // Update send button state
                this.updateSendButtonState();
            })
            .catch(error => {
                console.error(`Upload error for ${file.name}:`, error);
                this.updateFileStatus(fileId, 'error');

                // Show error notification
                this.showToastNotification('Upload Error', `Failed to upload ${file.name}. Please try again.`, true);

                // Remove file from UI after a delay
                setTimeout(() => {
                    this.removeFileFromUI(fileId);
                }, 3000);
            });
        } catch (error) {
            console.error('Error handling file upload:', error);
            this.showToastNotification('Upload Error', 'An unexpected error occurred during upload.', true);
        }
    }

    /**
     * Get file icon and color based on file extension
     * @param {string} extension - File extension
     * @returns {Object} Object with icon and color properties
     */
    getFileIconAndColor(extension) {
        // Default icon and color
        let icon = 'fas fa-file';
        let color = '#6c757d';  // Default gray

        // Determine icon and color based on file extension
        switch (extension.toLowerCase()) {
            case 'pdf':
                icon = 'fas fa-file-pdf';
                color = '#dc3545';  // Red
                break;
            case 'docx':
            case 'doc':
                icon = 'fas fa-file-word';
                color = '#0d6efd';  // Blue
                break;
            case 'xlsx':
            case 'xls':
                icon = 'fas fa-file-excel';
                color = '#198754';  // Green
                break;
            case 'pptx':
            case 'ppt':
                icon = 'fas fa-file-powerpoint';
                color = '#fd7e14';  // Orange
                break;
            case 'txt':
                icon = 'fas fa-file-alt';
                color = '#6c757d';  // Gray
                break;
            case 'md':
                icon = 'fab fa-markdown';
                color = '#6610f2';  // Purple
                break;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
                icon = 'fas fa-file-image';
                color = '#20c997';  // Teal
                break;
            case 'mp3':
            case 'wav':
            case 'ogg':
                icon = 'fas fa-file-audio';
                color = '#d63384';  // Pink
                break;
            case 'mp4':
            case 'avi':
            case 'mov':
                icon = 'fas fa-file-video';
                color = '#6f42c1';  // Purple
                break;
            case 'zip':
            case 'rar':
            case '7z':
                icon = 'fas fa-file-archive';
                color = '#ffc107';  // Yellow
                break;
            case 'html':
            case 'htm':
                icon = 'fas fa-file-code';
                color = '#0dcaf0';  // Cyan
                break;
            default:
                icon = 'fas fa-file';
                color = '#6c757d';  // Gray
        }

        return { icon, color };
    }

    /**
     * Add file to UI
     * @param {File} file - File object
     * @param {string} fileId - Unique ID for the file
     * @param {string} status - File status (uploading, success, error)
     */
    addFileToUI(file, fileId, status = 'uploading') {
        try {
            console.log(`Adding file to UI: ${file.name} (ID: ${fileId}, Status: ${status})`);

            // Get file extension and icon
            const fileExtension = file.name.split('.').pop().toLowerCase();
            const { icon, color } = this.getFileIconAndColor(fileExtension);

            // Make sure the file display area is hidden (we don't want to show it)
            if (this.fileDisplayArea) {
                this.fileDisplayArea.style.display = 'none';
            }

            // Create file element for internal tracking (hidden)
            const fileElement = document.createElement('div');
            fileElement.className = `file-item ${status}`;
            fileElement.id = fileId;
            fileElement.dataset.filename = file.name;
            // Create file content
            fileElement.innerHTML = `
                <div class="file-icon" style="background-color: ${color}">
                    <i class="${icon}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-type">${fileExtension.toUpperCase()}</div>
                </div>
                <div class="file-actions">
                    <button class="file-preview" title="Preview file">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="file-remove" title="Remove file">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;

            // Add to file list container (hidden, for internal tracking)
            if (this.fileListContainer) {
                this.fileListContainer.appendChild(fileElement);
                console.log(`Added file element to file list container`);
            }

            // Create attachment element for input area (visible to user)
            const attachmentElement = document.createElement('div');
            attachmentElement.className = `input-attachment ${status}`;
            attachmentElement.dataset.fileId = fileId;
            attachmentElement.innerHTML = `
                <div class="file-icon" style="background-color: ${color}">
                    <i class="${icon}"></i>
                </div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-type">${fileExtension.toUpperCase()}</div>
                </div>
                <button class="remove-attachment" title="Remove file">
                    <i class="fas fa-times"></i>
                </button>
            `;

            // Add to input attachments container (visible in input area)
            if (this.inputAttachmentsContainer) {
                // Make sure the container is positioned correctly
                this.inputAttachmentsContainer.style.position = 'relative';
                this.inputAttachmentsContainer.style.zIndex = '10';
                this.inputAttachmentsContainer.style.marginBottom = '4px';
                this.inputAttachmentsContainer.style.maxHeight = '120px';
                this.inputAttachmentsContainer.style.overflowY = 'auto';
                this.inputAttachmentsContainer.style.border = '1px solid var(--border-color)';
                this.inputAttachmentsContainer.style.padding = '8px';

                // Add the attachment to the container
                this.inputAttachmentsContainer.appendChild(attachmentElement);
                console.log(`Added attachment element to input attachments container for file: ${file.name}`);

                // Always ensure the container is visible
                this.inputAttachmentsContainer.style.display = 'flex';

                // Count the actual DOM elements
                const attachmentCount = this.inputAttachmentsContainer.querySelectorAll('.input-attachment').length;
                console.log(`Input attachments container now has ${attachmentCount} children`);

                // Position the container correctly
                const userInput = document.getElementById('userInput');
                if (userInput) {
                    const inputWrapper = userInput.closest('.input-wrapper');
                    if (inputWrapper) {
                        // Insert the container before the textarea
                        inputWrapper.insertBefore(this.inputAttachmentsContainer, userInput);
                        console.log('Positioned input attachments container inside input wrapper');
                    }
                }
            } else {
                console.warn('Input attachments container not found when adding file to UI');
                // Try to recreate the container
                this.inputAttachmentsContainer = document.createElement('div');
                this.inputAttachmentsContainer.id = 'inputAttachmentsContainer';
                this.inputAttachmentsContainer.className = 'input-attachments-container';
                this.inputAttachmentsContainer.style.display = 'flex';

                // Add the attachment to the new container
                this.inputAttachmentsContainer.appendChild(attachmentElement);

                // Try to position it correctly
                const userInput = document.getElementById('userInput');
                if (userInput) {
                    const inputWrapper = userInput.closest('.input-wrapper');
                    if (inputWrapper) {
                        inputWrapper.insertBefore(this.inputAttachmentsContainer, userInput);
                    } else {
                        document.body.appendChild(this.inputAttachmentsContainer);
                    }
                } else {
                    document.body.appendChild(this.inputAttachmentsContainer);
                }
                console.log('Created new input attachments container as fallback');
            }

            // Add event listeners to both elements
            this.addFileEventListeners(fileElement, fileId);
            this.addAttachmentEventListeners(attachmentElement, fileId);

            console.log(`Successfully added file to UI: ${file.name}`);
        } catch (error) {
            console.error('Error adding file to UI:', error);
            this.showToastNotification('UI Error', 'Error displaying file in the interface.', true);
        }
    }

    /**
     * Add event listeners to attachment element in input area
     * @param {HTMLElement} attachmentElement - Attachment element in the input area
     * @param {string} fileId - Unique ID for the file
     */
    addAttachmentEventListeners(attachmentElement, fileId) {
        // Remove button
        const removeBtn = attachmentElement.querySelector('.remove-attachment');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent bubbling
                this.removeFile(fileId);
            });
        }

        // Make the whole attachment clickable for preview
        attachmentElement.addEventListener('click', (e) => {
            if (!e.target.closest('.remove-attachment')) {
                const file = this.files.find(f => f.id === fileId);
                if (file) {
                    this.previewFile(file);
                }
            }
        });
    }

    /**
     * Add event listeners to file element
     * @param {HTMLElement} fileElement - File element in the UI
     * @param {string} fileId - Unique ID for the file
     */
    addFileEventListeners(fileElement, fileId) {
        // Preview button
        const previewBtn = fileElement.querySelector('.file-preview');
        if (previewBtn) {
            previewBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent bubbling
                const file = this.files.find(f => f.id === fileId);
                if (file) {
                    this.previewFile(file);
                }
            });
        }

        // Remove button
        const removeBtn = fileElement.querySelector('.file-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent bubbling
                this.removeFile(fileId);
            });
        }
    }

    /**
     * Update file status in UI
     * @param {string} fileId - Unique ID for the file
     * @param {string} status - New status (uploading, success, error)
     */
    updateFileStatus(fileId, status) {
        // Update in hidden file list container
        const fileElement = document.getElementById(fileId);
        if (fileElement) {
            // Remove all status classes
            fileElement.classList.remove('uploading', 'success', 'error');
            // Add new status class
            fileElement.classList.add(status);
        }

        // Update in input attachments container
        const attachmentElement = this.inputAttachmentsContainer.querySelector(`[data-file-id="${fileId}"]`);
        if (attachmentElement) {
            // Remove all status classes
            attachmentElement.classList.remove('uploading', 'success', 'error');
            // Add new status class
            attachmentElement.classList.add(status);
        }
    }

    /**
     * Remove file from UI and internal array
     * @param {string} fileId - Unique ID for the file
     */
    removeFile(fileId) {
        // If files are locked, don't allow removal
        if (this.isLocked) {
            console.log('Files are locked. Cannot remove files.');
            return;
        }

        try {
            // Find the file before removing it (for logging)
            const fileToRemove = this.files.find(file => file.id === fileId);
            if (fileToRemove) {
                console.log(`Removing file: ${fileToRemove.name} (ID: ${fileId})`);

                // Make a copy of the files array before filtering
                const filesBefore = [...this.files];

                // Remove from internal array
                this.files = this.files.filter(file => file.id !== fileId);

                console.log(`Files before removal: ${filesBefore.length}, after removal: ${this.files.length}`);

                // Log the remaining files for debugging
                this.files.forEach(file => {
                    console.log(`Remaining file: ${file.name} (ID: ${file.id})`);
                });

                // Remove from UI
                this.removeFileFromUI(fileId);

                // Update send button state based on remaining files and text input
                this.updateSendButtonState();

                // Make sure the input attachments container visibility is correct
                if (this.files.length > 0) {
                    console.log(`Still have ${this.files.length} files, ensuring container is visible`);
                    this.inputAttachmentsContainer.style.display = 'flex';
                } else {
                    console.log(`No more files in internal array, container will be hidden after animation`);
                }
            } else {
                console.warn(`File with ID ${fileId} not found in internal array`);
            }
        } catch (error) {
            console.error('Error removing file:', error);
        }
    }

    /**
     * Update send button state based on files and text input
     */
    updateSendButtonState() {
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            const userInput = document.getElementById('userInput');
            const hasContent = userInput && userInput.value.trim() !== '';
            const hasFiles = this.files.length > 0;

            // Only enable the send button if there's text content
            // Changed from (hasContent || hasFiles) to just hasContent
            sendBtn.disabled = !hasContent;
            console.log(`Send button state updated: ${!sendBtn.disabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Remove file element from UI
     * @param {string} fileId - Unique ID for the file
     */
    removeFileFromUI(fileId) {
        // Log the removal for debugging
        console.log(`Removing file UI elements for ID: ${fileId}`);

        // Remove from hidden file list container
        const fileElement = document.getElementById(fileId);
        if (fileElement) {
            // Add removal animation
            fileElement.style.opacity = '0';
            fileElement.style.transform = 'translateY(10px)';

            // Remove after animation
            setTimeout(() => {
                if (fileElement && fileElement.parentNode) {
                    fileElement.remove();
                    console.log(`Removed file element from file list container`);
                }
            }, 300);
        }

        // Remove from input attachments container - use a more specific selector
        const attachmentElement = this.inputAttachmentsContainer.querySelector(`.input-attachment[data-file-id="${fileId}"]`);
        if (attachmentElement) {
            // Add removal animation
            attachmentElement.style.opacity = '0';
            attachmentElement.style.transform = 'translateY(10px)';

            // Remove after animation
            setTimeout(() => {
                if (attachmentElement && attachmentElement.parentNode) {
                    attachmentElement.remove();
                    console.log(`Removed attachment element from input attachments container`);
                }

                // Check the actual DOM elements count, not just the internal array
                const remainingAttachments = this.inputAttachmentsContainer.querySelectorAll('.input-attachment').length;
                console.log(`Remaining attachments in DOM: ${remainingAttachments}`);

                // Only hide the container if there are no more attachment elements
                if (remainingAttachments === 0) {
                    console.log(`No more attachments in DOM, hiding input attachments container`);
                    this.inputAttachmentsContainer.style.display = 'none';
                } else {
                    console.log(`${remainingAttachments} attachments remaining in DOM, keeping input attachments container visible`);
                    // Make sure the container is still visible for remaining files
                    this.inputAttachmentsContainer.style.display = 'flex';
                }
            }, 300);
        }
    }

    /**
     * Preview file in modal
     * @param {Object} file - File object from internal array
     */
    previewFile(file) {
        // Set file name in modal header
        this.previewFileName.textContent = file.name;

        // Show loading indicator
        this.previewContainer.innerHTML = `
            <div class="preview-loading">
                <i class="fas fa-spinner"></i> Loading preview...
            </div>
        `;

        // Show modal
        this.previewModal.style.display = 'flex';

        // Generate preview based on file type
        const extension = file.extension;

        if (extension === 'pdf') {
            this.previewPDF(file);
        } else if (extension === 'docx') {
            this.previewDOCX(file);
        } else if (extension === 'txt' || extension === 'md') {
            this.previewText(file);
        } else {
            // Unsupported file type
            this.previewContainer.innerHTML = `
                <div class="preview-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Preview not available for this file type.</p>
                </div>
            `;
        }
    }

    /**
     * Preview PDF file
     * @param {Object} file - File object from internal array
     */
    previewPDF(file) {
        const fileReader = new FileReader();

        fileReader.onload = function(event) {
            const typedArray = new Uint8Array(event.target.result);

            // Load PDF using PDF.js
            pdfjsLib.getDocument(typedArray).promise.then(pdf => {
                const container = document.createElement('div');
                container.className = 'pdf-preview';

                // Clear loading indicator
                this.previewContainer.innerHTML = '';
                this.previewContainer.appendChild(container);

                // Render first 5 pages (or fewer if the document has fewer pages)
                const numPages = Math.min(pdf.numPages, 5);

                for (let i = 1; i <= numPages; i++) {
                    pdf.getPage(i).then(page => {
                        const scale = 1.5;
                        const viewport = page.getViewport({ scale });

                        // Create canvas for this page
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        // Add page number
                        const pageNum = document.createElement('div');
                        pageNum.className = 'page-number';
                        pageNum.textContent = `Page ${i} of ${pdf.numPages}`;

                        container.appendChild(pageNum);
                        container.appendChild(canvas);

                        // Render PDF page to canvas
                        page.render({
                            canvasContext: context,
                            viewport: viewport
                        });
                    });
                }

                // Add message if there are more pages
                if (pdf.numPages > 5) {
                    const morePages = document.createElement('div');
                    morePages.className = 'more-pages';
                    morePages.textContent = `... and ${pdf.numPages - 5} more pages`;
                    container.appendChild(morePages);
                }
            }).catch(error => {
                console.error('Error rendering PDF:', error);
                this.previewContainer.innerHTML = `
                    <div class="preview-error">
                        <p>Error loading PDF: ${error.message}</p>
                    </div>
                `;
            });
        }.bind(this);

        // Read file as array buffer
        fileReader.readAsArrayBuffer(file.file);
    }

    /**
     * Preview DOCX file
     * @param {Object} file - File object from internal array
     */
    previewDOCX(file) {
        const fileReader = new FileReader();

        fileReader.onload = function(event) {
            // Use Mammoth.js to convert DOCX to HTML
            mammoth.convertToHtml({ arrayBuffer: event.target.result })
                .then(result => {
                    const container = document.createElement('div');
                    container.className = 'docx-preview';
                    container.innerHTML = result.value;

                    // Clear loading indicator
                    this.previewContainer.innerHTML = '';
                    this.previewContainer.appendChild(container);

                    // Show warnings if any
                    if (result.messages.length > 0) {
                        console.warn('DOCX conversion warnings:', result.messages);
                    }
                })
                .catch(error => {
                    console.error('Error rendering DOCX:', error);
                    this.previewContainer.innerHTML = `
                        <div class="preview-error">
                            <p>Error loading DOCX: ${error.message}</p>
                        </div>
                    `;
                });
        }.bind(this);

        // Read file as array buffer
        fileReader.readAsArrayBuffer(file.file);
    }

    /**
     * Preview text file
     * @param {Object} file - File object from internal array
     */
    previewText(file) {
        const fileReader = new FileReader();

        fileReader.onload = function(event) {
            const container = document.createElement('div');
            container.className = 'txt-preview';
            container.textContent = event.target.result;

            // Clear loading indicator
            this.previewContainer.innerHTML = '';
            this.previewContainer.appendChild(container);
        }.bind(this);

        // Read file as text
        fileReader.readAsText(file.file);
    }

    /**
     * Close preview modal
     */
    closePreviewModal() {
        this.previewModal.style.display = 'none';
        // Clear preview container
        this.previewContainer.innerHTML = '';
    }

    /**
     * Get all files
     * @returns {Array} Array of file objects
     */
    getFiles() {
        return this.files;
    }

    /**
     * Clear all files
     */
    clearFiles() {
        // Remove all files from UI
        this.files.forEach(file => {
            this.removeFileFromUI(file.id);
        });

        // Clear internal array
        this.files = [];
        this.isLocked = false;

        // Clear the input attachments container
        if (this.inputAttachmentsContainer) {
            this.inputAttachmentsContainer.innerHTML = '';
            this.inputAttachmentsContainer.style.display = 'none';
        }

        // Clear the file list container
        if (this.fileListContainer) {
            this.fileListContainer.innerHTML = '';
        }

        // Make sure the file display area is hidden
        if (this.fileDisplayArea) {
            this.fileDisplayArea.style.display = 'none';
        }

        // Update send button state
        this.updateSendButtonState();

        console.log('All files cleared');
    }

    /**
     * Lock files after query submission
     */
    lockFiles() {
        console.log(`Locking ${this.files.length} files`);
        this.isLocked = true;

        // Add locked class to all file elements
        this.files.forEach(file => {
            console.log(`Locking file: ${file.name} (ID: ${file.id})`);

            // Lock in hidden file list container
            const fileElement = document.getElementById(file.id);
            if (fileElement) {
                fileElement.classList.add('locked');
            }

            // Lock in input attachments container
            const attachmentElement = this.inputAttachmentsContainer.querySelector(`[data-file-id="${file.id}"]`);
            if (attachmentElement) {
                attachmentElement.classList.add('locked');

                // Disable remove button
                const removeBtn = attachmentElement.querySelector('.remove-attachment');
                if (removeBtn) {
                    removeBtn.disabled = true;
                    removeBtn.style.opacity = '0.5';
                    removeBtn.style.cursor = 'not-allowed';
                }
            }
        });

        // Store the current files for reference
        this.lockedFiles = [...this.files];
        console.log(`Stored ${this.lockedFiles.length} locked files for reference`);

        // Clear the input attachments container after submission
        // This is because the files are now part of the message
        setTimeout(() => {
            this.inputAttachmentsContainer.innerHTML = '';
            this.inputAttachmentsContainer.style.display = 'none';
            this.inputAttachmentsContainer.style.border = 'none';
            this.inputAttachmentsContainer.style.padding = '0';
            this.inputAttachmentsContainer.style.margin = '0';

            // Make sure the file display area is hidden
            if (this.fileDisplayArea) {
                this.fileDisplayArea.style.display = 'none';
            }
        }, 500);
    }

    /**
     * Unlock files for editing
     */
    unlockFiles() {
        this.isLocked = false;

        // Remove locked class from all file elements
        this.files.forEach(file => {
            // Unlock in hidden file list container
            const fileElement = document.getElementById(file.id);
            if (fileElement) {
                fileElement.classList.remove('locked');
            }

            // Recreate attachments in the input area
            this.addFileToInputArea(file);
        });
    }

    /**
     * Add file to input area (used when unlocking files)
     * @param {Object} file - File object from internal array
     */
    addFileToInputArea(file) {
        if (!file || !file.id) return;

        // Get file extension and icon
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const { icon, color } = this.getFileIconAndColor(fileExtension);

        // Create attachment element
        const attachmentElement = document.createElement('div');
        attachmentElement.className = 'input-attachment success';
        attachmentElement.dataset.fileId = file.id;
        attachmentElement.innerHTML = `
            <div class="file-icon" style="background-color: ${color}">
                <i class="${icon}"></i>
            </div>
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-type">${fileExtension.toUpperCase()}</div>
            </div>
            <button class="remove-attachment" title="Remove file">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to input attachments container
        if (this.inputAttachmentsContainer) {
            this.inputAttachmentsContainer.appendChild(attachmentElement);
            this.inputAttachmentsContainer.style.display = 'flex';

            // Add event listeners
            this.addAttachmentEventListeners(attachmentElement, file.id);
        }
    }

    // Note: This is a duplicate method that has been removed.
    // The clearFiles method is already defined above.

    /**
     * Get file icon and color based on extension
     * @param {string} extension - File extension
     * @returns {Object} Object with icon class and color
     */
    getFileIconAndColor(extension) {
        let icon = 'fas fa-file';
        let color = '#6c757d';  // Default gray

        switch (extension.toLowerCase()) {
            case 'pdf':
                icon = 'fas fa-file-pdf';
                color = '#dc3545';  // Red
                break;
            case 'doc':
            case 'docx':
                icon = 'fas fa-file-word';
                color = '#0d6efd';  // Blue
                break;
            case 'xls':
            case 'xlsx':
                icon = 'fas fa-file-excel';
                color = '#198754';  // Green
                break;
            case 'ppt':
            case 'pptx':
                icon = 'fas fa-file-powerpoint';
                color = '#fd7e14';  // Orange
                break;
            case 'txt':
                icon = 'fas fa-file-alt';
                color = '#6c757d';  // Gray
                break;
            case 'md':
                icon = 'fab fa-markdown';
                color = '#6610f2';  // Purple
                break;
            default:
                icon = 'fas fa-file';
                color = '#6c757d';  // Gray
        }

        return { icon, color };
    }

    /**
     * Check if there are any files
     * @returns {boolean} True if there are files, false otherwise
     */
    hasFiles() {
        return this.files.length > 0;
    }

    /**
     * Reset the file manager completely
     * This should be called when starting a new chat or when files need to be completely reset
     */
    reset() {
        console.log('Completely resetting file manager');

        // Clear all files
        this.files.forEach(file => {
            this.removeFileFromUI(file.id);
        });

        // Clear internal arrays
        this.files = [];
        this.lockedFiles = [];

        // Reset locked state
        this.isLocked = false;

        // Clear the input attachments container
        if (this.inputAttachmentsContainer) {
            this.inputAttachmentsContainer.innerHTML = '';
            this.inputAttachmentsContainer.style.display = 'none';
            this.inputAttachmentsContainer.style.border = 'none';
            this.inputAttachmentsContainer.style.padding = '0';
            this.inputAttachmentsContainer.style.margin = '0';
        }

        // Clear the file list container
        if (this.fileListContainer) {
            this.fileListContainer.innerHTML = '';
        }

        // Update send button state
        this.updateSendButtonState();

        // Log the reset
        console.log('File manager has been completely reset');
    }

    /**
     * Get all files
     * @returns {Array} Array of file objects
     */
    getFiles() {
        return this.files;
    }
}

// The file manager will be initialized in app-integration.js
// window.fileManager = new FileManager();
