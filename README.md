# WhatsApp Bot — @sulthan/baileys

A starter Node.js WhatsApp chatbot with QR pairing, reconnect handling, a numbered menu, and English/Malayalam replies.

## Requirements

- Node.js 20 or newer
- A WhatsApp account you are authorized to link
- Terminal access on a computer or server

## Install and run

```bash
npm install
cp .env.example .env
npm start
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

If the package exposes the expected Baileys-compatible API, a QR code will appear in the terminal. On your phone, open WhatsApp → Settings → Linked Devices → Link a Device and scan it.

Send `hi` or `menu` to the linked WhatsApp account from another account to see the menu.

## Configure

Edit `.env`:

- `BOT_LANGUAGE=en` for English
- `BOT_LANGUAGE=ml` for Malayalam
- `IGNORE_GROUPS=true` to ignore group messages

Edit the `menus` and `replies` values in `src/index.js` to add your business details and product information.

## Package compatibility

This project imports `@sulthan/baileys` as requested. Its exact public API could not be independently verified while preparing this starter. If installation fails or the app reports missing exports, check the package name, version, and documentation. The adapter expects a default export or `makeWASocket`, plus `useMultiFileAuthState`.

## Security

- Never share or commit `auth_info/`; it contains WhatsApp session credentials.
- Keep `.env` private.
- Do not use this for unsolicited bulk messaging. Follow WhatsApp terms and applicable privacy rules.
- This is an unofficial WhatsApp Web integration, not the official WhatsApp Cloud API.
- For production business messaging, consider the official WhatsApp Cloud API.
