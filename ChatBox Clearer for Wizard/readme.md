# 🧹 Kindroid Chatbox Cleaner + Smart Suggest Trigger

A powerful [ViolentMonkey](https://violentmonkey.github.io/) userscript for [Kindroid.ai](https://kindroid.ai/) that **clears the message textarea before generating suggestions**, preventing stale or unintended prompts — while still giving you full control via **long-press bypass**.

---

## 🚀 Features

- ✅ **Auto-clears** the chatbox before triggering the “Suggest message” button  
- 🔁 **Bypasses React control** using native input setters (React-safe)  
- 🧠 **Long-press detection** (≥600ms) lets you *skip clearing* if needed  
- 🎯 Invisible overlay button ensures seamless UX — no UI interference  
- 🔄 **Resilient to DOM changes** in SPA environments (mutation observer)  
- 🛡️ Doesn’t interfere with regular Kindroid functionality  

---

## 💡 Usage

| Action                       | Behavior                                         |
|-----------------------------|--------------------------------------------------|
| **Click (normal)**          | Clears the chatbox, then triggers “Suggest”     |
| **Long-press (≥600ms)**     | Skips clearing — just triggers “Suggest”        |

The script is ideal for users who often forget to clear their input or want to automate the clean state before generation, while still allowing exceptions with a long press.

---

## 🛠️ Installation

1. Install the [ViolentMonkey extension](https://violentmonkey.github.io/) (available for Chrome, Firefox, etc.)
2. Click **"Create a new script"** from the extension dashboard
3. Paste in the contents of [`kindroid-clear-suggest.user.js`](#)
4. Save the script — it will automatically run on [https://kindroid.ai/](https://kindroid.ai/)

---

## 🧪 How It Works

- The script watches for the presence of Kindroid’s **“Suggest message”** button.
- An invisible, fixed-position overlay `<button>` is placed exactly on top of it.
- When clicked, the script:
  - Clears the textarea using native `value` setters (to properly inform React)
  - Triggers the original button after clearing is complete
- On long-press (≥600ms), the overlay bypasses clearing and simply forwards the click

All logic is isolated and event-safe. Long-press timing is handled via `pointerdown`/`pointerup`.

---

## 🖼️ Preview

> _(Optional: insert screenshot or demo gif here)_  
> Example:  
> ![screenshot](./screenshot.png)

---

## 📦 File Structure

