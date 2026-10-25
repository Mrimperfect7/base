import 'dotenv/config';
import qrcode from 'qrcode-terminal';

let baileys;

try {
  baileys = await import('@sulthan/baileys');
} catch (error) {
  console.error('Could not import @sulthan/baileys.');
  console.error('Check the package name and install access.');
  console.error(error.message);
  process.exit(1);
}

const makeWASocket = baileys.default ?? baileys.makeWASocket;
const useMultiFileAuthState = baileys.useMultiFileAuthState;
const DisconnectReason = baileys.DisconnectReason ?? { loggedOut: 401 };

if (!makeWASocket || !useMultiFileAuthState) {
  console.error('The installed package does not expose the expected Baileys-compatible API.');
  console.error('Expected a default export or makeWASocket and useMultiFileAuthState.');
  console.error('Available exports:', Object.keys(baileys).join(', '));
  process.exit(1);
}

const IGNORE_GROUPS = (process.env.IGNORE_GROUPS ?? 'true').toLowerCase() === 'true';
const BOT_LANGUAGE = (process.env.BOT_LANGUAGE ?? 'en').toLowerCase();

const menus = {
  en: `👋 Hello! Welcome to our WhatsApp bot.

Reply with a number:
1️⃣ About us
2️⃣ Products / services
3️⃣ Business hours
4️⃣ Talk to a human

Type *menu* to see these options again.`,
  ml: `👋 നമസ്കാരം! ഞങ്ങളുടെ WhatsApp ബോട്ടിലേക്ക് സ്വാഗതം.

ഒരു നമ്പർ മറുപടിയായി അയയ്ക്കൂ:
1️⃣ ഞങ്ങളെക്കുറിച്ച്
2️⃣ ഉൽപ്പന്നങ്ങൾ / സേവനങ്ങൾ
3️⃣ പ്രവർത്തന സമയം
4️⃣ ഒരു വ്യക്തിയുമായി സംസാരിക്കുക

വീണ്ടും മെനു കാണാൻ *menu* എന്ന് അയയ്ക്കൂ.`
};

const replies = {
  en: {
    '1': 'We are happy to help! Add your business details in src/index.js.',
    '2': 'Add your current product or service catalogue here.',
    '3': 'Add your actual business hours here.',
    '4': 'A team member will need to follow up with you. Please leave your question here.',
    fallback: 'Sorry, I did not understand that. Send *menu* to see available options.'
  },
  ml: {
    '1': 'സന്തോഷത്തോടെ സഹായിക്കാം! നിങ്ങളുടെ ബിസിനസ് വിവരങ്ങൾ src/index.js-ൽ ചേർക്കുക.',
    '2': 'നിങ്ങളുടെ ഉൽപ്പന്നങ്ങളുടെയും സേവനങ്ങളുടെയും വിവരങ്ങൾ ഇവിടെ ചേർക്കുക.',
    '3': 'പ്രവർത്തന സമയം ഇവിടെ ചേർക്കുക.',
    '4': 'ടീം അംഗം നിങ്ങളെ ബന്ധപ്പെടേണ്ടതുണ്ട്. നിങ്ങളുടെ ചോദ്യം ഇവിടെ അയയ്ക്കൂ.',
    fallback: 'ക്ഷമിക്കണം, മനസ്സിലായില്ല. ഓപ്ഷനുകൾ കാണാൻ *menu* എന്ന് അയയ്ക്കൂ.'
  }
};

function getText(message) {
  const content = message?.message;
  if (!content) return '';
  return (
    content.conversation ??
    content.extendedTextMessage?.text ??
    content.imageMessage?.caption ??
    content.videoMessage?.caption ??
    content.documentMessage?.caption ??
    ''
  ).trim();
}

let isStarting = false;
let shouldStop = false;

async function startBot() {
  if (isStarting || shouldStop) return;
  isStarting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', ({ connection, qr, lastDisconnect }) => {
      if (qr) {
        console.log('Scan this QR in WhatsApp → Settings → Linked Devices → Link a Device');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'open') {
        console.log('WhatsApp bot connected.');
        isStarting = false;
      }

      if (connection === 'close') {
        isStarting = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode;

        if (statusCode === DisconnectReason.loggedOut) {
          console.error('Logged out. Link the account again to continue.');
          return;
        }

        console.log('Connection closed. Reconnecting in 3 seconds...');
        setTimeout(() => startBot().catch(console.error), 3000);
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const message of messages ?? []) {
        try {
          if (!message?.message || message.key?.fromMe) continue;

          const jid = message.key?.remoteJid;
          if (!jid || jid === 'status@broadcast') continue;
          if (IGNORE_GROUPS && jid.endsWith('@g.us')) continue;

          const incoming = getText(message).toLowerCase();
          if (!incoming) continue;

          const language = BOT_LANGUAGE === 'ml' ? 'ml' : 'en';
          const isMenu = ['hi', 'hello', 'hey', 'menu', 'start', 'ഹായ്', 'നമസ്കാരം'].includes(incoming);
          const response = isMenu ? menus[language] : replies[language][incoming] ?? replies[language].fallback;

          await sock.sendMessage(jid, { text: response }, { quoted: message });
          console.log(`Replied to ${jid}: ${incoming.slice(0, 80)}`);
        } catch (error) {
          console.error('Message handler error:', error?.message ?? error);
        }
      }
    });
  } catch (error) {
    isStarting = false;
    console.error('Bot startup error:', error?.message ?? error);
    process.exitCode = 1;
  }
}

process.on('SIGINT', () => {
  shouldStop = true;
  console.log('Stopping bot. Keep auth_info private.');
  process.exit(0);
});

startBot();
