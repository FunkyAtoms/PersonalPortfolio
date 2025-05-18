// Screen management
const screens = {
    landing: document.getElementById('landing-page'),
    loading: document.getElementById('loading-screen'),
    startup: document.getElementById('startup-screen'),
    desktop: document.getElementById('desktop-screen')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
    
    // Force all windows to be hidden on startup and reset their state
    document.querySelectorAll('.window').forEach(window => {
        window.hidden = true;
        window.style.display = 'none';
        window.style.zIndex = '1';
        
        // Reset position for mobile
        if (isMobile) {
            centerWindow(window);
        }
    });

    // Clear any existing taskbar tabs
    const taskbarTabs = document.querySelector('.taskbar-tabs');
    taskbarTabs.innerHTML = '';

    updateClock();
    setInterval(updateClock, 1000);
    setupWindowDragging();
    setupTaskbarDragging();
    
    // Load rainbow border setting
    const rainbowSetting = localStorage.getItem('rainbowBorders');
    if (rainbowSetting === 'true') {
        rainbowToggle.checked = true;
        document.querySelectorAll('.window').forEach(window => {
            window.classList.add('rainbow-border');
        });
    }

    // Add click handlers for desktop icons
    document.querySelectorAll('.icon').forEach(icon => {
        icon.addEventListener('click', () => {
            const windowId = icon.getAttribute('data-window');
            const window = document.getElementById(`${windowId}-window`);
            
            if (window) {
                window.hidden = false;
                window.style.display = 'flex';
                
                if (isMobile) {
                    centerWindow(window);
                }
                
                // Create or update taskbar tab
                const existingTab = taskbarTabs.querySelector(`[data-window="${windowId}-window"]`);
                if (!existingTab) {
                    const tab = createTaskbarTab(
                        `${windowId}-window`,
                        icon.querySelector('span').textContent,
                        icon.querySelector('img').src
                    );
                    taskbarTabs.appendChild(tab);
                }
                
                // Activate tab
                document.querySelectorAll('.taskbar-tab').forEach(t => t.classList.remove('active'));
                taskbarTabs.querySelector(`[data-window="${windowId}-window"]`).classList.add('active');
                
                // Bring window to front
                const highestZ = Math.max(...Array.from(document.querySelectorAll('.window'))
                    .map(w => parseInt(w.style.zIndex) || 1));
                window.style.zIndex = String(highestZ + 1);
            }
        });
    });

    // Handle orientation change and resize on mobile
    if (isMobile) {
        window.addEventListener('orientationchange', () => {
            document.querySelectorAll('.window').forEach(window => {
                if (!window.hidden && window.style.display !== 'none') {
                    centerWindow(window);
                }
            });
        });

        window.addEventListener('resize', () => {
            document.querySelectorAll('.window').forEach(window => {
                if (!window.hidden && window.style.display !== 'none') {
                    centerWindow(window);
                }
            });
        });
    }

    // Setup window controls
    setupWindowControls();
});

// What's this button click handler
document.getElementById('whats-this-btn').addEventListener('click', async () => {
    switchToScreen('loading');
    await simulateLoading();
    await startupSequence();
});

// Skip button click handler
document.getElementById('skip-btn').addEventListener('click', () => {
    switchToScreen('desktop');
});

// Loading simulation
async function simulateLoading() {
    const loadingBar = document.getElementById('loading-bar');
    const loadingText = document.getElementById('loading-text');
    
    for (let i = 0; i <= 100; i++) {
        loadingBar.style.width = `${i}%`;
        loadingText.textContent = `Loading... ${i}%`;
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
}

// Startup sequence
async function startupSequence() {
    screens.loading.classList.add('fade-out');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    switchToScreen('startup');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    screens.startup.classList.add('fade-out');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    switchToScreen('desktop');
}

// Switch between screens
function switchToScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active', 'fade-out');
    });
    screens[screenName].classList.add('active');
}

