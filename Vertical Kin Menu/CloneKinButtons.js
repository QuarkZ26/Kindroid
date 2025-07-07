// ==UserScript==
// @name        Clone All Kins Buttons to Right
// @namespace   Violentmonkey Scripts
// @version     1.0.4
// @description Clone all avatar buttons and place them in the middle right of the screen, dynamically updating. Displays a "Go Back" button when the avatar container is absent (e.g., on group chat pages).
// @match       *://kindroid.ai/*
// @grant       none
// @icon          https://gitlab.com/breatfr/kindroid/-/raw/main/images/icon_kindroid.png
// ==/UserScript==

(function () {
    'use strict';

    const CLONED_BUTTON_CLASS = 'userscript-cloned-avatar';
    const GO_BACK_BUTTON_CLASS = 'userscript-go-back-button';
    const AVATAR_CONTAINER_SELECTOR = 'div[data-rfd-droppable-id="pinned-droppable"]';
    const ORIGINAL_AVATAR_ITEM_SELECTOR = 'div[data-rfd-draggable-context-id][data-rfd-draggable-id]';

    // Map to store references: original draggable ID -> { originalElement, clonedElement }
    let clonedAvatarMap = new Map();
    let observer = null; // Store the MutationObserver instance
    let currentContainer = null; // Store the currently observed container
    let goBackButton = null; // Store the "Go Back" button element

    /**
     * Finds the original clickable element within an avatar wrapper.
     * @param {HTMLElement} originalAvatarWrapper The div that wraps the avatar.
     * @returns {HTMLElement|null} The clickable element (e.g., div containing img), or null.
     */
    function findClickableOriginal(originalAvatarWrapper) {
        const originalImage = originalAvatarWrapper.querySelector('img[alt]');
        if (!originalImage) {
            return null;
        }
        return originalImage.parentElement;
    }

    /**
     * Creates and styles a clone of the original avatar button.
     * @param {HTMLElement} originalAvatarWrapper The div that wraps the avatar (e.g., div[data-rfd-draggable-id]).
     * @returns {HTMLElement|null} The cloned element, or null if the clickable part isn't found.
     */
    function createClonedAvatar(originalAvatarWrapper) {
        const clickableOriginal = findClickableOriginal(originalAvatarWrapper);
        const draggableId = originalAvatarWrapper.dataset.rfdDraggableId;
        const avatarName = originalAvatarWrapper.querySelector('img[alt]')?.alt;

        if (!clickableOriginal || !draggableId || !avatarName) {
            return null;
        }

        const clone = clickableOriginal.cloneNode(true);
        clone.classList.add(CLONED_BUTTON_CLASS);

        clone.removeAttribute('id');
        clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));

        const clonedImg = clone.querySelector('img');
        if (clonedImg) {
            clonedImg.style.width = '100%';
            clonedImg.style.height = '100%';
            clonedImg.style.objectFit = 'cover';
        }

        clone.addEventListener('click', e => {
            e.preventDefault();
            console.log(`Cloned button clicked for: ${avatarName} (ID: ${draggableId})`);

            // Re-find the original element to ensure it's still in the DOM and we click the correct one
            const currentOriginalWrapper = document.querySelector(`div[data-rfd-draggable-id="${draggableId}"]`);
            const currentClickableOriginal = currentOriginalWrapper ? findClickableOriginal(currentOriginalWrapper) : null;

            if (currentClickableOriginal) {
                console.log(`Original element found for ${avatarName}. Dispatching click event.`);
                currentClickableOriginal.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                }));
            } else {
                console.warn(`Original element for ${avatarName} (ID: ${draggableId}) not found. This button may not function correctly on this page.`);
                // If you later find a direct action, insert it here:
                // For example: history.pushState({}, '', `/chat/${draggableId}`);
            }
        });

        Object.assign(clone.style, {
            position: 'fixed',
            right: '10px',
            width: '50px',
            height: '50px',
            cursor: 'pointer',
            zIndex: '9999',
            borderRadius: '50%',
            overflow: 'hidden',
            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
            transition: 'top 0.3s ease'
        });

        return clone;
    }

    /**
     * Creates and styles the "Go Back" button.
     * @returns {HTMLElement} The "Go Back" button element.
     */
    function createGoBackButton() {
        if (goBackButton) {
            return goBackButton; // Return existing button if already created
        }

        const buttonHTML = `
            <div role="button" class="${GO_BACK_BUTTON_CLASS}" style="
                position: fixed;
                right: 10px;
                top: 50%; /* Centered initially */
                transform: translateY(-50%); /* Adjust for height */
                width: 50px;
                height: 50px;
                cursor: pointer;
                z-index: 9999;
                border-radius: 50%; /* Make it round like avatars */
                overflow: hidden;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                background-color: #f0f0f0; /* Light background for visibility */
                display: flex; /* For centering the icon */
                justify-content: center;
                align-items: center;
            ">
                <img alt="go back" src="/_next/static/media/leftArrowIcon.86d4b73a.svg" class="chakra-image css-1995aov" style="
                    width: 30px; /* Adjust size of the arrow icon */
                    height: 30px;
                    filter: invert(30%); /* Make arrow darker if needed, adjust percentage */
                ">
            </div>
        `;
        const div = document.createElement('div');
        div.innerHTML = buttonHTML.trim();
        const button = div.firstChild;

        button.addEventListener('click', () => {
            console.log("Go Back button clicked.");
            // This attempts to go back in browser history.
            // For SPA, it often triggers their router's back action.
            window.history.back();
            // Alternatively, if you know the exact URL to go back to (e.g., the main chat page):
            // window.location.href = 'https://your.website.com/chat'; // Replace with actual URL
        });

        goBackButton = button;
        return goBackButton;
    }

    /**
     * Displays the "Go Back" button and hides avatar clones.
     */
    function displayGoBackButton() {
        clearAllClonedAvatars(); // Remove any existing avatar clones
        if (!goBackButton) {
            createGoBackButton();
        }
        if (!document.body.contains(goBackButton)) {
            document.body.appendChild(goBackButton);
            console.log("Go Back button displayed.");
        }
    }

    /**
     * Hides the "Go Back" button.
     */
    function hideGoBackButton() {
        if (goBackButton && document.body.contains(goBackButton)) {
            document.body.removeChild(goBackButton);
            console.log("Go Back button hidden.");
        }
    }

    /**
     * Clears all existing cloned avatars from the DOM and the map.
     */
    function clearAllClonedAvatars() {
        if (clonedAvatarMap.size > 0) {
            console.log("Clearing all cloned avatars...");
            clonedAvatarMap.forEach(value => {
                if (value.clone.parentNode) {
                    value.clone.parentNode.removeChild(value.clone);
                }
            });
            clonedAvatarMap.clear();
        }
    }

    /**
     * Updates the position and existence of cloned avatars based on the original container.
     * @param {HTMLElement} container The main parent container of all original avatars.
     */
    function updateClonedAvatars(container) {
        hideGoBackButton(); // Ensure go back button is hidden when avatars are present
        // console.log("Updating cloned avatars.");
        const currentOriginalAvatarsData = new Map();

        container.querySelectorAll(ORIGINAL_AVATAR_ITEM_SELECTOR).forEach(originalWrapper => {
            const draggableId = originalWrapper.dataset.rfdDraggableId;
            const avatarName = originalWrapper.querySelector('img[alt]')?.alt;

            if (draggableId && avatarName) {
                currentOriginalAvatarsData.set(draggableId, { originalWrapper, avatarName });
            }
        });

        clonedAvatarMap.forEach((value, draggableId) => {
            if (!currentOriginalAvatarsData.has(draggableId)) {
                if (value.clone.parentNode) {
                    value.clone.parentNode.removeChild(value.clone);
                }
                clonedAvatarMap.delete(draggableId);
            }
        });

        let index = 0;
        const totalAvatars = currentOriginalAvatarsData.size;
        const avatarHeightWithMargin = 50 + 10;

        const orderedAvatars = Array.from(currentOriginalAvatarsData.entries());

        orderedAvatars.forEach(([draggableId, { originalWrapper, avatarName }]) => {
            let cloneEntry = clonedAvatarMap.get(draggableId);

            if (!cloneEntry) {
                const newClone = createClonedAvatar(originalWrapper);
                if (newClone) {
                    document.body.appendChild(newClone);
                    clonedAvatarMap.set(draggableId, { original: originalWrapper, clone: newClone, avatarName: avatarName });
                    cloneEntry = clonedAvatarMap.get(draggableId);
                } else {
                    console.error(`Failed to create clone for ${avatarName} (ID: ${draggableId})`);
                    return;
                }
            }

            if (cloneEntry && cloneEntry.clone) {
                const totalStackHeight = totalAvatars * avatarHeightWithMargin;
                const startingTop = (window.innerHeight / 2) - (totalStackHeight / 2);
                const currentTop = startingTop + (index * avatarHeightWithMargin);

                Object.assign(cloneEntry.clone.style, {
                    top: `${currentTop}px`
                });
            }
            index++;
        });

        // console.log(`Finished updating. Total cloned avatars: ${clonedAvatarMap.size}`);
    }

    /**
     * Initializes or re-initializes the MutationObserver on the given container.
     * @param {HTMLElement} container The container to observe.
     */
    function setupObserver(container) {
        if (observer) {
            observer.disconnect();
            console.log("Disconnected previous MutationObserver.");
        }

        currentContainer = container;
        console.log("Setting up MutationObserver on:", container);

        observer = new MutationObserver(mutations => {
            let needsUpdate = false;
            for (let mutation of mutations) {
                if (mutation.type === 'childList' && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
                    needsUpdate = true;
                    break;
                }
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-rfd-draggable-id') {
                     needsUpdate = true;
                     break;
                }
            }
            if (needsUpdate) {
                // console.log("Mutation detected, re-scanning avatars.");
                updateClonedAvatars(container);
            }
        });

        observer.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-rfd-draggable-id']
        });
    }

    // --- Main Logic ---

    // Use a periodic check (e.g., setInterval) to look for the container
    const checkInterval = 500; // Check every 500ms
    let checkTimer = null;

    function monitorContainerPresence() {
        const foundContainer = document.querySelector(AVATAR_CONTAINER_SELECTOR);

        if (foundContainer && foundContainer !== currentContainer) {
            // Container found and it's a new one or wasn't observed before
            console.log("Avatar container appeared or changed. Initializing/Re-initializing.");
            setupObserver(foundContainer); // Setup observer first
            updateClonedAvatars(foundContainer); // Then update avatars
        } else if (!foundContainer && currentContainer) {
            // Container disappeared
            console.log("Avatar container disappeared. Disconnecting observer and displaying Go Back button.");
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            currentContainer = null;
            displayGoBackButton(); // Display the Go Back button
        } else if (!foundContainer && !currentContainer && !goBackButton?.parentElement) {
             // If container is gone, and no goBackButton is currently visible,
             // ensure the goBackButton is displayed (e.g., on initial load to a group page)
             displayGoBackButton();
        }
        // If foundContainer === currentContainer, it's still there and being observed.
        // If !foundContainer && !currentContainer, and goBackButton is already there, nothing to do.
    }

    // Start the periodic check
    checkTimer = setInterval(monitorContainerPresence, checkInterval);

    // Also add a resize listener
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (currentContainer) {
                console.log("Window resized, re-positioning avatars.");
                updateClonedAvatars(currentContainer);
            } else if (goBackButton && document.body.contains(goBackButton)) {
                // If go back button is present, re-center it on resize
                Object.assign(goBackButton.style, {
                    top: '50%',
                    transform: 'translateY(-50%)'
                });
                console.log("Window resized, re-positioning Go Back button.");
            }
        }, 100);
    });

    // Optional: Clean up on page unload
    window.addEventListener('beforeunload', () => {
        if (checkTimer) {
            clearInterval(checkTimer);
        }
        if (observer) {
            observer.disconnect();
        }
        clearAllClonedAvatars();
        hideGoBackButton();
    });

    // Initial check on script load
    monitorContainerPresence();

})();
