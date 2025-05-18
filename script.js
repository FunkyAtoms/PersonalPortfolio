// Screen management
const screens = {
    landing: document.getElementById('landing-page'),
    loading: document.getElementById('loading-screen'),
    startup: document.getElementById('startup-screen'),
    desktop: document.getElementById('desktop-screen')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    setInterval(updateClock, 1000);
    setupWindowDragging();
    
    // Load rainbow border setting
    const rainbowSetting = localStorage.getItem('rainbowBorders');
    if (rainbowSetting === 'true') {
        rainbowToggle.checked = true;
        document.querySelectorAll('.window').forEach(window => {
            window.classList.add('rainbow-border');
        });
    }
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
    
    windows.forEach(win => {
        const header = win.querySelector('.window-header');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        // Set initial position and size
        if (!win.style.transform) {
            win.style.transform = 'translate3d(50px, 50px, 0)';
            win.style.width = '400px';
            win.style.height = '300px';
        }

        header.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === header || e.target.parentElement === header) {
                isDragging = true;
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                setTranslate(currentX, currentY, win);
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
        }

        function dragEnd() {
            isDragging = false;
        }

        // Handle window focus
        win.addEventListener('mousedown', () => {
            document.querySelectorAll('.window').forEach(w => {
                w.style.zIndex = '1';
            });
            win.style.zIndex = '2';
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
        if (window.hidden) {
            window.hidden = false;
            tab.classList.add('active');
        } else {
            // If window is already visible, minimize it
            window.hidden = true;
            tab.classList.remove('active');
        }
        
        // Bring window to front
        document.querySelectorAll('.window').forEach(w => {
            w.style.zIndex = '1';
        });
        window.style.zIndex = '2';
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

// Update desktop icon click handlers
document.querySelectorAll('.icon').forEach(icon => {
    icon.addEventListener('click', () => {
        const windowId = icon.getAttribute('data-window');
        const window = document.getElementById(`${windowId}-window`);
        const existingTab = taskbarTabs.querySelector(`[data-window="${windowId}-window"]`);
        
        if (!existingTab) {
            // Create new tab if it doesn't exist
            const tab = createTaskbarTab(
                `${windowId}-window`,
                icon.querySelector('span').textContent,
                icon.querySelector('img').src
            );
            taskbarTabs.appendChild(tab);
        }
        
        // Show window and activate tab
        window.hidden = false;
        document.querySelectorAll('.taskbar-tab').forEach(t => t.classList.remove('active'));
        taskbarTabs.querySelector(`[data-window="${windowId}-window"]`).classList.add('active');
        
        // Bring window to front
        document.querySelectorAll('.window').forEach(w => {
            w.style.zIndex = '1';
        });
        window.style.zIndex = '2';
        
        if (!window.style.transform) {
            window.style.transform = 'translate3d(50px, 50px, 0)';
        }
    });
});

// Update window close and minimize handlers
document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const window = btn.closest('.window');
        const windowId = window.id;
        const tab = taskbarTabs.querySelector(`[data-window="${windowId}"]`);
        
        window.hidden = true;
        if (tab) {
            tab.remove();
        }
    });
});

document.querySelectorAll('.minimize-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const window = btn.closest('.window');
        const windowId = window.id;
        const tab = taskbarTabs.querySelector(`[data-window="${windowId}"]`);
        
        window.hidden = true;
        if (tab) {
            tab.classList.remove('active');
        }
    });
});

// Update window focus handling
document.querySelectorAll('.window').forEach(window => {
    window.addEventListener('mousedown', () => {
        // Deactivate all tabs
        document.querySelectorAll('.taskbar-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Activate the tab for this window
        const tab = taskbarTabs.querySelector(`[data-window="${window.id}"]`);
        if (tab) {
            tab.classList.add('active');
        }
        
        // Bring window to front
        document.querySelectorAll('.window').forEach(w => {
            w.style.zIndex = '1';
        });
        window.style.zIndex = '2';
    });
});

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

// Close Start menu when clicking outside
document.addEventListener('click', (e) => {
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
    
    // Show settings window
    settingsWindow.hidden = false;
    
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
    document.querySelectorAll('.window').forEach(w => {
        w.style.zIndex = '1';
    });
    settingsWindow.style.zIndex = '2';
    
    if (!settingsWindow.style.transform) {
        settingsWindow.style.transform = 'translate3d(50px, 50px, 0)';
    }
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