// Clock update
function updateClock() {
    const now = new Date();
    const timeDisplay = document.querySelector('.time');
    timeDisplay.textContent = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Window management
function setupWindowDragging() {
    const windows = document.querySelectorAll('.window');
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    let highestZIndex = 2;
    
    windows.forEach(win => {
        const header = win.querySelector('.window-header');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        // Set initial position and size for desktop only
        if (!win.style.transform && !isMobile && window.innerWidth > 768) {
            win.style.transform = 'translate3d(50px, 50px, 0)';
            win.style.width = '400px';
            win.style.height = '300px';
        }

        function handleDragStart(e) {
            if (e.target.closest('.minimize-btn') || e.target.closest('.close-btn')) {
                return;
            }

            const rect = win.getBoundingClientRect();
            
            if (isMobile) {
                if (!e.touches) return;
                const touch = e.touches[0];
                initialX = touch.clientX - rect.left;
                initialY = touch.clientY - rect.top;
            } else {
                initialX = e.clientX - rect.left;
                initialY = e.clientY - rect.top;
            }

            if (e.target.closest('.window-header')) {
                isDragging = true;
                win.style.transition = 'none';
                
                // Bring window to front
                win.style.zIndex = String(++highestZIndex);
            }
        }

        function handleDragMove(e) {
            if (!isDragging) return;
            
            e.preventDefault();
            
            let clientX, clientY;
            if (isMobile) {
                if (!e.touches) return;
                const touch = e.touches[0];
                clientX = touch.clientX;
                clientY = touch.clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            // Calculate new position
            let newX = clientX - initialX;
            let newY = clientY - initialY;

            // Constrain to viewport bounds
            const rect = win.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width;
            const maxY = window.innerHeight - rect.height - 50; // Account for taskbar

            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));

            // Update position
            if (isMobile) {
                win.style.transform = '';
                win.style.left = `${newX}px`;
                win.style.top = `${newY}px`;
            } else {
                win.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
            }

            xOffset = newX;
            yOffset = newY;
        }

        function handleDragEnd() {
            isDragging = false;
            win.style.transition = '';
        }

        // Add touch events for mobile
        if (isMobile) {
            header.addEventListener('touchstart', handleDragStart, { passive: false });
            document.addEventListener('touchmove', handleDragMove, { passive: false });
            document.addEventListener('touchend', handleDragEnd);
            
            // Center window on open if not already positioned
            if (!win.style.left && !win.style.top) {
                win.style.left = '50%';
                win.style.top = '50%';
                win.style.transform = 'translate(-50%, -50%)';
            }
        }
        
        // Add mouse events for desktop
        if (!isMobile) {
            header.addEventListener('mousedown', handleDragStart);
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
        }

        // Handle window focus
        win.addEventListener(isMobile ? 'touchstart' : 'mousedown', () => {
            // Bring window to front
            win.style.zIndex = String(++highestZIndex);
            
            // Activate taskbar tab
            const windowId = win.id;
            document.querySelectorAll('.taskbar-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            const tab = document.querySelector(`.taskbar-tab[data-window="${windowId}"]`);
            if (tab) {
                tab.classList.add('active');
            }
        });
    });
}

// Taskbar tab drag and drop for touch devices
function setupTaskbarDragging() {
    const tabs = document.querySelectorAll('.taskbar-tab');
    let draggedTab = null;
    let initialX = 0;
    let currentX = 0;

    tabs.forEach(tab => {
        let startX = 0;
        let isDragging = false;

        tab.addEventListener('touchstart', (e) => {
            isDragging = true;
            draggedTab = tab;
            startX = e.touches[0].clientX;
            initialX = tab.offsetLeft;
            
            tab.style.transition = 'none';
            tab.classList.add('dragging');
        }, { passive: true });

        tab.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            currentX = e.touches[0].clientX - startX;
            const newPosition = initialX + currentX;
            
            // Find the center point of the dragged tab
            const draggedCenter = newPosition + (tab.offsetWidth / 2);
            
            // Check other tabs for repositioning
            tabs.forEach(otherTab => {
                if (otherTab !== draggedTab) {
                    const otherCenter = otherTab.offsetLeft + (otherTab.offsetWidth / 2);
                    if (Math.abs(draggedCenter - otherCenter) < otherTab.offsetWidth / 2) {
                        if (draggedCenter < otherCenter) {
                            taskbarTabs.insertBefore(draggedTab, otherTab);
                        } else {
                            taskbarTabs.insertBefore(draggedTab, otherTab.nextSibling);
                        }
                    }
                }
            });
        }, { passive: true });

        tab.addEventListener('touchend', () => {
            if (!isDragging) return;
            
            isDragging = false;
            draggedTab.style.transform = '';
            draggedTab.style.transition = '';
            draggedTab.classList.remove('dragging');
            draggedTab = null;
        });
    });
}

