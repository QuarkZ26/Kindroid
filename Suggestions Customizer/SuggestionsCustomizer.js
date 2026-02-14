// ==UserScript==
// @name          Kindroid Suggestion Buttons Customizer
// @namespace     Violentmonkey Scripts
// @version       3.22.2 // Updated version for retry logic
// @description   Customizable suggestion buttons with management interface, with drag & drop
// @match         *://*.kindroid.ai/*
// @grant         GM_setValue
// @grant         GM_getValue
// @grant         GM_addValueChangeListener
// @grant         GM_registerMenuCommand
// @icon          https://raw.githubusercontent.com/QuarkZ26/Kindroid/refs/heads/main/kindroid-icon-filled-256.png
// ==/UserScript==

(function () {
    'use strict';

    const MAX_CHARS = 200;
    const STORAGE_KEY = 'kindroid_last_text';
    const BUTTONS_CONFIG_KEY = 'kindroid_buttons_config';
    const BUTTONS_ADDED_KEY = 'buttons_added_flag';
    const MAX_CONTAINER_WIDTH = 640; // Maximum width before wrapping

    // Variable to store the currently dragged item's original index
    let draggedItemIndex = -1;

    // Retry variables for checkAndSetupButtons
    let setupRetries = 0;
    const MAX_SETUP_RETRIES = 5; // Max retries
    const RETRY_DELAY_MS = 200; // Delay between retries for retries

    // Default button configuration
    const defaultButtonConfig = {
        buttons: [
            { id: 'clear', label: 'Clear', text: '', bgColor: 'var(--chakra-colors-red-100)' },
            { id: 'last', label: 'Last', text: '', bgColor: 'var(--chakra-colors-blue-100)' },
            { id: 'emotion', label: 'Add emotion', text: 'Add more emotional detail and internal response.', bgColor: '' },
            { id: 'less_narrate', label: 'Less narrating', text: 'no actions.', bgColor: '' },
            { id: 'separate', label: 'Separate', text: 'Separate paragraphs', bgColor: '' },
            { id: 'simplify', label: 'Simplify', text: 'Use simpler, more direct wording.', bgColor: '' }
        ]
    };

    // Load or initialize button configuration
    function loadButtonConfig() {
        const savedConfig = GM_getValue(BUTTONS_CONFIG_KEY);
        return savedConfig ? JSON.parse(savedConfig) : JSON.parse(JSON.stringify(defaultButtonConfig));
    }

    // Save button configuration
    function saveButtonConfig(config) {
        GM_setValue(BUTTONS_CONFIG_KEY, JSON.stringify(config));
    }

    // Management UI functions
    function showButtonManager() {
        const config = loadButtonConfig();
        const managerHtml = `
            <style id="kindroidManagerStyles">
                /* Styles for drag and drop and manager elements */
                .draggable-item {
                    cursor: grab;
                }
                .draggable-item:active {
                    cursor: grabbing;
                }
                .draggable-item.is-dragging {
                    opacity: 0.4;
                    border: 1px solid #a0aec0 !important; /* Slightly more visible border */
                }
                .draggable-item.drag-over {
                    border: 2px dashed var(--chakra-colors-blue-500) !important; /* Blue dashed border on hover */
                    background-color: var(--chakra-colors-blue-50) !important; /* Light blue background */
                }
                #kindroidButtonManager h2 {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                }
            </style>
            <div id="kindroidButtonManager" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 25px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 9999;
                width: 650px;
                max-width: 90%;
                max-height: 85vh;
                overflow-y: auto;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                color: #333;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                    <h2 style="margin: 0; font-size: 22px; font-weight: 600; color: #2d3748;">Suggestion Buttons Manager</h2>
                    <button id="closeButtonManager" style="
                        background: none;
                        border: none;
                        font-size: 20px;
                        cursor: pointer;
                        color: #718096;
                        padding: 5px;
                    ">&times;</button>
                </div>

                <div style="margin-bottom: 25px; background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px; color: #4a5568;">Custom Buttons (Drag to reorder)</h3>
                    <div id="customButtonsList" style="margin-bottom: 15px;"></div>
                    <div style="display: flex; gap: 10px;">
                        <button id="addNewButton" style="
                            background: #4299e1;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            transition: background 0.2s;
                        ">Add New Button</button>
                        <button id="resetToDefaults" style="
                            background: #e53e3e;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            transition: background 0.2s;
                        ">Reset to Defaults</button>
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #eee; padding-top: 20px;">
                    <button id="saveButtonConfig" style="
                        background: #48bb78;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: background 0.2s;
                    ">Save Changes</button>
                    <button id="cancelButtonConfig" style="
                        background: #e2e8f0;
                        color: #4a5568;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: background 0.2s;
                    ">Cancel</button>
                </div>
            </div>
            <div id="kindroidButtonManagerOverlay" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 9998;
                backdrop-filter: blur(2px);
            "></div>
        `;

        document.body.insertAdjacentHTML('beforeend', managerHtml);
        renderCustomButtonsList(config);
        scrollToManagerBottom(); // Scroll to bottom when manager opens

        // Event listeners for manager
        document.getElementById('addNewButton').addEventListener('click', () => {
            addNewButtonForm(config);
        });

        document.getElementById('resetToDefaults').addEventListener('click', () => {
            if (confirm('Reset all buttons to defaults? This cannot be undone.')) {
                const newConfig = JSON.parse(JSON.stringify(defaultButtonConfig));
                saveButtonConfig(newConfig);
                renderCustomButtonsList(newConfig);
                setTimeout(checkAndSetupButtons, 500); // Re-run setup after reset
            }
        });

        document.getElementById('saveButtonConfig').addEventListener('click', () => {
            saveButtonConfig(config);
            checkAndSetupButtons(); // Re-run setup after saving config
            closeManager();
        });

        document.getElementById('cancelButtonConfig').addEventListener('click', closeManager);
        document.getElementById('closeButtonManager').addEventListener('click', closeManager);
        document.getElementById('kindroidButtonManagerOverlay').addEventListener('click', closeManager);
    }

    function closeManager() {
        document.getElementById('kindroidButtonManager')?.remove();
        document.getElementById('kindroidButtonManagerOverlay')?.remove();
        document.getElementById('kindroidManagerStyles')?.remove(); // Clean up injected styles
    }

    function scrollToManagerBottom() {
        const manager = document.getElementById('kindroidButtonManager');
        if (manager) {
            manager.scrollTop = manager.scrollHeight;
        }
    }

    function renderCustomButtonsList(config) {
        const container = document.getElementById('customButtonsList');
        container.innerHTML = ''; // Clear existing list

        if (config.buttons.length === 0) {
            container.innerHTML = '<div style="color: #718096; text-align: center; padding: 20px;">No buttons configured</div>';
            return;
        }

        config.buttons.forEach((btn, index) => {
            const btnDiv = document.createElement('div');
            btnDiv.style.cssText = `
                display: flex;
                align-items: center;
                padding: 12px 15px;
                background: white;
                margin-bottom: 8px;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                transition: transform 0.1s, box-shadow 0.1s;
                border: 1px solid #edf2f7;
            `;

            // Add drag and drop attributes
            btnDiv.draggable = true;
            btnDiv.classList.add('draggable-item'); // Class for styling and selection
            btnDiv.dataset.index = index; // Store its current index

            // Drag and Drop Event Listeners
            btnDiv.addEventListener('dragstart', (e) => {
                draggedItemIndex = parseInt(e.target.dataset.index);
                e.target.classList.add('is-dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', draggedItemIndex); // Required for Firefox
            });

            btnDiv.addEventListener('dragover', (e) => {
                e.preventDefault(); // Crucial for allowing a drop
                e.dataTransfer.dropEffect = 'move';
                const targetElement = e.target.closest('.draggable-item');
                if (targetElement && parseInt(targetElement.dataset.index) !== draggedItemIndex) {
                    targetElement.classList.add('drag-over');
                }
            });

            btnDiv.addEventListener('dragleave', (e) => {
                e.target.closest('.draggable-item')?.classList.remove('drag-over');
            });

            btnDiv.addEventListener('drop', (e) => {
                e.preventDefault();
                const targetElement = e.target.closest('.draggable-item');
                if (!targetElement) return;

                targetElement.classList.remove('drag-over');

                const targetIndex = parseInt(targetElement.dataset.index);

                if (draggedItemIndex === targetIndex || draggedItemIndex === -1) {
                    return; // Dropped on itself or no item being dragged
                }

                // Perform array reordering
                const [draggedButton] = config.buttons.splice(draggedItemIndex, 1);
                config.buttons.splice(targetIndex, 0, draggedButton);

                // Re-render the list to update indices and visual order
                renderCustomButtonsList(config);
            });

            btnDiv.addEventListener('dragend', (e) => {
                e.target.classList.remove('is-dragging');
                // Clean up any remaining drag-over classes
                document.querySelectorAll('.draggable-item.drag-over').forEach(el => el.classList.remove('drag-over'));
                draggedItemIndex = -1; // Reset
            });

            btnDiv.innerHTML = `
                <div style="flex-grow: 1; min-width: 0;">
                    <div style="font-weight: 500; color: #2d3748; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${btn.label}</div>
                    <div style="font-size: 13px; color: #718096; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${btn.text || '(no text)'}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 5px; margin-left: 10px;">
                    ${btn.id !== 'clear' && btn.id !== 'last' ? `
                        <button class="editBtn" data-index="${index}" style="
                            background: #ebf8ff;
                            color: #3182ce;
                            border: none;
                            width: 28px;
                            height: 28px;
                            border-radius: 6px;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            transition: background 0.2s;
                        " title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="removeBtn" data-index="${index}" style="
                            background: #fff5f5;
                            color: #e53e3e;
                            border: none;
                            width: 28px;
                            height: 28px;
                            border-radius: 6px;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            transition: background 0.2s;
                        " title="Remove">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            `;

            container.appendChild(btnDiv);

            // Hover effects
            btnDiv.addEventListener('mouseenter', () => {
                btnDiv.style.transform = 'translateY(-1px)';
                btnDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
            });
            btnDiv.addEventListener('mouseleave', () => {
                btnDiv.style.transform = '';
                btnDiv.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
            });
        });

        // Add event listeners for edit and remove buttons
        container.querySelectorAll('.editBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('button').getAttribute('data-index'));
                editButtonForm(config, index);
            });
        });

        container.querySelectorAll('.removeBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('button').getAttribute('data-index'));
                if (confirm(`Remove button "${config.buttons[index].label}"?`)) {
                    config.buttons.splice(index, 1);
                    renderCustomButtonsList(config);
                }
            });
        });
    }

    function addNewButtonForm(config) {
        const formHtml = `
            <div id="newButtonForm" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 25px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10000;
                width: 450px;
                max-width: 90%;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #2d3748;">Add New Button</h3>
                    <button id="closeNewButtonForm" style="
                        background: none;
                        border: none;
                        font-size: 20px;
                        cursor: pointer;
                        color: #718096;
                        padding: 5px;
                    ">&times;</button>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 14px; color: #4a5568; font-weight: 500;">Button Label</label>
                    <input type="text" id="newButtonLabel" style="
                        width: 100%;
                        padding: 10px;
                        border: 1px solid #e2e8f0;
                        border-radius: 6px;
                        font-size: 14px;
                        transition: border 0.2s;
                    " placeholder="e.g. 'More detail'">
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 14px; color: #4a5568; font-weight: 500;">Suggestion Text</label>
                    <textarea id="newButtonText" style="
                        width: 100%;
                        padding: 10px;
                        border: 1px solid #e2e8f0;
                        border-radius: 6px;
                        font-size: 14px;
                        min-height: 100px;
                        resize: vertical;
                        transition: border 0.2s;
                    " placeholder="Text that will be inserted when button is clicked"></textarea>
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 14px; color: #4a5568; font-weight: 500;">Background Color (optional)</label>
                    <input type="text" id="newButtonColor" style="
                        width: 100%;
                        padding: 10px;
                        border: 1px solid #e2e8f0;
                        border-radius: 6px;
                        font-size: 14px;
                        transition: border 0.2s;
                    " placeholder="e.g. #4299e1 or var(--chakra-colors-blue-100)">
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button id="saveNewButton" style="
                        background: #48bb78;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: background 0.2s;
                    ">Save Button</button>
                    <button id="cancelNewButton" style="
                        background: #e2e8f0;
                        color: #4a5568;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: background 0.2s;
                    ">Cancel</button>
                </div>
            </div>
            <div id="newButtonFormOverlay" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 9999;
                backdrop-filter: blur(2px);
            "></div>
        `;

        document.body.insertAdjacentHTML('beforeend', formHtml);

        // Focus on the label input when form opens
        document.getElementById('newButtonLabel').focus();

        document.getElementById('saveNewButton').addEventListener('click', () => {
            const label = document.getElementById('newButtonLabel').value.trim();
            const text = document.getElementById('newButtonText').value.trim();
            const color = document.getElementById('newButtonColor').value.trim();

            if (label && text) {
                config.buttons.push({
                    id: 'custom_' + Date.now(),
                    label,
                    text,
                    bgColor: color
                });
                renderCustomButtonsList(config);
                document.getElementById('newButtonForm').remove();
                document.getElementById('newButtonFormOverlay').remove();
                scrollToManagerBottom(); // Scroll to bottom after adding
            } else {
                alert('Both label and text are required');
            }
        });

        document.getElementById('cancelNewButton').addEventListener('click', () => {
            document.getElementById('newButtonForm').remove();
            document.getElementById('newButtonFormOverlay').remove();
        });

        document.getElementById('closeNewButtonForm').addEventListener('click', () => {
            document.getElementById('newButtonForm').remove();
            document.getElementById('newButtonFormOverlay').remove();
        });

        document.getElementById('newButtonFormOverlay').addEventListener('click', () => {
            document.getElementById('newButtonForm').remove();
            document.getElementById('newButtonFormOverlay').remove();
        });
    }

    function editButtonForm(config, index) {
        const button = config.buttons[index];
        const formHtml = `
            <div id="editButtonForm" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 25px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 10000;
                width: 450px;
                max-width: 90%;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #2d3748;">Edit Button</h3>
                    <button id="closeEditButtonForm" style="
                        background: none;
                        border: none;
                        font-size: 20px;
                        cursor: pointer;
                        color: #718096;
                        padding: 5px;
                    ">&times;</button>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 14px; color: #4a5568; font-weight: 500;">Button Label</label>
                    <input type="text" id="editButtonLabel" value="${button.label}" style="
                        width: 100%;
                        padding: 10px;
                        border: 1px solid #e2e8f0;
                        border-radius: 6px;
                        font-size: 14px;
                        transition: border 0.2s;
                    ">
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 14px; color: #4a5568; font-weight: 500;">Suggestion Text</label>
                    <textarea id="editButtonText" style="
                        width: 100%;
                        padding: 10px;
                        border: 1px solid #e2e8f0;
                        border-radius: 6px;
                        font-size: 14px;
                        min-height: 100px;
                        resize: vertical;
                        transition: border 0.2s;
                    ">${button.text}</textarea>
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="display: block; margin-bottom: 8px; font-size: 14px; color: #4a5568; font-weight: 500;">Background Color (optional)</label>
                    <input type="text" id="editButtonColor" value="${button.bgColor || ''}" style="
                        width: 100%;
                        padding: 10px;
                        border: 1px solid #e2e8f0;
                        border-radius: 6px;
                        font-size: 14px;
                        transition: border 0.2s;
                    " placeholder="e.g. #4299e1 or var(--chakra-colors-blue-100)">
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button id="saveEditedButton" style="
                        background: #48bb78;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: background 0.2s;
                    ">Save Changes</button>
                    <button id="cancelEditButton" style="
                        background: #e2e8f0;
                        color: #4a5568;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: background 0.2s;
                    ">Cancel</button>
                </div>
            </div>
            <div id="editButtonFormOverlay" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 9999;
                backdrop-filter: blur(2px);
            "></div>
        `;

        document.body.insertAdjacentHTML('beforeend', formHtml);

        // Focus on the label input when form opens
        document.getElementById('editButtonLabel').focus();

        document.getElementById('saveEditedButton').addEventListener('click', () => {
            const label = document.getElementById('editButtonLabel').value.trim();
            const text = document.getElementById('editButtonText').value.trim();
            const color = document.getElementById('editButtonColor').value.trim();

            if (label && text) {
                button.label = label;
                button.text = text;
                button.bgColor = color;
                renderCustomButtonsList(config);
                document.getElementById('editButtonForm').remove();
                document.getElementById('editButtonFormOverlay').remove();
                scrollToManagerBottom(); // Scroll to bottom after editing
            } else {
                alert('Both label and text are required');
            }
        });

        document.getElementById('cancelEditButton').addEventListener('click', () => {
            document.getElementById('editButtonForm').remove();
            document.getElementById('editButtonFormOverlay').remove();
        });

        document.getElementById('closeEditButtonForm').addEventListener('click', () => {
            document.getElementById('editButtonForm').remove();
            document.getElementById('editButtonFormOverlay').remove();
        });

        document.getElementById('editButtonFormOverlay').addEventListener('click', () => {
            document.getElementById('editButtonForm').remove();
            document.getElementById('editButtonFormOverlay').remove();
        });
    }

    function simulateTyping(el, value) {
        if (!el) return;
        el.focus();
        const prototype = Object.getPrototypeOf(el);
        const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
        descriptor.set.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: value.slice(-1) || 'a' }));
        el.focus();
    }

    // Comprehensive selector for the suggestion textarea
    function getSuggestionTextarea() {
        return document.querySelector(
            'textarea[aria-label="Suggestion textbox"], ' +
            'textarea[placeholder="suggestion textbox"], ' +
            'textarea[placeholder="Your suggestion text..."], ' +
            'textarea[aria-label="Suggestion contents textbox"], ' + // Keep this, as HTML confirms it exists
            'textarea[placeholder*="(Optional suggestion)"]' // Add a more robust placeholder match
        );
    }

    function clearTextarea() {
        const textarea = getSuggestionTextarea();
        if (textarea) {
            simulateTyping(textarea, '');
        }
    }

    function appendSuggestion(text) {
        const textarea = getSuggestionTextarea();
        if (!textarea) return;

        const currentValue = textarea.value.trim();
        let newValue = '';

        if (currentValue) {
            const cleanedValue = currentValue.replace(/[.,;!?]+$/, '');
            const potentialNewValue = `${cleanedValue}, ${text}`;

            if (potentialNewValue.length <= MAX_CHARS) {
                newValue = potentialNewValue;
            } else {
                const availableSpace = MAX_CHARS - cleanedValue.length - 2;
                if (availableSpace > 10) {
                    newValue = `${cleanedValue}, ${text.substring(0, availableSpace)}`;
                } else {
                    newValue = cleanedValue;
                }
            }
        } else {
            newValue = text.length > MAX_CHARS ? text.substring(0, MAX_CHARS) : text;
        }

        simulateTyping(textarea, newValue);
    }

    function saveCurrentText() {
        const textarea = getSuggestionTextarea();
        if (textarea) {
            const text = textarea.value.trim();
            if (text) {
                GM_setValue(STORAGE_KEY, text);
                updateLastButton();
            }
        }
    }

    function restoreLastText() {
        const textarea = getSuggestionTextarea();
        if (textarea) {
            const lastSavedText = GM_getValue(STORAGE_KEY, '');
            if (lastSavedText) {
                const restored = lastSavedText.length > MAX_CHARS ? lastSavedText.substring(0, MAX_CHARS) : lastSavedText;
                simulateTyping(textarea, restored);
            }
        }
    }

    function updateLastButton() {
        const lastBtn = document.getElementById('lastSuggestionBtn');
        if (lastBtn) {
            const lastSavedText = GM_getValue(STORAGE_KEY, '');
            lastBtn.style.display = 'inline-flex';
            lastBtn.title = lastSavedText ? `${lastSavedText.length}/${MAX_CHARS} chars` : 'No saved text';
        }
    }

    // Helper to find the currently visible button row
    function getActiveButtonRow() {
        const allButtonRows = document.querySelectorAll('div.css-l3vyye');
        for (const row of allButtonRows) {
            // offsetParent is null for elements that are not rendered (hidden by display:none, or not in DOM)
            if (row.offsetParent !== null) {
                return row;
            }
        }
        return null; // No visible button row found
    }

    // Modified to accept the specific buttonRow to work on
    function createCustomButtons(buttonRowToModify) {
        if (!buttonRowToModify) {
            console.warn("Kindroid Suggestion Buttons: createCustomButtons called without a valid buttonRow to modify.");
            return false;
        }

        // Hide the original button row
        buttonRowToModify.style.display = 'none';

        // Remove existing custom buttons IF they are directly associated with THIS buttonRowToModify
        const existingContainer = buttonRowToModify.previousElementSibling;
        if (existingContainer && existingContainer.classList.contains('custom-button-container')) {
            existingContainer.remove();
        }

        // Create a new container for our custom buttons
        const customButtonContainer = document.createElement('div');
        customButtonContainer.className = 'custom-button-container'; // Add a class for easy identification
        customButtonContainer.style.display = 'flex';
        customButtonContainer.style.flexDirection = 'column';
        customButtonContainer.style.gap = '6px';
        customButtonContainer.style.margin = '6px 0';
        customButtonContainer.style.maxWidth = MAX_CONTAINER_WIDTH + 'px';

        // Find the parent container where the original buttons were
        const parentContainer = buttonRowToModify.parentElement;
        if (!parentContainer) return false;

        // Insert our custom container where the original buttons were
        parentContainer.insertBefore(customButtonContainer, buttonRowToModify);

        // Get current config
        const config = loadButtonConfig();

        // Create buttons from config
        let currentLine = document.createElement('div');
        currentLine.style.display = 'flex';
        currentLine.style.flexWrap = 'wrap';
        currentLine.style.gap = '6px';
        currentLine.style.alignItems = 'center';
        customButtonContainer.appendChild(currentLine);

        let currentLineWidth = 0;

        config.buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = 'chakra-button css-yhzben custom-suggestion-btn';
            button.id = btn.id === 'last' ? 'lastSuggestionBtn' : btn.id === 'clear' ? 'clearSuggestionBtn' : '';
            button.textContent = btn.label;

            const tempButton = document.createElement('span'); // Use span for inline measurement
            tempButton.style.visibility = 'hidden';
            tempButton.style.whiteSpace = 'nowrap';
            tempButton.style.font = getComputedStyle(button).font; // Match font for accurate width
            document.body.appendChild(tempButton);
            tempButton.textContent = btn.label; // Set text content after appending to get computed font
            const estimatedButtonWidth = tempButton.offsetWidth + 20; // Estimate with some padding/margin
            document.body.removeChild(tempButton); // Remove the temporary element after measurement

            if (btn.bgColor) {
                button.style.backgroundColor = btn.bgColor;
            }

            if (btn.id === 'clear') {
                button.addEventListener('click', clearTextarea);
            } else if (btn.id === 'last') {
                button.addEventListener('click', restoreLastText);
            } else {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    appendSuggestion(btn.text);
                });
            }

            // Check if we need to start a new line
            if (currentLineWidth + estimatedButtonWidth > MAX_CONTAINER_WIDTH && currentLineWidth !== 0) {
                currentLine = document.createElement('div');
                currentLine.style.display = 'flex';
                currentLine.style.flexWrap = 'wrap';
                currentLine.style.gap = '6px';
                currentLine.style.alignItems = 'center';
                currentLine.style.marginTop = '6px';
                customButtonContainer.appendChild(currentLine);
                currentLineWidth = 0;
            }

            currentLine.appendChild(button);
            currentLineWidth += estimatedButtonWidth + 6; // Add button width and gap
        });

        updateLastButton();
        return true;
    }

    function setupRegenerateListener() {
        const regenerateBtn = document.querySelector('button[aria-label="Regenerate"]');
        if (regenerateBtn && !regenerateBtn.hasAttribute('data-listener-added')) {
            regenerateBtn.setAttribute('data-listener-added', 'true');
            regenerateBtn.addEventListener('click', saveCurrentText);
        }
    }

    // Main setup function, now with retry logic
    function checkAndSetupButtons() {
        const suggestionBox = getSuggestionTextarea(); // Attempt to find suggestion box
        const activeKindroidButtonRow = getActiveButtonRow(); // Attempt to find active button row

        if (!suggestionBox) {
            // If suggestionBox is null, log and retry if max retries not reached
            if (setupRetries < MAX_SETUP_RETRIES) {
                setupRetries++;
                //console.log(`Kindroid Buttons: Suggestion box not found. Retrying in ${RETRY_DELAY_MS}ms... (${setupRetries}/${MAX_SETUP_RETRIES})`);
                setTimeout(checkAndSetupButtons, RETRY_DELAY_MS);
            } else {
                //console.warn("Kindroid Buttons: Max retries reached. Suggestion box still not found. Skipping setup for this cycle.");
                setupRetries = 0; // Reset retries so it can try again later
            }
            return; // Exit if suggestionBox is null (and retries are handled)
        }

        // If suggestionBox is found, reset retries for the next potential challenge
        setupRetries = 0;

        if (activeKindroidButtonRow) {
            const customButtonsExistAndCorrectlyPlaced = activeKindroidButtonRow.previousElementSibling?.classList.contains('custom-button-container');

            if (!customButtonsExistAndCorrectlyPlaced) {
                //console.log("Kindroid Buttons: Setting up custom buttons for a new or uninitialized button row.");
                if (createCustomButtons(activeKindroidButtonRow)) { // Pass the identified active row
                    GM_setValue(BUTTONS_ADDED_KEY, 'true'); // Flag that buttons were added
                }
            } else {
                // console.log("Kindroid Buttons: Custom buttons already set up for this visible row.");
            }
            setupRegenerateListener();
        } else {
            // console.log("Kindroid Buttons: No active Kindroid button row found, skipping button creation.");
        }
    }

    // Register menu command to open manager
    GM_registerMenuCommand('Manage Suggestion Buttons', showButtonManager);

    // Watch for major DOM changes that might indicate modals or new content
    const boxObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                // Trigger checkAndSetupButtons on any addition, it will handle finding the right elements
                checkAndSetupButtons();
                return; // Only need to trigger once per mutation record that adds nodes
            }
        }
    });

    // Also watch for attribute changes, specifically style or class changes that might affect visibility
    const attributeObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                // Trigger checkAndSetupButtons if a style or class attribute changed on a relevant element
                // Or simply for any attribute change on body, as many elements are affected by parent visibility
                checkAndSetupButtons();
                return; // Trigger once per relevant attribute mutation
            }
        }
    });

    // Start observing the body for changes
    boxObserver.observe(document.body, { childList: true, subtree: true });
    attributeObserver.observe(document.body, { attributes: true, subtree: true });


    // Initial check on script load, with a small delay to ensure DOM is ready
    setTimeout(checkAndSetupButtons, 1500); // Increased initial delay slightly for good measure

    // Listen for storage changes (though checkAndSetupButtons should handle most re-init needs)
    GM_addValueChangeListener(BUTTONS_ADDED_KEY, (key, oldValue, newValue) => {
        if (newValue === 'true') {
            checkAndSetupButtons(); // Re-check if flag indicates buttons might need re-adding
        }
    });
})();
