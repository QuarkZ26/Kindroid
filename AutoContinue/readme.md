# AutoContinue.js

A Violentmonkey userscript for [Kindroid.ai](https://kindroid.ai) that auto-clicks the “Continue” button when replies are cut off, optionally re-sends stalled messages, and provides a persistent toggle and status panel. Supports Continuous Mode and now includes a Violentmonkey menu to change `maxClicks` interactively.

---

## 🔧 Features

- 🟢 Floating `≫` button at the top of the screen to:
  - Toggle script on/off (click)
  - Enable/disable **Continuous Mode** (long-press)
- 📟 Status panel shows:
  - Routine status (`Active`, `Paused`, `Continuous`, or `Disabled`)
  - Click counter and limit
- 🔁 Automatically clicks “Continue” when visible
- 🕒 Automatically sends message after X seconds if AI stalls (configurable)
- 🔄 Detects page changes (SPA-safe)
- 🧠 Remembers settings between sessions
- ✅ Manual reset when user:
  - Clicks **Continue**
  - Clicks **Regenerate**
  - Clicks **Send**
  - Presses **Enter** (without Shift)
- 🛠 **New:** Change `maxClicks` via Violentmonkey menu (no code editing needed)

---

## ⚙️ Configuration Options

You can adjust these settings directly via the script or UI:

| Setting               | Description                                             | Default |
|-----------------------|---------------------------------------------------------|---------|
| `enabled`             | Whether the script is active                            | `true`  |
| `interval`            | How often to check for the Continue button (ms)        | `1000`  |
| `maxClicks`           | Number of auto-clicks before pausing                   | `1`     |
| `autoSendEnabled`     | Automatically send if AI stalls                         | `true`  |
| `autoSendDelay`       | Seconds to wait before auto-send                        | `10`    |
| `continuousModeEnabled` | If true, ignores maxClicks limit                    | `false` |
| `continuousMaxClicks` | Max clicks when in Continuous Mode                     | `100`   |

These are stored using `GM_setValue` and persist between sessions.

---

## 🧩 Violentmonkey Menu

Open the **Violentmonkey menu** on the page and use:

- **“Set max auto-clicks”** – Enter a number to change `maxClicks`.
  - Enter `0` to switch to Continuous Mode.
  - Any other number disables Continuous Mode and sets a new limit.

---

## 🚀 How to Use

1. Install the script:  
   [raw.githubusercontent.com/.../AutoContinue.js](https://raw.githubusercontent.com/QuarkZ26/Kindroid/main/AutoContinue/AutoContinue.js)

2. Visit [https://kindroid.ai](https://kindroid.ai)
3. Use the floating `≫` button:
   - Tap to toggle on/off
   - Long-press to enter Continuous Mode
4. Optionally configure via Violentmonkey menu

---

## 🔄 Reset Conditions

The script resets its internal counter (and resumes) automatically when you:

- Manually click **Continue**
- Click the **Regenerate** button
- Press **Enter** to send a message
- Click the **Send** button

---

## 🧼 Disable

Click the `≫` button again to disable. You can also toggle the script from the Violentmonkey dashboard.

---

## 📝 Notes

- Supports Kindroid’s single-page app structure (no reloads needed)
- Light on performance; uses smart cooldowns and observers
- Clean UI overlay with status and state feedback

---

## 📜 License

MIT
