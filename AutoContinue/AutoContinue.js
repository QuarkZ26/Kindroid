// ==UserScript==
// @name          Kindroid Auto Click Continue
// @namespace     Violentmonkey Scripts
// @version       3.40
// @description   Adds a persistent button to Kindroid to auto-click "Continue" messages and "Send" if AI has not responded within X seconds, with a configurable counter and manual reset. Resets only on user explicit action (Enter, Send, Manual Continue Click, or Toggling Button). Long press on the icon enables continuous auto-clicking.
// @match         https://kindroid.ai/*
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_addStyle
// @grant         GM_registerMenuCommand
// @icon          https://gitlab.com/breatfr/kindroid/-/raw/main/images/icon_kindroid.png
// ==/UserScript==

(function() {
    'use strict';


    const ERROR_TOAST_SELECTOR = '#chakra-toast-manager-top .chakra-alert[data-status="error"]';
    let isErrorActive = false;

    const monitorErrorToasts = () => {
        const toastRoot = document.querySelector('#chakra-toast-manager-top');
        if (!toastRoot) {
            console.warn("Auto-Click: Toast container not found.");
            return;
        }

        const observer = new MutationObserver(() => {
            const errorToast = toastRoot.querySelector('.chakra-alert[data-status="error"]');
            if (errorToast) {
                console.warn("Auto-Click: Error toast detected. Pausing routine.");
                isErrorActive = true;
                tearDownInternalListeners();
                updateStatusDisplay();
                setButtonColor();
            } else if (isErrorActive) {
                console.log("Auto-Click: Error toast dismissed. Waiting for manual resume.");
            }
        });

        observer.observe(toastRoot, { childList: true, subtree: true });
    };



    // --- Configuration ---
    const DEFAULT_CONFIG = {
        enabled: true,         // Script enabled by default
        interval: 1000,        // How often to check for the button (milliseconds)
        maxClicks: 1,          // Default max auto-clicks before pausing
        autoSendEnabled: true, // Auto-send message if AI doesn't respond
        autoSendDelay: 10,     // Delay before auto-sending (seconds) if no AI response
        continuousModeEnabled: false, // New: Is continuous mode active?
        continuousMaxClicks: 100 // New: Max clicks for continuous mode (effectively "forever")
    };

    let config = {};
    let clickCount = 0;
    let observer = null;

    let recentClickTimestamps = [];
    const RAPID_CLICK_THRESHOLD_MS = 2000;
    const RAPID_CLICK_COUNT = 3;

    let buttonCheckInterval = null;
    let manualClickDebounceTimeout = null;
    let spinnerCheckInterval = null;
    let aiResponseTimeout = null;
    let isCoolingDown = false; // Flag to manage cooldown after a script action or user reset

    // --- Long Press Variables ---
    let longPressTimeout = null;
    const LONG_PRESS_DURATION = 500; // milliseconds
    let isLongPress = false;

    // --- DOM Selectors (made more robust) ---
    const BUTTON_SELECTOR = 'button[aria-label="Continue cut-off message"]';
    const TEXTAREA_SELECTOR = 'textarea[aria-label="Send message textarea"]';
    const SEND_BUTTON_SELECTOR = 'button[aria-label="Send message"]';
    const SPINNER_SELECTOR = 'button[aria-label="Send message"] div.chakra-spinner';
    const CSS_SPINNER_CLASS = 'chakra-spinner';
    const REGENERATE_BUTTON_SELECTOR = 'button[aria-label="Regenerate"]';


    // --- Script UI Elements ---
    let configButton = null;
    let statusPanel = null;
    let statusRoutineElement = null;
    let statusClicksElement = null;

    // --- Event Listener References (for proper cleanup of internal observers, not button listeners) ---
    let textareaInputListener = null; // Will no longer be used for reset, but kept for clarity
    let textareaEnterKeyListener = null;
    let sendButtonClickListener = null;
    let textareaDisabledObserver = null;
    let continueButtonObserver = null;
    // configButtonMouseOverListener, configButtonMouseOutListener, configButtonMouseDownListener, configButtonMouseUpListener
    // are attached directly in createConfigButton and are permanent.

    // --- Utility Functions ---

    // Load configuration from storage or use defaults
    const loadConfig = async () => {
        const storedConfig = await GM_getValue('autoClickConfig', DEFAULT_CONFIG);
        // Merge with defaults to ensure new properties are included
        config = { ...DEFAULT_CONFIG, ...storedConfig };
        // Ensure maxClicks is consistent with continuousMode state on load
        if (config.continuousModeEnabled) {
            config.maxClicks = config.continuousMaxClicks;
        } else {
            config.maxClicks = DEFAULT_CONFIG.maxClicks;
        }
        console.log("Auto-Click Debug: Configuration loaded:", config);
    };

      // Add Violentmonkey menu command to set maxClicks
    GM_registerMenuCommand('Set max auto-clicks', async () => {
        const input = prompt(`Current maxClicks: ${config.maxClicks}\nEnter new value (0 for continuous mode):`, config.maxClicks);
        const parsed = parseInt(input);
        if (!isNaN(parsed) && parsed >= 0) {
            if (parsed === 0) {
                config.continuousModeEnabled = true;
                config.maxClicks = config.continuousMaxClicks;
            } else {
                config.continuousModeEnabled = false;
                config.maxClicks = parsed;
            }
            await saveConfig();
            alert(`maxClicks is now set to ${config.maxClicks}${config.continuousModeEnabled ? ' (continuous)' : ''}`);
            performResetAndResumeAutoClick('maxClicks changed via menu');
        } else {
            alert('Invalid number.');
        }
    });

    // Save configuration to storage
    const saveConfig = async () => {
        await GM_setValue('autoClickConfig', config);
        console.log("Auto-Click Debug: Configuration saved:", config);
    };

    // Update the color of the script's toggle button


    const setButtonColor = () => {
        if (!configButton) return;
        let color;
        if (isErrorActive) {
            color = 'rgba(255, 0, 0, 0.9)'; // Bright red for error state
        } else if (!config.enabled) {
            color = 'rgba(0, 0, 0, 0.8)'; // Black for Disabled
        } else if (config.continuousModeEnabled) {
            color = 'rgba(0, 0, 255, 0.6)'; // Blue for Continuous Mode
        } else if (clickCount >= config.maxClicks) {
            color = 'rgba(255, 215, 0, 0.6)'; // Yellow for Paused (Limit Reached)
        } else {
            color = 'rgba(0, 128, 0, 0.6)'; // Green for Active
        }
        configButton.style.backgroundColor = color;
        console.log(`Auto-Click Debug: Set button background-color to ${color} (effective routine state: ${getStatusRoutineText()}).`);
    };



    // Get routine status text for display
    const getStatusRoutineText = () => {
        if (!config.enabled) return '🔴 Disabled';
        if (config.continuousModeEnabled) return '🔵 Continuous';
        if (clickCount >= config.maxClicks) return '🟡 Paused (Limit Reached)';
        return '🟢 Active';
    };

    // Update the status panel display
    const updateStatusDisplay = () => {
        if (!statusRoutineElement || !statusClicksElement) return;
        statusRoutineElement.textContent = `Routine: ${getStatusRoutineText()}`;
        // Only show clicks/maxClicks if not in continuous mode
        if (config.continuousModeEnabled) {
            statusClicksElement.textContent = `Clicks: ∞`;
        } else {
            statusClicksElement.textContent = `Clicks: ${clickCount}/${config.maxClicks}`;
        }
        console.log(`Auto-Click Debug: Status panel updated - ${statusRoutineElement.textContent} | ${statusClicksElement.textContent}`);
        setButtonColor(); // Ensure button color matches status
    };

    // --- Core Auto-Click Logic ---

    // Reset auto-click counter and resume if enabled
    const performResetAndResumeAutoClick = (reason = "Manual reset") => {
        if (isErrorActive) {
            console.warn("Auto-Click: Cannot resume routine due to active error toast.");
            return;
        }
        if (manualClickDebounceTimeout) {
            clearTimeout(manualClickDebounceTimeout);
            manualClickDebounceTimeout = null;
        }
        console.log(`Auto-Click: Counter reset due to: ${reason}`);
        clickCount = 0; // Reset the counter
        updateStatusDisplay();
        setButtonColor(); // Ensure button is green if enabled

        // Introduce a cooldown after any reset to let the UI settle
        isCoolingDown = true;
        console.log("Auto-Click Debug: Cooldown initiated after reset (1000ms).");
        // Tear down immediately, re-arm after cooldown completes IF enabled
        tearDownInternalListeners(); // Always tear down to ensure a clean state

        setTimeout(() => {
            isCoolingDown = false;
            console.log("Auto-Click Debug: Cooldown ended after reset.");
            if (config.enabled) {
                // Re-arm all observers and intervals only AFTER the cooldown if the script is enabled
                setupObserver();
            } else {
                // If script is now disabled, ensure nothing is trying to run
                console.log("Auto-Click: Script remains disabled after reset, no observers re-armed after cooldown.");
            }
        }, 1000); // 1-second cooldown (adjust as needed)
    };

    // Pause the auto-click routine and await user reset
    const pauseAndAwaitUserReset = () => {
        console.log("Auto-Click: Max auto-clicks reached. Paused, awaiting user interaction to reset.");
        if (observer) {
            observer.disconnect();
            observer = null;
            console.log("Auto-Click Debug: Main MutationObserver disconnected due to pause.");
        }
        if (buttonCheckInterval) {
            clearInterval(buttonCheckInterval);
            buttonCheckInterval = null;
            console.log("Auto-Click Debug: Button check interval cleared due to pause.");
        }
        clearAiResponseTimeout();
        updateStatusDisplay();
        setButtonColor(); // Ensure button color is yellow (paused)
    };

    // Clear the auto-send AI response timeout
    const clearAiResponseTimeout = () => {
        if (aiResponseTimeout) {
            clearTimeout(aiResponseTimeout);
            aiResponseTimeout = null;
            console.log("Auto-Click Debug: AI response timeout cleared.");
        }
    };

    // Set auto-send AI response timeout
    const setAiResponseTimeout = () => {
        clearAiResponseTimeout(); // Clear any existing timeout first
        // Ensure not in cooldown and script is enabled and not paused by click limit
        if (config.enabled && config.autoSendEnabled && clickCount < config.maxClicks && !isCoolingDown) {
            aiResponseTimeout = setTimeout(() => {
                const textarea = document.querySelector(TEXTAREA_SELECTOR);
                const sendButton = document.querySelector(SEND_BUTTON_SELECTOR);
                const spinner = document.querySelector(SPINNER_SELECTOR);

                if (textarea && sendButton && textarea.value.trim().length > 0 && !spinner) {
                    console.log("Auto-Click: AI response timeout. Attempting to auto-send message.");
                    // Set cooldown for this auto-send action
                    isCoolingDown = true;
                    console.log("Auto-Click Debug: Cooldown initiated after auto-send (500ms).");
                    setTimeout(() => {
                        sendButton.click();
                        clickCount++;
                        updateStatusDisplay();
                        setButtonColor();
                        isCoolingDown = false; // End cooldown after click attempt
                        console.log("Auto-Click Debug: Cooldown ended after auto-send.");
                        // After sending, wait for spinner to disappear before re-arming
                        waitForSpinnerAndReArm();
                    }, 500); // Small delay for the click and cooldown
                } else {
                    console.log("Auto-Click Debug: Auto-send condition not met (textarea empty, spinner active, or no send button). Re-setting timeout.");
                    // If conditions not met, but script is enabled, re-set timeout
                    setAiResponseTimeout();
                }
            }, config.autoSendDelay * 1000); // Convert seconds to milliseconds
            console.log(`Auto-Click Debug: AI response timeout set for ${config.autoSendDelay} seconds.`);
        } else {
            console.log("Auto-Click Debug: AI response timeout not set (auto-send disabled, max clicks reached, or cooling down).");
        }
    };

    // Check for "Continue" button and click it
    const checkForButton = () => {
        // Prevent clicking if disabled, max clicks reached, or in cooldown
        if (!config.enabled || clickCount >= config.maxClicks || isCoolingDown) {
            clearAiResponseTimeout();
            if (isCoolingDown) console.log("Auto-Click Debug: checkForButton skipped due to active cooldown.");
            return;
        }

        const button = document.querySelector(BUTTON_SELECTOR);
        const spinner = document.querySelector(SPINNER_SELECTOR);
        const textarea = document.querySelector(TEXTAREA_SELECTOR);

        if (button && !spinner && textarea && !textarea.disabled) {
            console.log("Auto-Click: 'Continue' button found, no spinner, textarea enabled. Clicking...");
            clearAiResponseTimeout(); // Clear auto-send timeout if Continue button appears

            // Set cooldown for this auto-click action
            isCoolingDown = true;
            console.log("Auto-Click Debug: Cooldown initiated after auto-click (50ms).");

            manualClickDebounceTimeout = setTimeout(() => {
                button.click();
                clickCount++;

    const now = Date.now();
    recentClickTimestamps.push(now);
    if (recentClickTimestamps.length > RAPID_CLICK_COUNT) {
        recentClickTimestamps.shift();
    }

    if (recentClickTimestamps.length === RAPID_CLICK_COUNT &&
        (now - recentClickTimestamps[0]) <= RAPID_CLICK_THRESHOLD_MS) {
        console.warn("Auto-Click: Detected rapid clicking pattern. Triggering error pause.");
        isErrorActive = true;
        tearDownInternalListeners();
        updateStatusDisplay();
        setButtonColor();
        return;
    }

                updateStatusDisplay();
                setButtonColor();
                isCoolingDown = false; // End cooldown after click attempt
                console.log("Auto-Click Debug: Cooldown ended after auto-click.");

                // After a click, always re-evaluate state by waiting for spinner
                waitForSpinnerAndReArm();
                manualClickDebounceTimeout = null; // Clear debounce after click
            }, 50); // Small delay for the click and cooldown
        } else if (spinner) {
            console.log("Auto-Click Debug: Spinner active. Waiting for AI response.");
            setAiResponseTimeout(); // Keep/re-set AI response timeout while spinner is active
        } else if (textarea && !textarea.disabled && textarea.value.trim().length > 0) {
            // Textarea is ready and has content, AI is not responding, and no Continue button
            console.log("Auto-Click Debug: Textarea ready with content, no spinner, no continue button. Setting/resetting auto-send timeout.");
            setAiResponseTimeout();
        } else {
            console.log("Auto-Click Debug: No 'Continue' button, no active spinner, or textarea disabled/empty.");
            clearAiResponseTimeout(); // Clear if no active conditions for auto-send
        }
    };

    // Wait for spinner to disappear after an action (click or send)
    const waitForSpinnerAndReArm = () => {
        if (manualClickDebounceTimeout) { // If already debouncing, let that finish
            return;
        }
        console.log("Auto-Click Debug: Entering waitForSpinnerAndReArm. Initial 500ms delay...");
        // Initial delay to allow UI to settle and spinner to appear
        setTimeout(() => {
            let checkAttempts = 0;
            const maxCheckAttempts = 20; // 2 seconds (20 * 100ms)

            if (spinnerCheckInterval) {
                clearInterval(spinnerCheckInterval);
                spinnerCheckInterval = null;
            }

            console.log("Auto-Click Debug: 500ms delay complete. Starting spinner check...");

            spinnerCheckInterval = setInterval(() => {
                const spinner = document.querySelector(SPINNER_SELECTOR);
                if (!spinner) {
                    console.log("Auto-Click Debug: Chakra spinner disappeared. Re-arming observers.");
                    clearInterval(spinnerCheckInterval);
                    spinnerCheckInterval = null;
                    manualClickDebounceTimeout = null; // Clear debounce
                    setupObserver(); // Re-arm main observers
                    clearAiResponseTimeout(); // Clear timeout once AI is done
                    updateStatusDisplay();
                    setButtonColor();
                } else {
                    checkAttempts++;
                    console.log(`Auto-Click Debug: Spinner still active. Attempt ${checkAttempts}/${maxCheckAttempts}`);
                    if (checkAttempts >= maxCheckAttempts) {
                        console.warn("Auto-Click Debug: Spinner check timed out. Proceeding to re-arm anyway.");
                        clearInterval(spinnerCheckInterval);
                        spinnerCheckInterval = null;
                        manualClickDebounceTimeout = null; // Clear debounce
                        setupObserver(); // Re-arm main observers
                        clearAiResponseTimeout(); // Clear timeout if it's stuck
                        updateStatusDisplay();
                        setButtonColor();
                    }
                }
            }, 100); // Check every 100ms for spinner to disappear
        }, 500); // Initial 500ms delay before starting spinner check
    };


    // --- Observer Setup and Teardown ---

    // Disconnect only internal auto-clicking observers/intervals
    const tearDownInternalListeners = () => {
        console.log("Auto-Click Debug: Tearing down internal auto-click listeners.");
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        if (buttonCheckInterval) {
            clearInterval(buttonCheckInterval);
            buttonCheckInterval = null;
        }
        if (manualClickDebounceTimeout) {
            clearTimeout(manualClickDebounceTimeout);
            manualClickDebounceTimeout = null;
        }
        if (spinnerCheckInterval) {
            clearInterval(spinnerCheckInterval);
            spinnerCheckInterval = null;
        }
        clearAiResponseTimeout();
        tearDownUserResponseListeners(); // Specific cleanup for user interaction listeners
        if (textareaDisabledObserver) {
            textareaDisabledObserver.disconnect();
            textareaDisabledObserver = null;
        }
        if (continueButtonObserver) {
            continueButtonObserver.disconnect();
            continueButtonObserver = null;
        }
        // Note: configButton related listeners (mouseover, mousedown, etc.) are NOT removed here.
        // They remain attached permanently to allow continuous interaction with the button.
    };


    // Teardown user response listeners (these are internal, related to chat interaction)
    const tearDownUserResponseListeners = () => {
        const textarea = document.querySelector(TEXTAREA_SELECTOR);
        const sendButton = document.querySelector(SEND_BUTTON_SELECTOR);

        if (textarea) {
            if (textareaInputListener) { // This listener is no longer used for resetting on input
                textarea.removeEventListener('input', textareaInputListener);
                textareaInputListener = null;
            }
            if (textareaEnterKeyListener) {
                textarea.removeEventListener('keydown', textareaEnterKeyListener);
                textareaEnterKeyListener = null;
            }
        }
        if (sendButton && sendButtonClickListener) {
            sendButton.removeEventListener('click', sendButtonClickListener);
            sendButtonClickListener = null;
        }
        console.log("Auto-Click Debug: User response listeners torn down.");
    };

    // Listeners for user interaction and textarea enabled state
    const setupUserResponseListeners = () => {
        console.log("Auto-Click Debug: Setting up user response listeners.");
        const textarea = document.querySelector(TEXTAREA_SELECTOR);
        const sendButton = document.querySelector(SEND_BUTTON_SELECTOR);

        if (!textarea || !sendButton) {
            console.warn("Auto-Click Debug: Textarea or Send button not found for user response listeners. Retrying in 500ms.");
            setTimeout(setupUserResponseListeners, 500); // Retry if elements not ready
            return;
        }

        // Removed the 'input' event listener to prevent resetting on every character typed.
        // The script will now only reset on explicit Enter key press or Send button click.
        // if (!textareaInputListener) {
        //     textareaInputListener = () => {
        //         clearAiResponseTimeout();
        //         performResetAndResumeAutoClick("User typed in textarea");
        //     };
        //     textarea.addEventListener('input', textareaInputListener);
        // }

        if (!textareaEnterKeyListener) {
            textareaEnterKeyListener = (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                if (isErrorActive) {
                    console.log("Auto-Click: Error state cleared by Enter key.");
                    isErrorActive = false;
                }
                    // If user presses Enter, clear AI response timeout and reset click counter
                    clearAiResponseTimeout();
                    performResetAndResumeAutoClick("User pressed Enter");
                }
            };
            textarea.addEventListener('keydown', textareaEnterKeyListener);
        }

        if (!sendButtonClickListener) {
            sendButtonClickListener = (event) => {
                // If user clicks send, clear AI response timeout and reset click counter
                // Use a debounce to distinguish from auto-send clicks
                if (!manualClickDebounceTimeout) {
                if (isErrorActive) {
                    console.log("Auto-Click: Error state cleared by Send button click.");
                    isErrorActive = false;
                }
                    clearAiResponseTimeout();
                    performResetAndResumeAutoClick("User manually clicked Send button");
                } else {
                    console.log("Auto-Click Debug: Auto-send detected (debounced). No manual reset triggered.");
                }
            };
            sendButton.addEventListener('click', sendButtonClickListener);
        }
        console.log("Auto-Click Debug: User response listeners attached.");
    };


    // Set up MutationObserver to watch the textarea's 'disabled' attribute
    const setupTextareaDisabledObserver = () => {
        const textarea = document.querySelector(TEXTAREA_SELECTOR);
        if (!textarea) {
            console.warn("Auto-Click Debug: Textarea not found for disabled observer. Retrying in 500ms.");
            setTimeout(setupTextareaDisabledObserver, 500);
            return;
        }

        if (textareaDisabledObserver) {
            textareaDisabledObserver.disconnect();
        }

        textareaDisabledObserver = new MutationObserver((mutationsList) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'disabled') {
                    if (mutation.target.disabled) {
                        console.log("Auto-Click Debug: Textarea detected as disabled. AI is thinking.");
                        // When textarea becomes disabled, AI is thinking. Re-arm after spinner disappears.
                        waitForSpinnerAndReArm();
                    } else { // Textarea became enabled
                        const spinner = document.querySelector(SPINNER_SELECTOR);
                        const continueButton = document.querySelector(BUTTON_SELECTOR);
                        // Only log if spinner is truly gone
                        if (!spinner && !mutation.target.closest(`div.${CSS_SPINNER_CLASS}`)) {
                            console.log("Auto-Click Debug: Textarea detected as enabled after being disabled. Spinner gone. Continue button present:", !!continueButton);
                        }
                    }
                }
            }
        });
        textareaDisabledObserver.observe(textarea, { attributes: true, attributeFilter: ['disabled'] });
        console.log("Auto-Click Debug: Textarea disabled MutationObserver attached to watch for 'disabled' attribute.");
    };

    // Set up MutationObserver to detect the "Continue" button and attach a manual click listener
    const setupManualContinueButtonReset = () => {
    if (continueButtonObserver) {
        continueButtonObserver.disconnect();
    }

    continueButtonObserver = new MutationObserver((mutationsList) => {
        mutationsList.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Watch for Continue button
                const continueBtn = document.querySelector(BUTTON_SELECTOR);
                if (continueBtn && !continueBtn.dataset.listenerAttached) {
                    continueBtn.addEventListener('click', () => {
    if (isErrorActive) {
        console.log("Auto-Click: Error state cleared by user clicking Continue.");
        isErrorActive = false;
    }
                        if (!manualClickDebounceTimeout) {
                if (isErrorActive) {
                    console.log("Auto-Click: Error state cleared by Send button click.");
                    isErrorActive = false;
                }
                            console.log("Auto-Click Debug: User manually clicked 'Continue'. Resetting.");
                            performResetAndResumeAutoClick("User clicked Continue");
                        }
                    });
                    continueBtn.dataset.listenerAttached = 'true';
                }

                // Watch for Regenerate button
                const regenBtn = document.querySelector(REGENERATE_BUTTON_SELECTOR);
                if (regenBtn && !regenBtn.dataset.listenerAttached) {
                    regenBtn.addEventListener('click', () => {
    if (isErrorActive) {
        console.log("Auto-Click: Error state cleared by user clicking Regenerate.");
        isErrorActive = false;
    }
                        console.log("Auto-Click Debug: User clicked Regenerate. Resetting.");
                        performResetAndResumeAutoClick("User clicked Regenerate");
                    });
                    regenBtn.dataset.listenerAttached = 'true';
                }
            }
        });
    });

    continueButtonObserver.observe(document.body, { childList: true, subtree: true });
    console.log("Auto-Click Debug: Continue & Regenerate button observer attached.");
};



    // Main observer setup function (re-arms all internal auto-click logic)
    const setupObserver = () => {
        console.log("Auto-Click Debug: setupObserver called. Cleaning up previous internal observers...");
        // tearDownInternalListeners() is now called by performResetAndResumeAutoClick just before cooldown

        // Prevent immediate re-arming if a cooldown is active
        if (isCoolingDown) {
            console.log("Auto-Click Debug: setupObserver skipped due to active cooldown.");
            return;
        }

        // Ensure no re-arming delay/poll is active before setting up main observers
        if (manualClickDebounceTimeout || spinnerCheckInterval) {
               console.log("Auto-Click Debug: Not setting up main observers because re-arming delay/poll is active.");
               return;
        }

        // Listeners for user interaction and textarea disabled state must ALWAYS be active when script is enabled.
        setupUserResponseListeners();
        setupTextareaDisabledObserver();
        setupManualContinueButtonReset(); // Attach observer for manual continue button clicks


        // If max clicks reached and enabled, go directly to awaiting user reset
        if (config.enabled && clickCount >= config.maxClicks) {
            console.log("Auto-Click Debug: Max clicks reached (or exceeded) upon setupObserver call. Going into pause state.");
            pauseAndAwaitUserReset();
            updateStatusDisplay(); // Ensure display reflects pause state
            setButtonColor();      // Ensure button color reflects pause state
            return; // Exit, do not set up auto-clicking observers
        }

        // Only set up auto-clicking observers if clicks are remaining and enabled:
        observer = new MutationObserver(() => {
            // Only run checkForButton if not in cooldown
            if (config.enabled && clickCount < config.maxClicks && !manualClickDebounceTimeout && !spinnerCheckInterval && !isCoolingDown) {
                checkForButton();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        console.log("Auto-Click Debug: Main MutationObserver re-attached to document.body.");

        buttonCheckInterval = setInterval(() => {
            // Only run checkForButton if not in cooldown
            if (config.enabled && clickCount < config.maxClicks && !manualClickDebounceTimeout && !spinnerCheckInterval && !isCoolingDown) {
                checkForButton();
            }
        }, config.interval); // Use configurable interval
        console.log(`Auto-Click Debug: Button check interval (${config.interval/1000}s) re-started.`);

        updateStatusDisplay();
        setButtonColor(); // Ensure button color is correct after observer setup
    };

    // --- UI Creation ---

    // Create and inject the script's toggle button
    const createConfigButton = () => {
        console.log("Auto-Click Debug: Attempting to create config button."); // Debug log
        if (configButton) {
            console.log("Auto-Click Debug: Config button already exists."); // Debug log
            return; // Prevent recreation
        }

        try {
            configButton = document.createElement('button');
            configButton.textContent = '>>';
            configButton.className = 'chakra-button'; // Using more stable part for styling
            configButton.style.cssText = `
                position: fixed;
                top: 10px;
                left: 50%; /* Position from left */
                transform: translateX(-50%); /* Center horizontally */
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: 2px solid white;
                color: white;
                font-size: 20px;
                font-weight: bold;
                cursor: pointer;
                z-index: 9999;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            setButtonColor(); // Set initial color based on config

            // Add hover listeners to show/hide status panel
            const configButtonMouseOverListener = () => { // Declared with const to keep it local to this scope
                if (statusPanel) {
                    const buttonRect = configButton.getBoundingClientRect();
                    statusPanel.style.top = `${buttonRect.bottom + 5}px`; // 5px below the button
                    statusPanel.style.left = `${buttonRect.left + buttonRect.width / 2}px`;
                    statusPanel.style.transform = `translateX(-50%)`; // Center horizontally relative to button
                    statusPanel.style.display = 'block'; // Show the panel
                }
            };
            const configButtonMouseOutListener = () => { // Declared with const
                if (statusPanel) {
                    statusPanel.style.display = 'none'; // Hide the panel
                }
            };
            configButton.addEventListener('mouseover', configButtonMouseOverListener);
            configButton.addEventListener('mouseout', configButtonMouseOutListener);

            // Long press functionality
            const configButtonMouseDownListener = (e) => { // Declared with const
                if (e.button !== 0) return; // Only listen for left-click
                isLongPress = false;
                longPressTimeout = setTimeout(async () => {
                    isLongPress = true;
                    console.log("Auto-Click Debug: Long press detected!");

                    config.continuousModeEnabled = !config.continuousModeEnabled;
                    if (config.continuousModeEnabled) {
                        config.maxClicks = config.continuousMaxClicks; // Set to effectively infinite
                        console.log(`Auto-Click: Continuous mode ENABLED. Max Clicks set to ${config.maxClicks}.`);
                    } else {
                        config.maxClicks = DEFAULT_CONFIG.maxClicks; // Revert to default
                        console.log(`Auto-Click: Continuous mode DISABLED. Max Clicks reverted to ${config.maxClicks}.`);
                    }
                    await saveConfig();
                    // Perform a reset to apply new maxClicks and trigger state change
                    performResetAndResumeAutoClick(`Long press: Continuous mode ${config.continuousModeEnabled ? 'enabled' : 'disabled'}`);
                }, LONG_PRESS_DURATION);
            };
            const configButtonMouseUpListener = async (e) => { // Declared with const
                if (e.button !== 0) return; // Only listen for left-click
                clearTimeout(longPressTimeout);
                if (!isLongPress) {
                    // This was a regular click, perform toggle and reset
                    config.enabled = !config.enabled; // Toggle state
                    await saveConfig();
                    console.log(`Auto-Click: Script toggled ${config.enabled ? 'ON' : 'OFF'}.`);
                    if (isErrorActive) {
                console.log("Auto-Click: Error state manually cleared by toggle.");
    isErrorActive = false;
}
performResetAndResumeAutoClick(`Script toggled ${config.enabled ? 'ON' : 'OFF'}`);
                }
                isLongPress = false; // Reset flag
            };
            configButton.addEventListener('mousedown', configButtonMouseDownListener);
            configButton.addEventListener('mouseup', configButtonMouseUpListener);
            // Ensure long press is cancelled if mouse leaves while pressing
            configButton.addEventListener('mouseleave', () => {
                clearTimeout(longPressTimeout);
                isLongPress = false;
            });

            document.body.appendChild(configButton);
            console.log("Auto-Click Debug: Config button created and inserted into DOM.");
        } catch (error) {
            console.error("Auto-Click Error: Failed to create or append config button:", error);
        }
    };

    // Create and inject the status panel
    const createStatusPanel = () => {
        console.log("Auto-Click Debug: Attempting to create status panel."); // Debug log
        if (statusPanel) {
            console.log("Auto-Click Debug: Status panel already exists."); // Debug log
            return; // Prevent recreation
        }

        try {
            statusPanel = document.createElement('div');
            statusPanel.style.cssText = `
                position: fixed;
                /* Top and Left will be set dynamically on hover by configButtonMouseOverListener */
                background-color: rgba(0, 0, 0, 0.8);
                color: white;
                border: 1px solid white;
                border-radius: 8px;
                padding: 8px 12px;
                font-family: 'Consolas', 'Monospace';
                font-size: 14px;
                z-index: 9998;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                line-height: 1.4;
                white-space: nowrap; /* Keep text on one line */
                display: none; /* Hidden by default */
            `;

            statusRoutineElement = document.createElement('div');
            statusPanel.appendChild(statusRoutineElement);

            statusClicksElement = document.createElement('div');
            statusPanel.appendChild(statusClicksElement);

            document.body.appendChild(statusPanel);
            console.log("Auto-Click Debug: Status panel created and inserted into DOM.");
            updateStatusDisplay(); // Set initial display
        } catch (error) {
            console.error("Auto-Click Error: Failed to create or append status panel:", error);
        }
    };

    // --- Initialization ---

    // Ensure all necessary UI elements are present before proceeding
    const ensureElementsArePresent = async () => {
        console.log("Auto-Click Debug: ensureElementsArePresent called."); // Debug log
        // Wait for the main Kindroid chat textarea to be present
        let textarea = null;
        let attempts = 0;
        const maxAttempts = 20; // Try for 2 seconds

        while (!textarea && attempts < maxAttempts) {
            textarea = document.querySelector(TEXTAREA_SELECTOR);
            if (!textarea) {
                await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
                attempts++;
            }
        }

        if (textarea) {
            console.log("Auto-Click: Chat textarea found. Initializing script components.");
            await loadConfig(); // Load config first
            createConfigButton();
            createStatusPanel();
            // Start the main observer logic based on current state
            if (config.enabled) {
                // Initial setup if enabled. performResetAndResumeAutoClick will handle cooldown and re-arming.
                performResetAndResumeAutoClick("Initial script load - enabled");
            } else {
                // If disabled initially, just update display; no observers should be active initially
                tearDownInternalListeners(); // Ensure nothing is running if starting disabled
                updateStatusDisplay();
                setButtonColor();
            }
        } else {
            console.error("Auto-Click: Kindroid chat textarea not found after multiple attempts. Script cannot start.");
        }
    };

    // Start the script
    monitorErrorToasts();
    ensureElementsArePresent();

})();
