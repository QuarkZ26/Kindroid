// ==UserScript==
// @name         Kindroid Chat Bubble Width Extender
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Extend Kindroid chat bubble width with live slider UI and no refresh needed.
// @author       You
// @match        https://*.kindroid.*/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @icon          https://gitlab.com/breatfr/kindroid/-/raw/main/images/icon_kindroid.png
// ==/UserScript==

(function () {
    'use strict';

    const defaultWidth = 110;
    const styleId = 'kindroid-chat-width-style';

    function applyStyles(width) {
        const oldStyle = document.getElementById(styleId);
        if (oldStyle) oldStyle.remove();

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .css-fujl5p,
            .css-16auq5p,
            .css-nxakwj {
                max-width: ${width}% !important;
                width: auto !important;
            }
        `;
        document.head.appendChild(style);
    }

    function openSettings() {
        if (document.getElementById('kindroid-settings-panel')) return;

        const savedWidth = GM_getValue('chatWidth', defaultWidth);

        const panel = document.createElement('div');
        panel.id = 'kindroid-settings-panel';
        panel.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #fff;
                border: 1px solid #ccc;
                padding: 15px;
                z-index: 9999;
                font-family: sans-serif;
                width: 250px;
                box-shadow: 0 0 10px rgba(0,0,0,0.2);
            ">
                <label for="widthSlider">Max Width: <span id="widthValue">${savedWidth}</span>%</label><br>
                <input type="range" id="widthSlider" min="40" max="100" value="${savedWidth}" style="width: 100%; margin-top: 8px;"><br>
                <button id="saveBtn" style="margin-top: 10px;">Save</button>
                <button id="closeBtn" style="margin-top: 5px;">Close</button>
            </div>
        `;
        document.body.appendChild(panel);

        const slider = document.getElementById('widthSlider');
        const valueDisplay = document.getElementById('widthValue');

        slider.addEventListener('input', (e) => {
            const newVal = parseInt(e.target.value, 10);
            valueDisplay.textContent = newVal;
            applyStyles(newVal); // live update
        });

        document.getElementById('saveBtn').addEventListener('click', () => {
            const newWidth = parseInt(slider.value, 10);
            GM_setValue('chatWidth', newWidth);
        });

        document.getElementById('closeBtn').addEventListener('click', () => {
            panel.remove();
        });
    }

    // Register menu item
    GM_registerMenuCommand('⚙️ Chat Width Settings', openSettings);

    // Apply initial style
    applyStyles(GM_getValue('chatWidth', defaultWidth));
})();
