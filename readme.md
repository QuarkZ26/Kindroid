# Kindroid Userscripts Toolkit

A collection of helper scripts for [kindroid.ai](https://kindroid.ai), designed to improve usability, automate common tasks, and enhance the chat interface. All scripts are designed for use with **Violentmonkey**, and are also compatible with Tampermonkey or Greasemonkey 4+.

---

## Scripts

| Script                   | Description |
|--------------------------|-------------|
| [**AutoContinue.js**](https://github.com/QuarkZ26/Kindroid/tree/main/AutoContinue)      | Automatically clicks "Continue" when Kin messages are too long. Option to either click a certain amount of times or continuously click. Long-press toggles continuous mode. |
| [**BubbleExtender**](https://github.com/QuarkZ26/Kindroid/tree/main/Chat%20Bubble%20Extender)       | Adds a UI slider to adjust chat width live. |
| [**ClearBoxWizard.js**](https://github.com/QuarkZ26/Kindroid/tree/main/ChatBox%20Clearer%20for%20Wizard) | Clears the input box before activating Kindroid’s "Suggest" wizard, so that it outputs a brand new suggestion instead of adding to the existing one. |
| [**CloneKinsToTheSide.js**](https://github.com/QuarkZ26/Kindroid/tree/main/Vertical%20Kin%20Menu) | Clones avatar (kin) buttons to the right side for fast access. |
| [**CustomSuggestions.js**](https://github.com/QuarkZ26/Kindroid/tree/main/Suggestions%20Customizer) | Add personal suggestion buttons with color and label. Includes Manager. |
| [**QuickReplies.js**](https://github.com/QuarkZ26/Kindroid/tree/main/Quick%20Replies%20Customizer)      | Create one-tap replies under the textbox that auto-send. |

---

## Requirements

- Browser with Violentmonkey installed (Chrome, Edge, Brave, Firefox, etc.), or GreaseMonkey or alternative, which should work but are untested.
- For Mobile, Firefox works as well. You can export your script and reimport for easy transfer.
- JavaScript enabled

---

## Installation

There are two ways to install these scripts in Violentmonkey:

### Option 1: Install by URL (Recommended)

1. Open ViolentMonkey Settings
2. Click the + button and select "Install From URL"
3. Paste one of the URLs below

Example URLs:

- https://raw.githubusercontent.com/QuarkZ26/Kindroid/main/AutoContinue/AutoContinue.js  
- https://raw.githubusercontent.com/QuarkZ26/Kindroid/main/Chat%20Bubble%20Extender/ChatExtender.js  
- https://raw.githubusercontent.com/QuarkZ26/Kindroid/main/ChatBox%20Clearer%20for%20Wizard/WizardClear.js  
- https://raw.githubusercontent.com/QuarkZ26/Kindroid/main/Quick%20Replies%20Customizer/QuickRepliesCustomizer.js  
- https://raw.githubusercontent.com/QuarkZ26/Kindroid/main/Suggestions%20Customizer/SuggestionsCustomizer.js  
- https://raw.githubusercontent.com/QuarkZ26/Kindroid/main/Vertical%20Kin%20Menu/CloneKinButtons.js  

Tip: If the script doesn't install automatically, copy the URL, open a new tab, and paste it manually.

### Option 2: Manual Copy & Paste

1. Open [this repo](https://github.com/QuarkZ26/Kindroid) on GitHub.
2. Open the script you want.
3. Open Violentmonkey dashboard → **Create a new script**.
4. **Delete** the default code, then **paste** the copied script.
5. Save (`Ctrl+S` or 💾).

Use this method if you want to preview or modify the script before installing.

---

## Script Settings

Some scripts (like `AutoContinue.js`) have **Violentmonkey menu options**:

- Right-click the monkey icon or open the VM dashboard.
- Choose the script → use **menu commands** like:
  - “Set max auto-clicks”
  - “Manage Quick Replies”
  - “Manage Suggestion Buttons”

These menus let you change settings without editing code.

---

## Contributing

Pull requests and issues welcome! Please keep each script self-contained.

---

## License

MIT — Free to use, share, modify.