// Taskbar tab management
const taskbarTabs = document.querySelector('.taskbar-tabs');

function createTaskbarTab(windowId, title, iconSrc) {
    const tab = document.createElement('div');
    tab.className = 'taskbar-tab';
    tab.setAttribute('data-window', windowId);
    tab.draggable = true;
    
    const icon = document.createElement('img');
    icon.src = iconSrc;
    icon.alt = title;
    icon.draggable = false; // Prevent image dragging
    
    const text = document.createTextNode(title);
    
    tab.appendChild(icon);
    tab.appendChild(text);
    
    // Add drag and drop event listeners
    tab.addEventListener('dragstart', handleDragStart);
    tab.addEventListener('dragend', handleDragEnd);
    
    tab.addEventListener('click', () => {
        const window = document.getElementById(windowId);
        const isHidden = window.hidden || window.style.display === 'none';
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
        
        if (isHidden) {
            // Show window
            window.hidden = false;
            window.style.display = 'flex';
            tab.classList.add('active');
            
            // Reset position for mobile/small screens
            if (isMobile) {
                window.style.transform = 'translate(-50%, -50%)';
                window.style.left = '50%';
                window.style.top = '50%';
                window.style.width = window.innerWidth > 480 ? '95vw' : '98vw';
                window.style.height = window.innerHeight <= 600 ? '70vh' : '80vh';
            }
            
            // Bring window to front
            const highestZ = Math.max(...Array.from(document.querySelectorAll('.window'))
                .map(w => parseInt(w.style.zIndex) || 1));
            window.style.zIndex = String(highestZ + 1);
        } else {
            // Hide window
            window.hidden = true;
            window.style.display = 'none';
            tab.classList.remove('active');
        }
    });
    
    return tab;
}

// Drag and drop functionality
let draggedTab = null;

function handleDragStart(e) {
    draggedTab = this;
    e.dataTransfer.effectAllowed = 'move';
    this.classList.add('dragging');

    // Add dragover and drop listeners to all other tabs
    document.querySelectorAll('.taskbar-tab').forEach(tab => {
        if (tab !== draggedTab) {
            tab.addEventListener('dragover', handleDragOver);
            tab.addEventListener('drop', handleDrop);
        }
    });
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedTab = null;

    // Remove dragover and drop listeners from all tabs
    document.querySelectorAll('.taskbar-tab').forEach(tab => {
        tab.removeEventListener('dragover', handleDragOver);
        tab.removeEventListener('drop', handleDrop);
    });
}

