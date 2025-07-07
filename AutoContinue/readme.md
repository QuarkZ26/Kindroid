# 🤖 AutoClickContinue – Hands-Free Reply Completion for Kindroid

A smart [ViolentMonkey](https://violentmonkey.github.io/) userscript for [Kindroid.ai](https://kindroid.ai/) that **auto-presses the "Continue" button** when AI replies are truncated — and can optionally **re-send** prompts if the bot goes silent.

Never babysit incomplete responses again.

---

## 🚀 Features

- 🖱️ Auto-clicks **Continue** when Kindroid pauses mid-reply
- 🕹️ Toggle on/off with a floating **≫** button (top-center UI)
- ✋ Long-press **≫** to enable **continuous mode** (no click limit)
- 🕒 Auto-press **Send** if the AI goes silent after a timeout
- 📊 Live status panel shows routine activity and click count
- 🔄 Fully **SPA-aware** — survives navigation and DOM changes

---

## ⚙️ Configuration (In-Script Defaults)

You can adjust these by editing the script directly or using ViolentMonkey’s "Storage" tab.

| Config Key       | Default  | Description                                              |
|------------------|----------|----------------------------------------------------------|
| `interval`       | `1000 ms`| Polling rate for detecting the "Continue" button        |
| `maxClicks`      | `1`      | Auto-click limit before pausing (ignored in continuous) |
| `autoSendDelay`  | `10 s`   | Time to wait before pressing **Send** if bot is idle    |

---

## 💡 Usage

1. Install the script via the link below
2. Reload Kindroid.ai
3. Tap the floating **≫** button (top-center) to enable
4. **Long-press** the same button to switch to "continuous" mode

A small floating panel will appear showing the current status and auto-click count.

---

## 🔗 Install

```text
https://raw.githubusercontent.com/QuarkZ26/Kindroid/main/AutoClickContinue.js
