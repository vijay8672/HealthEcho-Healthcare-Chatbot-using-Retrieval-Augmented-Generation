/**
 * Search Modal Fix
 * Ensures the search modal displays correctly with proper new chat button and chat history
 * Prevents duplicate search modals from appearing
 */

document.addEventListener('DOMContentLoaded', function() {
    // Function to fix the search modal
    function fixSearchModal() {
        try {
            console.log('Fixing search modal...');

            // Remove any existing search modals to prevent duplicates
            const existingModals = document.querySelectorAll('.modal.search-modal, #searchModal');
            existingModals.forEach(modal => {
                if (modal) {
                    modal.remove();
                    console.log('Removed existing search modal to prevent duplication');
                }
            });

            // Create a new search modal
            let searchModal = document.createElement('div');
            searchModal.className = 'modal search-modal';
            searchModal.id = 'searchModal';
            searchModal.style.display = 'none';
            searchModal.style.alignItems = 'center';
            searchModal.style.justifyContent = 'center';

            // Create the modal content
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content search-modal-content';

            // Create the search input container
            const searchInputContainer = document.createElement('div');
            searchInputContainer.className = 'search-input-container';

            // Create the search input wrapper
            const searchInputWrapper = document.createElement('div');
            searchInputWrapper.className = 'search-input-wrapper';

            // Create the search input
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.className = 'search-input';
            searchInput.id = 'searchInput';
            searchInput.placeholder = 'Search chats...';

            // Create the close button
            const closeBtn = document.createElement('button');
            closeBtn.className = 'search-close-btn';
            closeBtn.innerHTML = '<i class="fas fa-times"></i>';
            closeBtn.onclick = function() {
                searchModal.style.display = 'none';
            };

            // Assemble the search input container
            searchInputWrapper.appendChild(searchInput);
            searchInputWrapper.appendChild(closeBtn);
            searchInputContainer.appendChild(searchInputWrapper);

            // Create the modal body
            const modalBody = document.createElement('div');
            modalBody.className = 'modal-body';

            // Create the new chat item
            const newChatItem = document.createElement('div');
            newChatItem.className = 'new-chat-item';
            newChatItem.onclick = function() {
                searchModal.style.display = 'none';
                if (typeof window.startNewChat === 'function') {
                    window.startNewChat();
                }
            };

                // Create the new chat icon (using our custom icon)
                const newChatIcon = document.createElement('div');
                newChatIcon.className = 'new-chat-icon';

                // Use the same icon as the sidebar new chat button
                const iconImg = document.createElement('img');
                // Use dark icon for light mode and light icon for dark mode
                const isDarkMode = document.body.classList.contains('theme-dark');
                iconImg.src = isDarkMode ? '/static/img/new-chat-icon-dark-larger.svg' : '/static/img/new-chat-icon-larger.svg';
                iconImg.alt = 'New Chat';
                iconImg.style.width = '20px';
                iconImg.style.height = '20px';

                // Add the icon to the new chat item
                newChatIcon.appendChild(iconImg);

                // Create the new chat title
                const newChatTitle = document.createElement('div');
                newChatTitle.className = 'new-chat-title';
                newChatTitle.textContent = 'New chat';

                // Assemble the new chat item
                newChatItem.appendChild(newChatIcon);
                newChatItem.appendChild(newChatTitle);

                // Create the search results container
                const searchResults = document.createElement('div');
                searchResults.className = 'search-results';
                searchResults.id = 'searchResults';

                // Add the search prompt
                const searchPrompt = document.createElement('div');
                searchPrompt.className = 'search-prompt';
                searchPrompt.textContent = 'Enter keywords to search through your conversations';
                searchResults.appendChild(searchPrompt);

                // Assemble the modal body
                modalBody.appendChild(newChatItem);
                modalBody.appendChild(searchResults);

                // Assemble the modal content
                modalContent.appendChild(searchInputContainer);
                modalContent.appendChild(modalBody);

                // Assemble the search modal
                searchModal.appendChild(modalContent);

                // Add the search modal to the document
                document.body.appendChild(searchModal);

                console.log('Created new search modal');
            } else {
                console.log('Search modal already exists, updating it');

                // Update the new chat item if it exists
                let newChatItem = searchModal.querySelector('.new-chat-item');
                if (newChatItem) {
                    // Update the new chat icon
                    let newChatIcon = newChatItem.querySelector('.new-chat-icon');
                    if (newChatIcon) {
                        // Clear existing content
                        newChatIcon.innerHTML = '';

                        // Add the custom icon
                        const iconImg = document.createElement('img');
                        // In dark mode, use white circle with black plus (new-chat-icon-dark-larger.svg)
                        // In light mode, use black circle with white plus (new-chat-icon-larger.svg)
                        const isDarkMode = document.body.classList.contains('theme-dark');
                        iconImg.src = isDarkMode ? '/static/img/new-chat-icon-dark-larger.svg' : '/static/img/new-chat-icon-larger.svg';
                        iconImg.alt = 'New Chat';
                        iconImg.style.width = '24px';
                        iconImg.style.height = '24px';
                        console.log('Search modal new chat icon set for theme:', isDarkMode ? 'dark' : 'light');

                        newChatIcon.appendChild(iconImg);
                    }
                }
            }

            // Set up the search input functionality
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    const query = this.value.trim().toLowerCase();
                    filterChats(query);
                });
            }

            // Set up the sidebar search button
            const sidebarSearchBtn = document.getElementById('sidebarSearchBtn');
            if (sidebarSearchBtn) {
                // Remove any existing click event listeners to prevent duplicates
                const newClickHandler = function() {
                    searchModal.style.display = 'flex'; // Changed to flex for better centering
                    if (searchInput) {
                        searchInput.focus();
                    }

                    // Load chat history into search results
                    loadChatHistoryIntoSearch();
                };

                // Use a unique identifier for this event listener
                sidebarSearchBtn.setAttribute('data-search-handler-set', 'true');

                // Add the new click event listener
                sidebarSearchBtn.addEventListener('click', newClickHandler);

                console.log('Search button event handler set up');
            }

            console.log('Search modal fixed successfully');
        } catch (error) {
            console.error('Error fixing search modal:', error);
        }
    }

    // Function to filter chats based on search query
    function filterChats(query) {
        try {
            const searchResults = document.getElementById('searchResults');
            if (!searchResults) return;

            // Get all chat result items
            const chatItems = searchResults.querySelectorAll('.search-result-item');

            if (query === '') {
                // Show all items if query is empty
                chatItems.forEach(item => {
                    item.style.display = 'flex';
                });

                // Show the search prompt
                let searchPrompt = searchResults.querySelector('.search-prompt');
                if (searchPrompt) {
                    searchPrompt.style.display = 'block';
                }

                return;
            }

            // Hide the search prompt when searching
            let searchPrompt = searchResults.querySelector('.search-prompt');
            if (searchPrompt) {
                searchPrompt.style.display = 'none';
            }

            let matchFound = false;

            // Filter chat items
            chatItems.forEach(item => {
                const title = item.querySelector('.search-result-title');
                if (title && title.textContent.toLowerCase().includes(query)) {
                    item.style.display = 'flex';
                    matchFound = true;
                } else {
                    item.style.display = 'none';
                }
            });

            // Show no results message if needed
            let noResults = searchResults.querySelector('.no-results');
            if (!matchFound) {
                if (!noResults) {
                    noResults = document.createElement('div');
                    noResults.className = 'no-results';
                    noResults.textContent = 'No matching chats found';
                    searchResults.appendChild(noResults);
                }
                noResults.style.display = 'block';
            } else if (noResults) {
                noResults.style.display = 'none';
            }
        } catch (error) {
            console.error('Error filtering chats:', error);
        }
    }

    // Function to load chat history into search results
    function loadChatHistoryIntoSearch() {
        try {
            const searchResults = document.getElementById('searchResults');
            if (!searchResults) return;

            // Clear existing results except the search prompt
            const searchPrompt = searchResults.querySelector('.search-prompt');
            searchResults.innerHTML = '';
            if (searchPrompt) {
                searchResults.appendChild(searchPrompt);
            }

            // Get saved chats from localStorage
            const savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');

            if (savedChats.length === 0) {
                // No chats to display
                return;
            }

            // Sort chats by timestamp (newest first)
            savedChats.sort((a, b) => {
                const dateA = new Date(a.timestamp || 0);
                const dateB = new Date(b.timestamp || 0);
                return dateB - dateA;
            });

            // Group chats by date
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const lastWeek = new Date(today);
            lastWeek.setDate(lastWeek.getDate() - 7);

            const lastMonth = new Date(today);
            lastMonth.setMonth(lastMonth.getMonth() - 1);

            // Create date sections
            const sections = {
                today: [],
                yesterday: [],
                lastWeek: [],
                lastMonth: [],
                older: []
            };

            // Categorize chats by date
            savedChats.forEach(chat => {
                const chatDate = new Date(chat.timestamp || 0);

                if (chatDate >= today) {
                    sections.today.push(chat);
                } else if (chatDate >= yesterday) {
                    sections.yesterday.push(chat);
                } else if (chatDate >= lastWeek) {
                    sections.lastWeek.push(chat);
                } else if (chatDate >= lastMonth) {
                    sections.lastMonth.push(chat);
                } else {
                    sections.older.push(chat);
                }
            });

            // Add chats to search results by section
            if (sections.today.length > 0) {
                addDateSection(searchResults, 'Today', sections.today);
            }

            if (sections.yesterday.length > 0) {
                addDateSection(searchResults, 'Yesterday', sections.yesterday);
            }

            if (sections.lastWeek.length > 0) {
                addDateSection(searchResults, 'Previous 7 Days', sections.lastWeek);
            }

            if (sections.lastMonth.length > 0) {
                addDateSection(searchResults, 'Previous 30 Days', sections.lastMonth);
            }

            if (sections.older.length > 0) {
                addDateSection(searchResults, 'Older', sections.older);
            }
        } catch (error) {
            console.error('Error loading chat history into search:', error);
        }
    }

    // Helper function to add a date section with chats
    function addDateSection(container, title, chats) {
        // Create section divider
        const divider = document.createElement('div');
        divider.className = 'search-section-divider';
        divider.textContent = title;
        container.appendChild(divider);

        // Add chat items
        chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'search-result-item';
            chatItem.dataset.chatId = chat.id;

            // Add click handler to load the chat
            chatItem.addEventListener('click', function() {
                // Hide the search modal
                const searchModal = document.querySelector('.search-modal');
                if (searchModal) {
                    searchModal.style.display = 'none';
                }

                // Load the chat
                if (typeof window.loadChat === 'function') {
                    window.loadChat(chat.id);

                    // Update URL with chat ID
                    const url = new URL(window.location.href);
                    url.searchParams.set('chat', chat.id);
                    window.history.pushState({}, '', url);
                }
            });

            // Create chat icon
            const chatIcon = document.createElement('div');
            chatIcon.className = 'chat-icon';
            chatIcon.innerHTML = '<i class="fas fa-comment"></i>';

            // Create content container
            const content = document.createElement('div');
            content.className = 'search-result-content';

            // Create title
            const title = document.createElement('div');
            title.className = 'search-result-title';
            title.textContent = chat.title || 'Untitled Chat';

            // Assemble the chat item
            content.appendChild(title);
            chatItem.appendChild(chatIcon);
            chatItem.appendChild(content);

            // Add to container
            container.appendChild(chatItem);
        });
    }

    // Run the fix
    fixSearchModal();

    // Also run when the window is resized
    window.addEventListener('resize', fixSearchModal);

    // Add event listener for theme changes
    document.addEventListener('themeChanged', function(e) {
        // Update modal styling based on theme
        const searchModal = document.getElementById('searchModal');
        if (searchModal) {
            if (e.detail.theme === 'dark') {
                searchModal.classList.add('theme-dark');
            } else {
                searchModal.classList.remove('theme-dark');
            }

            // Update new chat icon in search modal
            // In dark mode, use white circle with black plus (new-chat-icon-dark-larger.svg)
            // In light mode, use black circle with white plus (new-chat-icon-larger.svg)
            const newChatIcons = searchModal.querySelectorAll('.new-chat-icon img');
            newChatIcons.forEach(icon => {
                icon.src = e.detail.theme === 'dark'
                    ? '/static/img/new-chat-icon-dark-larger.svg'
                    : '/static/img/new-chat-icon-larger.svg';
            });
            console.log('Theme changed: Updated search modal new chat icons for', e.detail.theme, 'mode');
        }

        // Update new chat button icon in sidebar
        // In dark mode, use white circle with black plus (new-chat-icon-dark-larger.svg)
        // In light mode, use black circle with white plus (new-chat-icon-larger.svg)
        const newChatBtn = document.getElementById('newChatBtn');
        if (newChatBtn) {
            const icon = newChatBtn.querySelector('img.new-chat-icon');
            if (icon) {
                icon.src = e.detail.theme === 'dark'
                    ? '/static/img/new-chat-icon-dark-larger.svg'
                    : '/static/img/new-chat-icon-larger.svg';
                console.log('Theme changed: Updated sidebar new chat icon from search-modal-fix.js for', e.detail.theme, 'mode');
            }
        }
    });
});