function handleDragOver(e) {
    e.preventDefault();
    if (!draggedTab || this === draggedTab) return;

    const bounding = this.getBoundingClientRect();
    const offset = bounding.x + (bounding.width / 2);
    
    if (e.clientX - offset > 0) {
        if (this.nextSibling !== draggedTab) {
            this.parentNode.insertBefore(draggedTab, this.nextSibling);
        }
    } else {
        if (this.previousSibling !== draggedTab) {
            this.parentNode.insertBefore(draggedTab, this);
        }
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Also add dragover event listener to the taskbar-tabs container
taskbarTabs.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(taskbarTabs, e.clientX);
    if (draggedTab) {
        if (afterElement) {
            taskbarTabs.insertBefore(draggedTab, afterElement);
        } else {
            taskbarTabs.appendChild(draggedTab);
        }
    }
});

function getDragAfterElement(container, x) {
    const draggableElements = [...container.querySelectorAll('.taskbar-tab:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Update window close handlers
function setupWindowControls() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    document.querySelectorAll('.window').forEach(window => {
        const closeBtn = window.querySelector('.close-btn');
        const minimizeBtn = window.querySelector('.minimize-btn');

        if (closeBtn) {
            // Remove any existing listeners
            closeBtn.replaceWith(closeBtn.cloneNode(true));
            const newCloseBtn = window.querySelector('.close-btn');
            
            // Add both click and touch handlers
            const closeHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.hidden = true;
                window.style.display = 'none';
                
                // Remove taskbar tab
                const windowId = window.id;
                const tab = document.querySelector(`.taskbar-tab[data-window="${windowId}"]`);
                if (tab) {
                    tab.remove();
                }

                // If this is the settings window, also uncheck the settings menu item
                if (windowId === 'settings-window') {
                    const settingsMenuItem = document.querySelector('.start-menu-item:nth-child(3)');
                    if (settingsMenuItem) {
                        settingsMenuItem.classList.remove('active');
                    }
                }
            };

            newCloseBtn.addEventListener('click', closeHandler);
            newCloseBtn.addEventListener('touchend', closeHandler);
        }

        if (minimizeBtn) {
            // Remove any existing listeners
            minimizeBtn.replaceWith(minimizeBtn.cloneNode(true));
            const newMinimizeBtn = window.querySelector('.minimize-btn');
            
            // Add both click and touch handlers
            const minimizeHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.hidden = true;
                window.style.display = 'none';
                
                // Update taskbar tab state
                const windowId = window.id;
                const tab = document.querySelector(`.taskbar-tab[data-window="${windowId}"]`);
                if (tab) {
                    tab.classList.remove('active');
                }
            };

            newMinimizeBtn.addEventListener('click', minimizeHandler);
            newMinimizeBtn.addEventListener('touchend', minimizeHandler);
        }
    });
}

// Start menu functionality
const startBtn = document.getElementById('start-btn');
const startMenu = document.querySelector('.start-menu');
const shutDownBtn = document.getElementById('shut-down-btn');

// Settings functionality
const settingsMenuItem = document.querySelector('.start-menu-item:nth-child(3)');
const settingsWindow = document.getElementById('settings-window');
const rainbowToggle = document.getElementById('rainbow-outline-toggle');

// Handle Start button click
startBtn.addEventListener('click', () => {
    startBtn.classList.toggle('active');
    startMenu.classList.toggle('active');
});

// Close Start menu when touching outside
document.addEventListener('touchstart', (e) => {
    if (!startBtn.contains(e.target) && !startMenu.contains(e.target)) {
        startBtn.classList.remove('active');
        startMenu.classList.remove('active');
    }
});

