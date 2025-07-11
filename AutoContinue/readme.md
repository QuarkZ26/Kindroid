# AutoClickContinue – Hands-Free Reply Completion for Kindroid

A [ViolentMonkey](https://violentmonkey.github.io/) userscript for [Kindroid.ai](https://kindroid.ai/) that **auto-presses the "Continue" button** when AI replies are truncated.

Never babysit incomplete responses again.

---

## Features

- Auto-clicks **Continue** when Kin's answer is incomplete
- Counter mode: Lets you specify the amount of times you want auto-click to happen
- Continuous mode: clicks it 'til it breaks it!
- Adds a button on the page to enable/disable on-the-fly, or switch between the different modes

---

## Usage

1. Install the script via the link below (see [readme](https://github.com/QuarkZ26/Kindroid/blob/main/readme.md) for help)
2. Reload Kindroid.ai
3. Tap the floating **≫** button (top-center) to enable or disable
4. **Long-press** the same button to switch to "continuous" mode or go back to steps mode.

In Counter mode, after the number has been reached, the auto-clicking stops, until you either: answer, regenerate, turn it off and on, or click the continue button yourself. 
Although you can put a high number, there is still a 4000 character limit to the Kin's response. If that limit gets reached while **continuous mode** is on, you will get an error from Kindroid and the script will stop, the icon will be red. Just as above, clicking Continue, answering, regenerating or turning off and on, will enable the script again.

The following color code is used for the button:

    🟥 Red for error state
    ⚫ Black when disabled
    🔵 Blue for continuous
    🟢 Green for active
    🟡 Yellow when paused due to max clicks

---

## 🔗 Install

```text
https://raw.githubusercontent.com/QuarkZ26/Kindroid/refs/heads/main/AutoContinue/AutoContinue.js
