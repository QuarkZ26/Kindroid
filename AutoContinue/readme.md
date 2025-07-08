# AutoClickContinue – Hands-Free Reply Completion for Kindroid

A [ViolentMonkey](https://violentmonkey.github.io/) userscript for [Kindroid.ai](https://kindroid.ai/) that **auto-presses the "Continue" button** when AI replies are truncated.

Never babysit incomplete responses again.

---

## Features

- Auto-clicks **Continue** when Kin's answer is incomplete
- Clicks a user-decided number of times to limit the amount of times the script clicks, or use continuous mode
- Adds a button on the page to enable/disable on-the-fly, or switch between the different modes

---

## Usage

1. Install the script via the link below (see [readme](https://github.com/QuarkZ26/Kindroid/blob/main/readme.md) for help)
2. Reload Kindroid.ai
3. Tap the floating **≫** button (top-center) to enable or disable
4. **Long-press** the same button to switch to "continuous" mode or go back to steps mode.

**NOTE:** Although you can put a high number, there is still a 4000 character limit to the Kin's response. If that limit gets reached while **continuous mode** is on, you will get an error from Kindroid indefinitely, you will have to turn the script off in order to break that loop. I plan a future update to handle this and stop the loop when this happens.

As such, I recommend not to put anything higher than 3, which is typically the amount of times you can continue the cut-off message before you reach that limit.


---

## 🔗 Install

```text
https://raw.githubusercontent.com/QuarkZ26/Kindroid/main/AutoClickContinue.js
