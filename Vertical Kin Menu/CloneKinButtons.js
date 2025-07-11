// ==UserScript==
// @name        Clone All Kins Buttons to Right (Full Container Version)
// @namespace   Violentmonkey Scripts
// @version     1.1.0
// @description Clone full avatar cards and display them stacked on the right side of the screen. Fully functional, including labels and icons. Shows a "Go Back" button if avatars are not present.
// @match       *://kindroid.ai/*
// @grant       none
// @icon        https://gitlab.com/breatfr/kindroid/-/raw/main/images/icon_kindroid.png
// ==/UserScript==

(function () {
    'use strict';

    const CLONED_BUTTON_CLASS = 'userscript-cloned-avatar';
    const GO_BACK_BUTTON_CLASS = 'userscript-go-back-button';
    const AVATAR_CONTAINER_SELECTOR = 'div[data-rfd-droppable-id="pinned-droppable"]';
    const ORIGINAL_AVATAR_ITEM_SELECTOR = 'div[data-rfd-draggable-id]';

    let clonedAvatarMap = new Map();
    let observer = null;
    let currentContainer = null;
    let goBackButton = null;

    function createClonedAvatar(originalAvatarWrapper) {
    const draggableId = originalAvatarWrapper.dataset.rfdDraggableId;
    const avatarName = originalAvatarWrapper.querySelector('img[alt]')?.alt;

    if (!draggableId || !avatarName) {
        return null;
    }

    // Clone the full visual wrapper
    const clone = originalAvatarWrapper.cloneNode(true);
    clone.classList.add(CLONED_BUTTON_CLASS);

    // Clean IDs
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));

    // Style for fixed display
    Object.assign(clone.style, {
    position: 'fixed',
    right: '10px',
    width: '70px',
    cursor: 'pointer',
    zIndex: '9999',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
    transition: 'top 0.3s ease',
    background: 'transparent',
    transform: 'scale(0.75)',            
    transformOrigin: 'top right'
});


    // Click proxy to actual clickable child
    clone.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const originalWrapper = document.querySelector(`div[data-rfd-draggable-id="${draggableId}"]`);
        if (!originalWrapper) {
            console.warn(`Original avatar wrapper not found for ID: ${draggableId}`);
            return;
        }

        // Try finding the clickable part inside the original
        let clickable = originalWrapper.querySelector('img[alt]');
        if (clickable) {
            clickable = clickable.closest('div[role="button"], button, div');
        }

        if (clickable) {
            console.log(`Forwarding click to internal clickable for: ${avatarName}`);
            clickable.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            }));
        } else {
            console.warn(`No clickable child found for avatar: ${avatarName}`);
        }
    });

    return clone;
}


    function createGoBackButton() {
        if (goBackButton) return goBackButton;

        const buttonHTML = `
            <div role="button" class="${GO_BACK_BUTTON_CLASS}" style="
                position: fixed;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                width: 50px;
                height: 50px;
                cursor: pointer;
                z-index: 9999;
                border-radius: 50%;
                overflow: hidden;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                background-color: #f0f0f0;
                display: flex;
                justify-content: center;
                align-items: center;
            ">
                <img alt="go back" src="/_next/static/media/leftArrowIcon.86d4b73a.svg" class="chakra-image css-1995aov" style="
                    width: 30px;
                    height: 30px;
                    filter: invert(30%);
                ">
            </div>
        `;
        const div = document.createElement('div');
        div.innerHTML = buttonHTML.trim();
        const button = div.firstChild;

        button.addEventListener('click', () => {
            console.log("Go Back button clicked.");
            window.history.back();
        });

        goBackButton = button;
        return goBackButton;
    }

    function displayGoBackButton() {
        clearAllClonedAvatars();
        if (!goBackButton) createGoBackButton();
        if (!document.body.contains(goBackButton)) {
            document.body.appendChild(goBackButton);
            console.log("Go Back button displayed.");
        }
    }

    function hideGoBackButton() {
        if (goBackButton && document.body.contains(goBackButton)) {
            document.body.removeChild(goBackButton);
            console.log("Go Back button hidden.");
        }
    }

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

    function updateClonedAvatars(container) {
        hideGoBackButton();
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
        const avatarHeightWithMargin = 60; // Adjusted for full card height

        const orderedAvatars = Array.from(currentOriginalAvatarsData.entries());

        orderedAvatars.forEach(([draggableId, { originalWrapper, avatarName }]) => {
            let cloneEntry = clonedAvatarMap.get(draggableId);

            if (!cloneEntry) {
                const newClone = createClonedAvatar(originalWrapper);
                if (newClone) {
                    document.body.appendChild(newClone);
                    clonedAvatarMap.set(draggableId, { original: originalWrapper, clone: newClone, avatarName });
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
    }

    /**
 * Force-refresh all clones from scratch every X seconds
 */
    function refreshClones() {
    if (!currentContainer) return;

    console.log("Refreshing cloned avatars...");
    clearAllClonedAvatars();
    updateClonedAvatars(currentContainer);
}


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

    const checkInterval = 500;
    let checkTimer = null;

    function monitorContainerPresence() {
        const foundContainer = document.querySelector(AVATAR_CONTAINER_SELECTOR);

        if (foundContainer && foundContainer !== currentContainer) {
            console.log("Avatar container appeared or changed. Initializing/Re-initializing.");
            setupObserver(foundContainer);
            updateClonedAvatars(foundContainer);
        } else if (!foundContainer && currentContainer) {
            console.log("Avatar container disappeared. Disconnecting observer and displaying Go Back button.");
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            currentContainer = null;
            displayGoBackButton();
        } else if (!foundContainer && !currentContainer && !goBackButton?.parentElement) {
            displayGoBackButton();
        }
    }

    checkTimer = setInterval(monitorContainerPresence, checkInterval);

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (currentContainer) {
                console.log("Window resized, re-positioning avatars.");
                updateClonedAvatars(currentContainer);
            } else if (goBackButton && document.body.contains(goBackButton)) {
                Object.assign(goBackButton.style, {
                    top: '50%',
                    transform: 'translateY(-50%)'
                });
                console.log("Window resized, re-positioning Go Back button.");
            }
        }, 100);
    });

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
    // Start the periodic refresh every 5 seconds
setInterval(refreshClones, 5000);

    monitorContainerPresence();

})();
