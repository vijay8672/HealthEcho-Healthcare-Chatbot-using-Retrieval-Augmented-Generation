/**
 * Search Modal Fix
 * Ensures the search modal displays correctly with proper new chat button and chat history
 * Prevents duplicate search modals from appearing
 */

document.addEventListener('DOMContentLoaded', function () {
    // Main function to fix or create the search modal
    function fixSearchModal() {
      try {
        console.log('Fixing search modal...');
  
        // Remove any existing search modals to prevent duplicates
        const existingModals = document.querySelectorAll('.modal.search-modal, #searchModal');
        existingModals.forEach(modal => {
          modal.remove();
          console.log('Removed existing search modal to prevent duplication');
        });
  
        // Create a new search modal container
        const searchModal = document.createElement('div');
        searchModal.className = 'modal search-modal';
        searchModal.id = 'searchModal';
        searchModal.style.display = 'none';
        searchModal.style.alignItems = 'center';
        searchModal.style.justifyContent = 'center';
  
        // Create modal content container
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content search-modal-content';
  
        // Create search input container and input + close button
        const searchInputContainer = document.createElement('div');
        searchInputContainer.className = 'search-input-container';
  
        const searchInputWrapper = document.createElement('div');
        searchInputWrapper.className = 'search-input-wrapper';
  
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'search-input';
        searchInput.id = 'searchInput';
        searchInput.placeholder = 'Search chats...';
  
        const closeBtn = document.createElement('button');
        closeBtn.className = 'search-close-btn';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.onclick = () => {
          searchModal.style.display = 'none';
          searchInput.value = '';
          filterChats('');
        };
  
        searchInputWrapper.appendChild(searchInput);
        searchInputWrapper.appendChild(closeBtn);
        searchInputContainer.appendChild(searchInputWrapper);
  
        // Create modal body with new chat button and search results container
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
  
        // New Chat item
        const newChatItem = document.createElement('div');
        newChatItem.className = 'new-chat-item';
        newChatItem.onclick = () => {
          searchModal.style.display = 'none';
          if (typeof window.startNewChat === 'function') {
            window.startNewChat();
          }
        };
  
        // New Chat icon
        const newChatIcon = document.createElement('div');
        newChatIcon.className = 'new-chat-icon';
  
        const iconImg = document.createElement('img');
        const isDarkMode = document.body.classList.contains('theme-dark');
        iconImg.src = isDarkMode
          ? '/static/img/new-chat-icon-dark-larger.svg'
          : '/static/img/new-chat-icon-larger.svg';
        iconImg.alt = 'New Chat';
        iconImg.style.width = '24px';
        iconImg.style.height = '24px';
  
        newChatIcon.appendChild(iconImg);
  
        // New Chat title
        const newChatTitle = document.createElement('div');
        newChatTitle.className = 'new-chat-title';
        newChatTitle.textContent = 'New chat';
  
        newChatItem.appendChild(newChatIcon);
        newChatItem.appendChild(newChatTitle);
  
        // Search results container
        const searchResults = document.createElement('div');
        searchResults.className = 'search-results';
        searchResults.id = 'searchResults';
  
        // Search prompt message
        const searchPrompt = document.createElement('div');
        searchPrompt.className = 'search-prompt';
        searchPrompt.textContent = 'Enter keywords to search through your conversations';
  
        searchResults.appendChild(searchPrompt);
  
        modalBody.appendChild(newChatItem);
        modalBody.appendChild(searchResults);
  
        modalContent.appendChild(searchInputContainer);
        modalContent.appendChild(modalBody);
        searchModal.appendChild(modalContent);
  
        document.body.appendChild(searchModal);
  
        // Setup search input event listener
        searchInput.addEventListener('input', () => {
          const query = searchInput.value.trim().toLowerCase();
          filterChats(query);
        });
  
        // Setup sidebar search button click event
        const sidebarSearchBtn = document.getElementById('sidebarSearchBtn');
        if (sidebarSearchBtn && !sidebarSearchBtn.hasAttribute('data-search-handler-set')) {
          sidebarSearchBtn.setAttribute('data-search-handler-set', 'true');
          sidebarSearchBtn.addEventListener('click', () => {
            searchModal.style.display = 'flex'; // flex for centering
            searchInput.focus();
            loadChatHistoryIntoSearch();
            filterChats(''); // reset filter when opened
          });
          console.log('Search button event handler set up');
        }
  
        console.log('Search modal fixed successfully');
      } catch (error) {
        console.error('Error fixing search modal:', error);
      }
    }
  
    // Filter chats based on query string
    function filterChats(query) {
      try {
        const searchResults = document.getElementById('searchResults');
        if (!searchResults) return;
  
        const chatItems = searchResults.querySelectorAll('.search-result-item');
        const searchPrompt = searchResults.querySelector('.search-prompt');
        let noResults = searchResults.querySelector('.no-results');
  
        if (query === '') {
          chatItems.forEach(item => (item.style.display = 'flex'));
          if (searchPrompt) searchPrompt.style.display = 'block';
          if (noResults) noResults.style.display = 'none';
          return;
        }
  
        if (searchPrompt) searchPrompt.style.display = 'none';
  
        let matchFound = false;
        chatItems.forEach(item => {
          const titleElem = item.querySelector('.search-result-title');
          if (titleElem && titleElem.textContent.toLowerCase().includes(query)) {
            item.style.display = 'flex';
            matchFound = true;
          } else {
            item.style.display = 'none';
          }
        });
  
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
  
    // Load chat history from localStorage into search modal results
    function loadChatHistoryIntoSearch() {
      try {
        const searchResults = document.getElementById('searchResults');
        if (!searchResults) return;
  
        const searchPrompt = searchResults.querySelector('.search-prompt');
        searchResults.innerHTML = '';
        if (searchPrompt) searchResults.appendChild(searchPrompt);
  
        const savedChats = JSON.parse(localStorage.getItem('ziahr_chats') || '[]');
        if (!Array.isArray(savedChats) || savedChats.length === 0) return;
  
        // Sort chats newest first
        savedChats.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  
        // Date groupings
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
  
        const sections = {
          today: [],
          yesterday: [],
          lastWeek: [],
          lastMonth: [],
          older: [],
        };
  
        savedChats.forEach(chat => {
          const chatDate = new Date(chat.timestamp || 0);
          if (chatDate >= today) sections.today.push(chat);
          else if (chatDate >= yesterday) sections.yesterday.push(chat);
          else if (chatDate >= lastWeek) sections.lastWeek.push(chat);
          else if (chatDate >= lastMonth) sections.lastMonth.push(chat);
          else sections.older.push(chat);
        });
  
        if (sections.today.length) addDateSection(searchResults, 'Today', sections.today);
        if (sections.yesterday.length) addDateSection(searchResults, 'Yesterday', sections.yesterday);
        if (sections.lastWeek.length) addDateSection(searchResults, 'Previous 7 Days', sections.lastWeek);
        if (sections.lastMonth.length) addDateSection(searchResults, 'Previous 30 Days', sections.lastMonth);
        if (sections.older.length) addDateSection(searchResults, 'Older', sections.older);
      } catch (error) {
        console.error('Error loading chat history into search:', error);
      }
    }
  
    // Helper: add a date section divider and chat items to container
    function addDateSection(container, sectionTitle, chats) {
      // Divider
      const divider = document.createElement('div');
      divider.className = 'search-section-divider';
      divider.textContent = sectionTitle;
      container.appendChild(divider);
  
      chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'search-result-item';
        chatItem.dataset.chatId = chat.id;
  
        chatItem.addEventListener('click', () => {
          const searchModal = document.querySelector('.search-modal');
          if (searchModal) searchModal.style.display = 'none';
  
          if (typeof window.loadChat === 'function') {
            window.loadChat(chat.id);
  
            // Update URL param
            const url = new URL(window.location.href);
            url.searchParams.set('chat', chat.id);
            window.history.pushState({}, '', url);
          }
        });
  
        const chatIcon = document.createElement('div');
        chatIcon.className = 'chat-icon';
        chatIcon.innerHTML = '<i class="fas fa-comment"></i>';
  
        const content = document.createElement('div');
        content.className = 'search-result-content';
  
        const chatTitle = document.createElement('div');
        chatTitle.className = 'search-result-title';
        chatTitle.textContent = chat.title || 'Untitled Chat';
  
        content.appendChild(chatTitle);
        chatItem.appendChild(chatIcon);
        chatItem.appendChild(content);
  
        container.appendChild(chatItem);
      });
    }
  
    // Listen for theme changes and update modal icons accordingly
    document.addEventListener('themeChanged', e => {
      const searchModal = document.getElementById('searchModal');
      if (searchModal) {
        if (e.detail.theme === 'dark') {
          searchModal.classList.add('theme-dark');
        } else {
          searchModal.classList.remove('theme-dark');
        }
  
        // Update new chat icon in search modal
        const newChatIcons = searchModal.querySelectorAll('.new-chat-icon img');
        newChatIcons.forEach(icon => {
          icon.src = e.detail.theme === 'dark'
            ? '/static/img/new-chat-icon-dark-larger.svg'
            : '/static/img/new-chat-icon-larger.svg';
        });
  
        console.log('Theme changed: Updated search modal new chat icons for', e.detail.theme, 'mode');
      }
  
      // Update new chat button icon in sidebar
      const newChatBtn = document.getElementById('newChatBtn');
      if (newChatBtn) {
        const icon = newChatBtn.querySelector('img.new-chat-icon');
        if (icon) {
          icon.src = e.detail.theme === 'dark'
            ? '/static/img/new-chat-icon-dark-larger.svg'
            : '/static/img/new-chat-icon-larger.svg';
          console.log('Theme changed: Updated sidebar new chat icon for', e.detail.theme, 'mode');
        }
      }
    });
  
    // Initialize the modal fix on page load
    fixSearchModal();
  
    // Reapply fix on window resize (if necessary)
    window.addEventListener('resize', fixSearchModal);
  });
  