// ==UserScript==
// @name         Global Emoji Shortcut Replacer (With Space)
// @namespace    Violentmonkey Scripts
// @version      1.2.0
// @description  Replaces emoji shortcuts like :) with 🙂 and adds a real space in all inputs and contenteditable fields
// @match       *://kindroid.ai/*
// @grant       none
// @icon        https://gitlab.com/breatfr/kindroid/-/raw/main/images/icon_kindroid.png
// ==/UserScript==

(function () {
  'use strict';

  const emojiMap = {
    ':)': '🙂',
    ':(': '🙁',
    ':D': '😄',
    ':P': '😛',
    ';)': '😉',
    'XD': '😆',
    ':o': '😮',
    ':O': '😮',
    ':|': '😐',
    ':/': '😕',
    ':\\': '😕',
    ":'(": '😢',
    '<3': '❤️',
    '</3': '💔',
    ':*': '😘',
    ':3': '😊',
    '^_^': '😄',
    '-_-': '😑',
    'O_O': '😳',
    'T_T': '😭',
    ':fire:': '🔥',
    ':100:': '💯',
    ':shrug:': '🤷',
    ':clap:': '👏',
    ':ok:': '👌',
    ':star:': '⭐'
  };

  function tryReplaceShortcut(text) {
    for (const [shortcut, emoji] of Object.entries(emojiMap)) {
      if (text.endsWith(shortcut)) {
        return text.slice(0, -shortcut.length) + emoji + ' ';
      }
    }
    return null;
  }

  function dispatchReactCompatibleInput(el, value) {
    const prototype = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (setter) {
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function handleInput(e) {
    const el = e.target;

    if (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text')) {
      const replaced = tryReplaceShortcut(el.value);
      if (replaced !== null) {
        dispatchReactCompatibleInput(el, replaced);
      }
    } else if (el.isContentEditable) {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) return;

      const text = node.textContent;
      const replaced = tryReplaceShortcut(text.slice(0, range.startOffset));
      if (replaced !== null) {
        node.textContent = replaced + text.slice(range.startOffset);
        const newOffset = replaced.length;
        const newRange = document.createRange();
        newRange.setStart(node, newOffset);
        newRange.setEnd(node, newOffset);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    }
  }

  document.addEventListener('input', handleInput, true);
})();
