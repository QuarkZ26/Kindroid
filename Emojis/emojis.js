// ==UserScript==
// @name         Universal Emoji Replacer (Extended)
// @match        *://kindroid.ai/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const emojiMap = {
        ':)': '🙂',
        ':-)': '🙂',
        ':(': '🙁',
        ':-(': '🙁',
        ':D': '😄',
        ':-D': '😄',
        ':P': '😛',
        ':-P': '😛',
        ':p': '😛',
        ':-p': '😛',
        ';)': '😉',
        ';-)': '😉',
        'XD': '😆',
        'xD': '😆',
        ':o': '😮',
        ':-o': '😮',
        ':O': '😮',
        ':-O': '😮',
        ':|': '😐',
        ':-|': '😐',
        ':/': '😕',
        ':-/': '😕',
        ':\\': '😕',
        ':-\\': '😕',
        ":'(": '😢',
        '<3': '❤️',
        '</3': '💔',
        ':*': '😘',
        ':-*': '😘',
        ':3': '😊',
        '^_^': '😄',
        '-_-': '😑',
        'O_O': '😳',
        'T_T': '😭',
        ':poop:': '💩',
        ':thumbsup:': '👍',
        ':thumbsdown:': '👎',
        ':shrug:': '🤷',
        ':clap:': '👏',
        ':ok:': '👌',
        ':100:': '💯',
    };

    function replaceEmojisInText(text) {
        for (const [key, emoji] of Object.entries(emojiMap)) {
            text = text.replaceAll(key, emoji);
        }
        return text;
    }

    function handleInput(e) {
        const el = e.target;

        if (el.isContentEditable) {
            const selection = window.getSelection();
            if (!selection || !selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            const node = range.startContainer;

            if (node.nodeType === Node.TEXT_NODE) {
                const newText = replaceEmojisInText(node.textContent);
                if (newText !== node.textContent) {
                    node.textContent = newText;

                    // Move cursor to end
                    range.setStart(node, newText.length);
                    range.setEnd(node, newText.length);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        } else if (
            el.tagName === 'TEXTAREA' ||
            (el.tagName === 'INPUT' && el.type === 'text')
        ) {
            const oldValue = el.value;
            const newValue = replaceEmojisInText(oldValue);
            if (newValue !== oldValue) {
                const pos = el.selectionStart;
                el.value = newValue;
                el.setSelectionRange(pos, pos);
            }
        }
    }

    document.addEventListener('input', handleInput, true);
})();
