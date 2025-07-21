// ==UserScript==
// @name        Clone All Kins Buttons to Right
// @namespace   Violentmonkey Scripts
// @version     1.2.0
// @description Clone avatar cards to the right. Refreshes UI state only on click. Handles Kindroid reactivity delay.
// @match       *://kindroid.ai/*
// @grant       none
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
  let isFullyPaused = false;

  function createClonedAvatar(originalAvatarWrapper) {
    const draggableId = originalAvatarWrapper.dataset.rfdDraggableId;
    const avatarName = originalAvatarWrapper.querySelector('img[alt]')?.alt;

    if (!draggableId || !avatarName) return null;

    const clone = originalAvatarWrapper.cloneNode(true);
    clone.classList.add(CLONED_BUTTON_CLASS);
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));

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

    clone.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const originalWrapper = document.querySelector(`div[data-rfd-draggable-id="${draggableId}"]`);
      if (!originalWrapper) return;

      let clickable = originalWrapper.querySelector('img[alt]');
      if (clickable) clickable = clickable.closest('div[role="button"], button, div');

      if (clickable) {
        clickable.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        }));

        // ✅ Delayed refresh to capture Kindroid UI change
        requestAnimationFrame(() => {
          setTimeout(() => {
            refreshClones();
          }, 50);
        });
      }
    });

    return clone;
  }

  function createGoBackButton() {
    if (goBackButton) return goBackButton;

    const div = document.createElement('div');
    div.innerHTML = `
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
        <img alt="go back" src="/_next/static/media/leftArrowIcon.86d4b73a.svg" style="
          width: 30px;
          height: 30px;
          filter: invert(30%);
        ">
      </div>
    `.trim();

    const button = div.firstChild;
    button.addEventListener('click', () => window.history.back());
    goBackButton = button;
    return goBackButton;
  }

  function displayGoBackButton() {
    clearAllClonedAvatars();
    if (!goBackButton) createGoBackButton();
    if (!document.body.contains(goBackButton)) {
      document.body.appendChild(goBackButton);
    }
  }

  function hideGoBackButton() {
    if (goBackButton && document.body.contains(goBackButton)) {
      document.body.removeChild(goBackButton);
    }
  }

  function clearAllClonedAvatars() {
    clonedAvatarMap.forEach(value => {
      if (value.clone.parentNode) {
        value.clone.parentNode.removeChild(value.clone);
      }
    });
    clonedAvatarMap.clear();
  }

  function updateClonedAvatars(container) {
    if (isFullyPaused) return;

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
    const avatarHeightWithMargin = 60;
    const ordered = Array.from(currentOriginalAvatarsData.entries());

    ordered.forEach(([draggableId, { originalWrapper, avatarName }]) => {
      let entry = clonedAvatarMap.get(draggableId);

      if (!entry) {
        const newClone = createClonedAvatar(originalWrapper);
        if (newClone) {
          document.body.appendChild(newClone);
          clonedAvatarMap.set(draggableId, {
            original: originalWrapper,
            clone: newClone,
            avatarName
          });
          entry = clonedAvatarMap.get(draggableId);
        }
      }

      if (entry && entry.clone) {
        const totalHeight = totalAvatars * avatarHeightWithMargin;
        const startTop = (window.innerHeight / 2) - (totalHeight / 2);
        const top = startTop + (index * avatarHeightWithMargin);
        entry.clone.style.top = `${top}px`;
      }

      index++;
    });
  }

  function refreshClones() {
    if (!currentContainer || isFullyPaused) return;
    clearAllClonedAvatars();
    updateClonedAvatars(currentContainer);
  }

  function setupObserver(container) {
    if (observer) observer.disconnect();
    currentContainer = container;

    observer = new MutationObserver(() => {
      if (!isFullyPaused) updateClonedAvatars(container);
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-rfd-draggable-id']
    });
  }

  function monitorContainerPresence() {
    if (isFullyPaused) return;
    const found = document.querySelector(AVATAR_CONTAINER_SELECTOR);

    if (found && found !== currentContainer) {
      setupObserver(found);
      updateClonedAvatars(found);
    } else if (!found && currentContainer) {
      if (observer) observer.disconnect();
      currentContainer = null;
      displayGoBackButton();
    } else if (!found && !currentContainer && !goBackButton?.parentElement) {
      displayGoBackButton();
    }
  }

  // Only original avatar clicks (not clones) — instant refresh
  document.addEventListener('click', (e) => {
    const clicked = e.target.closest('[data-rfd-draggable-id]');
    if (clicked && !clicked.classList.contains(CLONED_BUTTON_CLASS) && !isFullyPaused) {
      refreshClones();
    }
  });

  // Pause/resume logic via Kindroid panels
  document.addEventListener('click', (e) => {
    const target = e.target.closest('div');
    if (!target) return;

    if (target.classList.contains('css-19zdxg6')) {
      isFullyPaused = true;
      clearAllClonedAvatars();
      hideGoBackButton();
    }

    if (
      target.classList.contains('no-invert') &&
      (target.classList.contains('css-bfxpg') || target.classList.contains('css-1irf9ql'))
    ) {
      if (isFullyPaused) {
        isFullyPaused = false;
        monitorContainerPresence();
        refreshClones();
      }
    }
  });

  window.addEventListener('resize', () => {
    if (isFullyPaused) return;
    setTimeout(() => {
      if (currentContainer) {
        updateClonedAvatars(currentContainer);
      } else if (goBackButton && document.body.contains(goBackButton)) {
        Object.assign(goBackButton.style, {
          top: '50%',
          transform: 'translateY(-50%)'
        });
      }
    }, 100);
  });

  window.addEventListener('beforeunload', () => {
    if (observer) observer.disconnect();
    clearAllClonedAvatars();
    hideGoBackButton();
  });

  setInterval(monitorContainerPresence, 500);
  monitorContainerPresence();
})();
