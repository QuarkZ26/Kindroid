// ==UserScript==
// @name        Kindroid Clear Chatbox when Using Wizard
// @namespace   Violentmonkey Scripts
// @match       https://kindroid.ai/*
// @grant       none
// @version     5.9 // Incrementing version for enhanced robustness
// @author      Your Name
// @description Places an invisible overlay button over the Kindroid suggestion button to clear the textarea and then trigger the suggestion.
// ==/UserScript==

(function() {
    'use strict';

    let isProgrammaticClick = false;
    let originalSuggestButton = null;
    let customClearAndSuggestButton = null;
    let originalButtonObserver = null; // Store observer to disconnect/reconnect

    // --- Properly clear React-controlled textarea ---
    function executeClearAction(textarea) {
        console.log('Kindroid Clear Script: Attempting to fully clear textarea via native setter override.');

        // Ensure textarea is not disabled before trying to set value
        if (textarea.hasAttribute('disabled')) {
            textarea.removeAttribute('disabled');
            console.log('Kindroid Clear Script: Textarea was disabled, re-enabled.');
        }
        textarea.focus();

        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (!nativeSetter) {
            console.warn('Kindroid Clear Script: Failed to get native textarea setter.');
            return;
        }

        // Use the native setter to bypass React's synthetic state updates
        nativeSetter.call(textarea, ' ');
        textarea.dispatchEvent(new Event('input', { bubbles: true })); // Trigger React to acknowledge change

        nativeSetter.call(textarea, '');
        textarea.dispatchEvent(new Event('input', { bubbles: true })); // Trigger React again for final empty state

        console.log('Kindroid Clear Script: Textarea cleared and React state updated.');
    }

    function ourCustomButtonClickHandler() {
        if (isProgrammaticClick) {
            console.log('Kindroid Clear Script: Programmatic click detected, skipping custom handler.');
            return;
        }

        const textarea = document.querySelector('textarea[aria-label="Send message textarea"]');
        if (!textarea) {
            console.warn('Kindroid Clear Script: Textarea not found during custom button click.');
            return;
        }

        console.log('Kindroid Clear Script: Custom button clicked. Clearing textarea...');
        executeClearAction(textarea);

        // This observer monitors if Kindroid tries to restore text and re-clears.
        // It's a temporary measure during the clearing process.
        let clearObserver = new MutationObserver(() => {
            if (textarea.hasAttribute('disabled')) {
                console.log('Kindroid Clear Script: MO detected textarea disabled. Re-enabling.');
                textarea.removeAttribute('disabled');
            }
            if (textarea.value.trim().length > 0) {
                console.log(`Kindroid Clear Script: MO detected text reappeared: "${textarea.value}". Re-clearing.`);
                executeClearAction(textarea);
            }
        });

        clearObserver.observe(textarea, {
            attributes: true,
            attributeFilter: ['disabled'],
            childList: false,
            characterData: false,
            subtree: false,
            attributeOldValue: true // helpful for debugging
        });

        // After a short delay, disconnect the clearing observer and click the original button
        setTimeout(() => {
            clearObserver.disconnect();
            console.log('Kindroid Clear Script: MO disconnected after clear attempt. Final textarea value:', textarea.value, 'Disabled:', textarea.hasAttribute('disabled'));

            if (originalSuggestButton) {
                console.log('Kindroid Clear Script: Programmatically clicking the original Suggest message button.');
                isProgrammaticClick = true; // Set flag to prevent script from re-executing itself
                originalSuggestButton.click();
                isProgrammaticClick = false; // Reset flag
            } else {
                console.warn('Kindroid Clear Script: Original Suggest message button not found to click after clear.');
            }
        }, 300); // Reduced delay slightly
    }

    // Function to create/update the overlay button
    function updateOverlayPosition() {
        if (!customClearAndSuggestButton || !originalSuggestButton) {
            console.log('Kindroid Clear Script: Cannot update overlay position - buttons not ready.');
            return;
        }

        const rect = originalSuggestButton.getBoundingClientRect();

        // Check if the button is actually visible and has dimensions
        if (rect.width === 0 || rect.height === 0 || rect.top === 0 || rect.left === 0) {
            console.log('Kindroid Clear Script: Original button has zero dimensions or position, delaying overlay update.');
            // This might happen if it's momentarily hidden or not yet rendered.
            // A common issue in SPAs. Let mutation observer or next manageButtons call handle it.
            return;
        }

        customClearAndSuggestButton.style.cssText = `
            position: fixed; /* Use fixed position for robustness against scroll and parent offsets */
            top: ${rect.top}px;
            left: ${rect.left}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            z-index: 99999; /* Even higher z-index to ensure it's on top */
            background-color: rgba(0,0,0,0); /* Fully transparent background */
            border: none;
            cursor: pointer;
            padding: 0;
            margin: 0;
            opacity: 0; /* Make it invisible */
            pointer-events: auto; /* Ensure it receives clicks even if parent has pointer-events: none */
        `;
        customClearAndSuggestButton.style.display = ''; // Ensure it's not hidden by display: none
        console.log('Kindroid Clear Script: Overlay re-positioned/updated.', { top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    }

    // Function to manage the creation/existence of buttons
    function manageButtons() {
        const currentOriginalButton = document.querySelector('button[aria-label="Suggest message"]');

        if (currentOriginalButton && !originalSuggestButton) {
            // First time we find the original button
            originalSuggestButton = currentOriginalButton;
            console.log('Kindroid Clear Script: Original Kindroid button found.');

            // Create the custom overlay button if it doesn't exist
            if (!customClearAndSuggestButton) {
                customClearAndSuggestButton = document.createElement('button');
                customClearAndSuggestButton.id = 'kindroid-clear-suggest-overlay-button'; // Give it an ID for easier debugging/selection
                customClearAndSuggestButton.addEventListener('click', ourCustomButtonClickHandler);
                document.body.appendChild(customClearAndSuggestButton);
                console.log('Kindroid Clear Script: Invisible custom overlay button created and added to body.');
            }

            // Set up an observer to constantly update the overlay position
            // in case the original button moves or is re-rendered
            if (originalButtonObserver) {
                originalButtonObserver.disconnect(); // Disconnect old observer if exists
            }
            originalButtonObserver = new MutationObserver(() => {
                // Throttle updates to prevent performance issues
                requestAnimationFrame(updateOverlayPosition);
            });

            // Observe the original button for attribute changes (style, class affecting layout)
            originalButtonObserver.observe(originalSuggestButton, { attributes: true, attributeFilter: ['style', 'class'], subtree: false });
            // Observe its parent for childList changes (button being removed/re-added)
            if (originalSuggestButton.parentElement) {
                originalButtonObserver.observe(originalSuggestButton.parentElement, { childList: true, subtree: false });
            }

            // Initial positioning
            updateOverlayPosition();

        } else if (currentOriginalButton && originalSuggestButton && currentOriginalButton !== originalSuggestButton) {
            // This case handles if Kindroid completely replaces the button element
            console.warn('Kindroid Clear Script: Original button element changed. Re-initializing.');
            originalSuggestButton = null; // Clear reference
            if (originalButtonObserver) {
                originalButtonObserver.disconnect(); // Disconnect old observer
                originalButtonObserver = null;
            }
            if (customClearAndSuggestButton && customClearAndSuggestButton.parentNode) {
                customClearAndSuggestButton.parentNode.removeChild(customClearAndSuggestButton);
                customClearAndSuggestButton = null;
            }
            // Recursively call to re-create
            manageButtons();
            return;
        } else if (!currentOriginalButton && originalSuggestButton) {
            // Original button disappeared
            console.log('Kindroid Clear Script: Original Kindroid button disappeared. Cleaning up overlay.');
            if (originalButtonObserver) {
                originalButtonObserver.disconnect();
                originalButtonObserver = null;
            }
            if (customClearAndSuggestButton && customClearAndSuggestButton.parentNode) {
                customClearAndSuggestButton.parentNode.removeChild(customClearAndSuggestButton);
                customClearAndSuggestButton = null;
            }
            originalSuggestButton = null;
            return; // Exit as nothing to manage
        }

        // If buttons exist, ensure overlay is positioned correctly (e.g. after a resize or initial load)
        if (originalSuggestButton && customClearAndSuggestButton) {
            updateOverlayPosition();
        }
    }

    // Main observer for the entire document body
    const rootObserver = new MutationObserver((mutations, observer) => {
        // Only run manageButtons if a relevant change might have occurred
        // We're looking for the presence of the original button
        if (!originalSuggestButton || !document.body.contains(originalSuggestButton)) {
            // Check if the original button has appeared or reappeared
            const potentialButton = document.querySelector('button[aria-label="Suggest message"]');
            if (potentialButton) {
                console.log('Kindroid Clear Script: Root observer detected potential button change. Calling manageButtons.');
                manageButtons();
            }
        }
    });

    rootObserver.observe(document.body, { childList: true, subtree: true });
    console.log('Kindroid Clear Script: Root MutationObserver started watching body for initial setup.');

    // Also handle window resize to re-position the overlay
    window.addEventListener('resize', () => {
        // Debounce resize events for performance
        if (window._kindroidClearResizeTimeout) {
            clearTimeout(window._kindroidClearResizeTimeout);
        }
        window._kindroidClearResizeTimeout = setTimeout(() => {
            if (originalSuggestButton && customClearAndSuggestButton) {
                console.log('Kindroid Clear Script: Window resized. Re-positioning overlay.');
                updateOverlayPosition();
            }
        }, 100); // Wait 100ms after resize stops
    });

    // Initial check in case the button is already present on load
    manageButtons();
})();
