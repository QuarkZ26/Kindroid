// ==UserScript==
// @name Kindroid Quick Reply Buttons with Manager
// @namespace Violentmonkey Scripts
// @version 3.1.2
// @description Adds customizable quick reply buttons under the chat input, keeps them across page changes, and includes a management panel.
// @match *://*.kindroid.ai/*
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_addValueChangeListener
// @grant GM_registerMenuCommand
// @icon https://raw.githubusercontent.com/QuarkZ26/Kindroid/refs/heads/main/kindroid-icon-filled-256.png
// ==/UserScript==

(function () {
  'use strict';

  const QUICK_REPLIES_CONFIG_KEY = 'kindroid_quick_replies_config';
  const QUICK_REPLIES_ADDED_FLAG = 'quick_replies_added_flag';
  const MAX_WRAPPER_WIDTH = 640; // Max width before buttons wrap

  // Variable to store the currently dragged item's original index for D&D
  let draggedItemIndex = -1;

  // Default quick reply configuration
  const defaultQuickRepliesConfig = {
    replies: [
      { id: 'qr_goon', label: 'go on', message: '"Go on"' },
      { id: 'qr_smile', label: 'smile', message: '*I smile*' },
    ]
  };

  // Load or initialize quick reply configuration
  function loadQuickRepliesConfig() {
    const savedConfig = GM_getValue(QUICK_REPLIES_CONFIG_KEY);
    return savedConfig ? JSON.parse(savedConfig) : JSON.parse(JSON.stringify(defaultQuickRepliesConfig));
  }

  // Save quick reply configuration
  function saveQuickRepliesConfig(config) {
    GM_setValue(QUICK_REPLIES_CONFIG_KEY, JSON.stringify(config));
  }

  // Helper to dispatch React-compatible input events
  function dispatchReactInput(el, value) {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    ).set;
    nativeSetter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // --- Quick Reply Buttons Management UI ---

  function showQuickReplyManager() {
    const config = loadQuickRepliesConfig();
    const managerHtml = `
      <style id="quickReplyManagerStyles">
      /* Styles for drag and drop and manager elements */
      .draggable-qr-item {
        cursor: grab;
      }
      .draggable-qr-item:active {
        cursor: grabbing;
      }
      .draggable-qr-item.is-dragging {
        opacity: 0.4;
        border: 1px solid #a0aec0 !important; /* Slightly more visible border */
      }
      .draggable-qr-item.drag-over {
        border: 2px dashed var(--chakra-colors-purple-500) !important;
        /* Purple dashed border on hover */
        background-color: var(--chakra-colors-purple-50) !important; /* Light purple background */
      }
      #quickReplyManager h2 {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      }
      </style>
      <div id="quickReplyManager" style="
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
          <h2 style="margin: 0; font-size: 22px; font-weight: 600; color: #2d3748;">Quick Reply Buttons Manager</h2>
          <button id="closeQuickReplyManager" style="
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #718096;
            padding: 5px;
          ">&times;</button>
        </div>

        <div style="margin-bottom: 25px; background: #f8fafc; padding: 15px; border-radius: 8px;">
          <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px; color: #4a5568;">Quick Replies (Drag to reorder)</h3>
          <div id="quickRepliesList" style="margin-bottom: 15px;"></div>
          <div style="display: flex; gap: 10px;">
            <button id="addNewQuickReply" style="
              background: #9f7aea; /* Purple */
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              transition: background 0.2s;
            ">Add New Reply</button>
            <button id="resetQuickRepliesToDefaults" style="
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
          <button id="saveQuickReplyConfig" style="
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
          <button id="cancelQuickReplyConfig" style="
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

      <div id="quickReplyManagerOverlay" style="
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
    renderQuickRepliesList(config);
    scrollToManagerBottom(); // Scroll to bottom on opening

    // Event listeners for manager
    document.getElementById('addNewQuickReply').addEventListener('click', () => {
      addNewQuickReplyForm(config);
    });

    document.getElementById('resetQuickRepliesToDefaults').addEventListener('click', () => {
      if (confirm('Reset all quick replies to defaults? This cannot be undone.')) {
        const newConfig = JSON.parse(JSON.stringify(defaultQuickRepliesConfig));
        saveQuickRepliesConfig(newConfig);
        renderQuickRepliesList(newConfig);
        updateQuickButtons(); // Recreate the UI buttons
      }
    });

    document.getElementById('saveQuickReplyConfig').addEventListener('click', () => {
      saveQuickRepliesConfig(config);
      updateQuickButtons(); // Recreate the UI buttons
      closeQuickReplyManager();
    });

    document.getElementById('cancelQuickReplyConfig').addEventListener('click', closeQuickReplyManager);
    document.getElementById('closeQuickReplyManager').addEventListener('click', closeQuickReplyManager);
    document.getElementById('quickReplyManagerOverlay').addEventListener('click', closeQuickReplyManager);
  }

  function closeQuickReplyManager() {
    document.getElementById('quickReplyManager')?.remove();
    document.getElementById('quickReplyManagerOverlay')?.remove();
    document.getElementById('quickReplyManagerStyles')?.remove(); // Clean up injected styles
  }

  function scrollToManagerBottom() {
    const manager = document.getElementById('quickReplyManager');
    if (manager) {
      manager.scrollTop = manager.scrollHeight;
    }
  }

  function renderQuickRepliesList(config) {
    const container = document.getElementById('quickRepliesList');
    container.innerHTML = ''; // Clear existing list

    if (config.replies.length === 0) {
      container.innerHTML = '<div style="color: #718096; text-align: center; padding: 20px;">No quick replies configured</div>';
      return;
    }

    config.replies.forEach((reply, index) => {
      const replyDiv = document.createElement('div');
      replyDiv.style.cssText = `
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
      replyDiv.draggable = true;
      replyDiv.classList.add('draggable-qr-item'); // Class for styling and selection
      replyDiv.dataset.index = index; // Store its current index

      // Drag and Drop Event Listeners
      replyDiv.addEventListener('dragstart', (e) => {
        draggedItemIndex = parseInt(e.target.dataset.index);
        e.target.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedItemIndex); // Required for Firefox
      });

      replyDiv.addEventListener('dragover', (e) => {
        e.preventDefault(); // Crucial for allowing a drop
        e.dataTransfer.dropEffect = 'move';
        const targetElement = e.target.closest('.draggable-qr-item');
        if (targetElement && parseInt(targetElement.dataset.index) !== draggedItemIndex) {
          targetElement.classList.add('drag-over');
        }
      });

      replyDiv.addEventListener('dragleave', (e) => {
        e.target.closest('.draggable-qr-item')?.classList.remove('drag-over');
      });

      replyDiv.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetElement = e.target.closest('.draggable-qr-item');
        if (!targetElement) return;

        targetElement.classList.remove('drag-over');
        const targetIndex = parseInt(targetElement.dataset.index);

        if (draggedItemIndex === targetIndex || draggedItemIndex === -1) {
          return; // Dropped on itself or no item being dragged
        }

        // Perform array reordering
        const [draggedReply] = config.replies.splice(draggedItemIndex, 1);
        config.replies.splice(targetIndex, 0, draggedReply);

        // Re-render the list to update indices and visual order
        renderQuickRepliesList(config);
      });

      replyDiv.addEventListener('dragend', (e) => {
        e.target.classList.remove('is-dragging');
        // Clean up any remaining drag-over classes
        document.querySelectorAll('.draggable-qr-item.drag-over').forEach(el => el.classList.remove('drag-over'));
        draggedItemIndex = -1; // Reset
      });

      replyDiv.innerHTML = `
        <div style="flex-grow: 1; min-width: 0;">
          <div style="font-weight: 500; color: #2d3748; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${reply.label}</div>
          <div style="font-size: 13px; color: #718096; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${reply.message || '(no message)'}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 5px; margin-left: 10px;">
          <button class="editQrBtn" data-index="${index}" style="
            background: #f3e8ff; /* Light purple */
            color: #805ad5; /* Darker purple */
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
          <button class="removeQrBtn" data-index="${index}" style="
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
        </div>
      `;

      container.appendChild(replyDiv);

      // Hover effects
      replyDiv.addEventListener('mouseenter', () => {
        replyDiv.style.transform = 'translateY(-1px)';
        replyDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
      });
      replyDiv.addEventListener('mouseleave', () => {
        replyDiv.style.transform = '';
        replyDiv.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
      });
    });

    // Add event listeners for edit and remove buttons
    container.querySelectorAll('.editQrBtn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.closest('button').getAttribute('data-index'));
        editQuickReplyForm(config, index);
      });
    });

    container.querySelectorAll('.removeQrBtn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.closest('button').getAttribute('data-index'));
        if (confirm(`Remove quick reply "${config.replies[index].label}"?`)) {
          config.replies.splice(index, 1);
          renderQuickRepliesList(config);
        }
      });
    });
  }

  function addNewQuickReplyForm(config) {
    const formHtml = `
      <div id="newQuickReplyForm" style="
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
          <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #2d3748;">Add New Quick Reply</h3>
          <button id="closeNewQuickReplyForm" style="
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
          <input type="text" id="newQuickReplyLabel" style="
            width: 100%;
            padding: 10px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 14px;
            transition: border 0.2s;
          " placeholder="e.g. 'go on'">
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-size: 14px; color: #4a5568; font-weight: 500;">Reply Message</label>
          <textarea id="newQuickReplyMessage" style="
            width: 100%;
            padding: 10px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 14px;
            min-height: 100px;
            resize: vertical;
            transition: border 0.2s;
          " placeholder="Text message that will be sent"></textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button id="saveNewQuickReply" style="
            background: #48bb78;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background 0.2s;
          ">Save Reply</button>
          <button id="cancelNewQuickReply" style="
            background: #e2e8f0;
            color: #4a5568;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">Cancel</button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', formHtml);

document.getElementById('saveNewQuickReply').addEventListener('click', () => {
  const label = document.getElementById('newQuickReplyLabel').value.trim();
  const message = document.getElementById('newQuickReplyMessage').value.trim();

  if (!label) {
    alert('Button Label cannot be empty.');
    return;
  }

  const newReply = {
    id: 'qr_' + Date.now(),
    label: label,
    message: message
  };

  config.replies.push(newReply);
  renderQuickRepliesList(config);
  closeForm(); // ✅ close the modal properly
  scrollToManagerBottom(); // ✅ scroll manager view
});


    const closeForm = () => {
      document.getElementById('newQuickReplyForm')?.remove();
    };
    document.getElementById('cancelNewQuickReply').addEventListener('click', closeForm);
    document.getElementById('closeNewQuickReplyForm').addEventListener('click', closeForm);
  }

  function editQuickReplyForm(config, index) {
    const replyToEdit = config.replies[index];
    if (!replyToEdit) return;

    const formHtml = `
      <div id="editQuickReplyForm" style="
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
          <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #2d3748;">Edit Quick Reply</h3>
          <button id="closeEditQuickReplyForm" style="
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
          <input type="text" id="editQuickReplyLabel" value="${replyToEdit.label}" style="
            width: 100%;
            padding: 10px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 14px;
            transition: border 0.2s;
          ">
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-size: 14px; color: #4a5568; font-weight: 500;">Reply Message</label>
          <textarea id="editQuickReplyMessage" style="
            width: 100%;
            padding: 10px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 14px;
            min-height: 100px;
            resize: vertical;
            transition: border 0.2s;
          ">${replyToEdit.message}</textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button id="saveEditedQuickReply" style="
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
          <button id="cancelEditedQuickReply" style="
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
    `;

    document.body.insertAdjacentHTML('beforeend', formHtml);

    document.getElementById('saveEditedQuickReply').addEventListener('click', () => {
      const label = document.getElementById('editQuickReplyLabel').value.trim();
      const message = document.getElementById('editQuickReplyMessage').value.trim();

      if (!label) {
        alert('Button Label cannot be empty.');
        return;
      }

      config.replies[index].label = label;
      config.replies[index].message = message;
      renderQuickRepliesList(config);
      closeEditQuickReplyForm();
    });

    const closeForm = () => {
      document.getElementById('editQuickReplyForm')?.remove();
    };
    document.getElementById('cancelEditedQuickReply').addEventListener('click', closeForm);
    document.getElementById('closeEditQuickReplyForm').addEventListener('click', closeForm);
  }

  // --- Quick Reply Button Generation and Injection ---

  function addQuickButtons() {
    // Check for the presence of a quick reply wrapper, remove if it exists to prevent duplicates
    let existingWrapper = document.getElementById('quickReplyWrapper');
    if (existingWrapper) {
      existingWrapper.remove();
    }

    const targetContainer = document.querySelector('div.chakra-form-control.css-1kxonj9');
    if (!targetContainer) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'quickReplyWrapper';
    wrapper.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
      padding-left: 2px;
      align-items: left;
      max-width: ${MAX_WRAPPER_WIDTH}px;
    `;

    const config = loadQuickRepliesConfig();

    config.replies.forEach((reply) => {
      const btn = document.createElement('button');
      btn.textContent = reply.label;
      btn.style.cssText = `
        color: #a855f7;
        background: none;
        cursor: pointer;
        font-size: 0.85em;
        padding: 4px 10px;
        border: none;
        border-radius: 6px;
        transition: all 0.2s ease;
        white-space: nowrap;
      `;

      btn.addEventListener('mouseover', () => {
        btn.style.textDecoration = 'underline';
      });
      btn.addEventListener('mouseout', () => {
        btn.style.textDecoration = 'none';
      });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const textarea = document.querySelector('textarea[aria-label="Send message textarea"]');

        if (textarea) { // Only check for the textarea's presence initially
          dispatchReactInput(textarea, reply.message); // Write the text into the textarea

          // Now, after the text is entered, look for the send button and click it
          // We use a small timeout to give the UI a moment to update and show the send button
          setTimeout(() => {
            const sendButton = document.querySelector('button[aria-label="Send message"]');
            if (sendButton) {
              sendButton.click();
            } else {
              console.warn("Kindroid Quick Reply: Send button not found after text input. (This is expected if the button doesn't appear for a short while)");
            }
          }, 100); // Increased timeout slightly to 100ms for better reliability
        } else {
          console.warn("Kindroid Quick Reply: Textarea not found.");
        }
      });

      wrapper.appendChild(btn);
    });

    targetContainer.appendChild(wrapper);
  }

  // Function to be called after config changes to re-render UI buttons
  function updateQuickButtons() {
    addQuickButtons(); // This will remove existing and re-add from current config
    GM_setValue(QUICK_REPLIES_ADDED_FLAG, 'true'); // Flag that buttons are set up
  }

  function waitForChatBoxAndInject() {
    const interval = setInterval(() => {
      const container = document.querySelector('div.chakra-form-control.css-1kxonj9');
      // NEW REQUIREMENT: Check for the presence of the voice mode button
      const voiceModeButton = document.querySelector('button[aria-label="enter voice mode"]');

      if (container && voiceModeButton) { // Modified condition: both container and voice mode button must be present
        clearInterval(interval);
        updateQuickButtons(); // Use the update function to ensure latest config
      }
    }, 500);
  }

  // Handle SPA navigation (pushState, popState)
  const originalPushState = history.pushState;
  history.pushState = function () {
    originalPushState.apply(this, arguments);
    setTimeout(waitForChatBoxAndInject, 500);
  };
  window.addEventListener('popstate', () => {
    setTimeout(waitForChatBoxAndInject, 500);
  });

  // Initial injection
  waitForChatBoxAndInject();

  // MutationObserver to reinject if buttons disappear (e.g., due to page changes)
  const liveObserver = new MutationObserver(() => {
    const inputPresent = document.querySelector('div.chakra-form-control.css-1kxonj9');
    const wrapperPresent = document.getElementById('quickReplyWrapper');
    // Ensure the voice mode button is also present before reinjecting
    const voiceModeButtonPresent = document.querySelector('button[aria-label="enter voice mode"]');

    if (inputPresent && !wrapperPresent && voiceModeButtonPresent) { // Modified condition for reinjection
      updateQuickButtons(); // Use the update function
    }
  });

  liveObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Register menu command to open manager
  GM_registerMenuCommand('Manage Quick Replies', showQuickReplyManager);

  // Listen for storage changes in case another tab/window updates the config
  GM_addValueChangeListener(QUICK_REPLIES_CONFIG_KEY, (key, oldValue, newValue) => {
    updateQuickButtons(); // Re-render buttons if config changes
  });

})();