// Handle Shut Down
shutDownBtn.addEventListener('click', async () => {
    // Create shutdown dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #c0c0c0;
        border: 2px solid #dfdfdf;
        border-right-color: #000;
        border-bottom-color: #000;
        padding: 2px;
        z-index: 1001;
    `;
    dialog.innerHTML = `
        <div style="background: #000080; color: #fff; padding: 3px 5px; font-weight: bold;">
            Shut Down Windows
        </div>
        <div style="padding: 15px; text-align: center;">
            <p style="margin-bottom: 20px;">Are you sure you want to shut down?</p>
            <button id="confirm-shutdown" style="margin-right: 10px; padding: 5px 10px;">Yes</button>
            <button id="cancel-shutdown" style="padding: 5px 10px;">No</button>
        </div>
    `;
    document.body.appendChild(dialog);

    // Add button handlers
    document.getElementById('confirm-shutdown').addEventListener('click', async () => {
        dialog.remove();
        startBtn.classList.remove('active');
        startMenu.classList.remove('active');
        
        // Fade to black
        const fadeScreen = document.createElement('div');
        fadeScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            opacity: 0;
            transition: opacity 1s;
            z-index: 1002;
        `;
        document.body.appendChild(fadeScreen);
        
        // Trigger fade
        setTimeout(() => {
            fadeScreen.style.opacity = '1';
        }, 100);

        // Wait for fade
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Show shutdown text
        const shutdownText = document.createElement('div');
        shutdownText.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #fff;
            font-size: 24px;
            z-index: 1003;
        `;
        shutdownText.textContent = 'It is now safe to turn off your computer.';
        document.body.appendChild(shutdownText);

        // Wait before returning to landing page
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Remove elements and return to landing page
        fadeScreen.remove();
        shutdownText.remove();

        // Reset any open windows
        document.querySelectorAll('.window').forEach(window => {
            window.hidden = true;
            window.style.transform = '';
        });

        // Switch back to landing page
        switchToScreen('landing');

        // Add this inside the confirm-shutdown click handler before switching screens
        taskbarTabs.innerHTML = '';
    });

    document.getElementById('cancel-shutdown').addEventListener('click', () => {
        dialog.remove();
    });
});

// Handle Settings menu item click
settingsMenuItem.addEventListener('click', () => {
    // Close start menu
    startBtn.classList.remove('active');
    startMenu.classList.remove('active');
    
    const settingsWindow = document.getElementById('settings-window');
    
    // Show settings window
    settingsWindow.hidden = false;
    settingsWindow.style.display = 'flex';
    
    // Ensure proper mobile positioning
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        settingsWindow.style.transform = 'translate(-50%, -50%)';
        settingsWindow.style.top = '50%';
        settingsWindow.style.left = '50%';
        settingsWindow.style.width = window.innerWidth > 480 ? '95vw' : '98vw';
        settingsWindow.style.height = '80vh';
    }
    
    // Create taskbar tab if it doesn't exist
    const existingTab = taskbarTabs.querySelector('[data-window="settings-window"]');
    if (!existingTab) {
        const tab = createTaskbarTab(
            'settings-window',
            'Settings',
            settingsMenuItem.querySelector('img').src
        );
        taskbarTabs.appendChild(tab);
    }
    
    // Activate tab
    const tab = taskbarTabs.querySelector('[data-window="settings-window"]');
    document.querySelectorAll('.taskbar-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Bring window to front
    const highestZ = Math.max(...Array.from(document.querySelectorAll('.window'))
        .map(w => parseInt(w.style.zIndex) || 1));
    settingsWindow.style.zIndex = String(highestZ + 1);
});

// Handle rainbow border toggle
rainbowToggle.addEventListener('change', () => {
    const windows = document.querySelectorAll('.window');
    if (rainbowToggle.checked) {
        windows.forEach(window => {
            window.classList.add('rainbow-border');
        });
    } else {
        windows.forEach(window => {
            window.classList.remove('rainbow-border');
        });
    }
    
    // Save the setting to localStorage
    localStorage.setItem('rainbowBorders', rainbowToggle.checked);
});

// Add a function to center window
function centerWindow(window) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
    if (isMobile) {
        window.style.transform = 'translate(-50%, -50%)';
        window.style.left = '50%';
        window.style.top = '50%';
        window.style.width = window.innerWidth > 480 ? '95vw' : '98vw';
        window.style.height = window.innerHeight <= 600 ? '70vh' : '80vh';
    }
} 
