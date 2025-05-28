/**
 * Immediate Theme Apply
 * This script runs immediately to apply the correct theme and dispatch theme change events
 * before any other scripts or DOM content loads
 */

// Apply theme immediately
(function() {
    try {
        // Load settings from localStorage
        const defaultSettings = {
            theme: 'system',
            language: 'auto-detect'
        };
        
        const loadSettings = function() {
            try {
                const savedSettings = localStorage.getItem('hr_assistant_settings');
                return savedSettings ? JSON.parse(savedSettings) : { ...defaultSettings };
            } catch (error) {
                console.error('Error loading settings:', error);
                return { ...defaultSettings };
            }
        };
        
        // Get the theme setting
        const appSettings = loadSettings();
        const theme = appSettings.theme || 'system';
        
        // Determine the actual theme
        let actualTheme = theme;
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            actualTheme = prefersDark ? 'dark' : 'light';
            document.body.className = prefersDark ? 'theme-dark' : 'theme-light';
        } else {
            document.body.className = `theme-${theme}`;
        }
        
        // Create a style element to ensure the theme is applied immediately
        const style = document.createElement('style');
        style.textContent = `
            body.theme-dark {
                background-color: #1E1E1E !important;
            }
            body.theme-light {
                background-color: #FFFFFF !important;
            }
            
            /* Ensure new chat icons have no filters applied */
            img.new-chat-icon {
                filter: none !important;
            }
            
            /* Ensure correct icon in dark mode */
            .theme-dark img.new-chat-icon {
                filter: none !important;
            }
        `;
        document.head.appendChild(style);
        
        // When DOM is loaded, dispatch the theme changed event
        document.addEventListener('DOMContentLoaded', function() {
            // Dispatch theme changed event
            const themeChangedEvent = new CustomEvent('themeChanged', {
                detail: { theme: actualTheme }
            });
            document.dispatchEvent(themeChangedEvent);
            console.log('Initial theme changed event dispatched for:', actualTheme);
        });
        
        console.log('Theme applied immediately:', actualTheme);
    } catch (error) {
        console.error('Error applying immediate theme:', error);
    }
})();
