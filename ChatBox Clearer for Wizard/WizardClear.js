// ==UserScript==
// @name        Kindroid Clear Chatbox when Using Wizard
// @namespace   Violentmonkey Scripts
// @match       https://kindroid.ai/*
// @grant       none
// @version     6.1.2
// @author      Your Name
// @description Clears textarea before Suggest. Long-press skips clearing and just add onto what's in the box, great if you want to input something and let the wizard add to it.
// @icon        https://raw.githubusercontent.com/QuarkZ26/Kindroid/refs/heads/main/kindroid-icon-filled-256.png
// ==/UserScript==

(function () {
    'use strict';

    let isProgrammaticClick = false;
    let originalSuggestButton = null;
    let customClearAndSuggestButton = null;
    let originalButtonObserver = null;
    let skipClear = false;

    const LONG_PRESS_DURATION = 600;
    let longPressTimer = null;

    function executeClearAction(textarea) {
        if (textarea.hasAttribute('disabled')) textarea.removeAttribute('disabled');
        textarea.focus();

        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (!nativeSetter) return;

        nativeSetter.call(textarea, ' ');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));

        nativeSetter.call(textarea, '');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function ourCustomButtonClickHandler(event) {
        if (isProgrammaticClick) return;

        if (!originalSuggestButton) {
            console.warn('Kindroid Clear Script: No original Suggest button found.');
            return;
        }

        const textarea = document.querySelector('textarea[aria-label="Send message textarea"]');

        if (!skipClear && textarea) {
            executeClearAction(textarea);

            const clearObserver = new MutationObserver(() => {
                if (textarea.hasAttribute('disabled')) textarea.removeAttribute('disabled');
                if (textarea.value.trim().length > 0) executeClearAction(textarea);
            });

            clearObserver.observe(textarea, { attributes: true, attributeFilter: ['disabled'] });

            setTimeout(() => {
                clearObserver.disconnect();
                isProgrammaticClick = true;
                originalSuggestButton.click();
                isProgrammaticClick = false;
            }, 300);
        } else {
            // Bypass clearing on long press
            skipClear = false; // reset
            isProgrammaticClick = true;
            originalSuggestButton.click();
            isProgrammaticClick = false;
        }

        event.preventDefault(); // Stop real click after long press
    }

    function attachLongPressListeners(btn) {
        btn.addEventListener('pointerdown', () => {
            longPressTimer = setTimeout(() => {
                skipClear = true;
                btn.click(); // Manually trigger click after long press
            }, LONG_PRESS_DURATION);
        });

        btn.addEventListener('pointerup', () => {
            clearTimeout(longPressTimer);
        });

        btn.addEventListener('pointerleave', () => {
            clearTimeout(longPressTimer);
        });
    }

    function updateOverlayPosition() {
        if (!customClearAndSuggestButton || !originalSuggestButton) return;

        const rect = originalSuggestButton.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        customClearAndSuggestButton.style.cssText = `
            position: fixed;
            top: ${rect.top}px;
            left: ${rect.left}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            z-index: 99999;
            background-color: rgba(0,0,0,0);
            border: none;
            cursor: pointer;
            padding: 0;
            margin: 0;
            opacity: 0;
            pointer-events: auto;
        `;
        customClearAndSuggestButton.style.display = '';
    }

    function manageButtons() {
        const currentOriginalButton = document.querySelector('button[aria-label="Suggest message"]');

        if (currentOriginalButton && !originalSuggestButton) {
            originalSuggestButton = currentOriginalButton;

            if (!customClearAndSuggestButton) {
                customClearAndSuggestButton = document.createElement('button');
                customClearAndSuggestButton.id = 'kindroid-clear-suggest-overlay-button';
                customClearAndSuggestButton.addEventListener('click', ourCustomButtonClickHandler);
                attachLongPressListeners(customClearAndSuggestButton);
                document.body.appendChild(customClearAndSuggestButton);
            }

            if (originalButtonObserver) originalButtonObserver.disconnect();

            originalButtonObserver = new MutationObserver(() => {
                requestAnimationFrame(updateOverlayPosition);
            });

            originalButtonObserver.observe(originalSuggestButton, { attributes: true, attributeFilter: ['style', 'class'], subtree: false });
            if (originalSuggestButton.parentElement) {
                originalButtonObserver.observe(originalSuggestButton.parentElement, { childList: true, subtree: false });
            }

            updateOverlayPosition();
        } else if (currentOriginalButton && originalSuggestButton && currentOriginalButton !== originalSuggestButton) {
            originalSuggestButton = null;
            if (originalButtonObserver) {
                originalButtonObserver.disconnect();
                originalButtonObserver = null;
            }
            if (customClearAndSuggestButton?.parentNode) {
                customClearAndSuggestButton.parentNode.removeChild(customClearAndSuggestButton);
                customClearAndSuggestButton = null;
            }
            manageButtons();
        } else if (!currentOriginalButton && originalSuggestButton) {
            if (originalButtonObserver) originalButtonObserver.disconnect();
            if (customClearAndSuggestButton?.parentNode) {
                customClearAndSuggestButton.parentNode.removeChild(customClearAndSuggestButton);
                customClearAndSuggestButton = null;
            }
            originalSuggestButton = null;
        }

        if (originalSuggestButton && customClearAndSuggestButton) {
            updateOverlayPosition();
        }
    }

    const rootObserver = new MutationObserver(() => {
        if (!originalSuggestButton || !document.body.contains(originalSuggestButton)) {
            const potentialButton = document.querySelector('button[aria-label="Suggest message"]');
            if (potentialButton) manageButtons();
        }
    });

    rootObserver.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('resize', () => {
        if (window._kindroidClearResizeTimeout) clearTimeout(window._kindroidClearResizeTimeout);
        window._kindroidClearResizeTimeout = setTimeout(() => {
            if (originalSuggestButton && customClearAndSuggestButton) updateOverlayPosition();
        }, 100);
    });

    manageButtons();
})();
