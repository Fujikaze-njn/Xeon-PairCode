const express = require('express');
const fs = require('fs');
const pino = require('pino');
const {
  default: makeWASocket,
  Browsers,
  delay,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');

const app = express();

async function qr() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./sessions');

    const XeonBotInc = makeWASocket({
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: Browsers.windows('Firefox'),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(
          state.keys,
          pino({ level: 'fatal' }).child({ level: 'fatal' })
        ),
      },
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true,
      getMessage: async (key) => {
        // Implement message retrieval logic here
        return '';
      },
      defaultQueryTimeoutMs: undefined,
    });

    XeonBotInc.ev.on('connection.update', async (s) => {
      const { connection, lastDisconnect } = s;

      if (connection === 'open') {
        await delay(10000);

        // Example message sending
        await XeonBotInc.sendMessage(XeonBotInc.user.id, {
          text: `Your message here`,
        });

        // Example file sending
        const sessionXeon = fs.readFileSync('./sessions/creds.json');
        const xeonses = await XeonBotInc.sendMessage(XeonBotInc.user.id, {
          document: sessionXeon,
          mimetype: 'application/json',
          fileName: 'creds.json',
        });

        // Example group invitation
        XeonBotInc.groupAcceptInvite('Kjm8rnDFcpb04gQNSTbW2d');

        // Example message with quoted message
        await XeonBotInc.sendMessage(
          XeonBotInc.user.id,
          {
            text: `LIEBE🖤`,
          },
          { quoted: xeonses }
        );

        await delay(2000);
        process.exit(0); // Exiting process after tasks complete
      } else if (
        connection === 'close' &&
        lastDisconnect?.error?.output?.statusCode !== 401
      ) {
        qr(); // Reconnect on close if not due to unauthorized (401)
      }
    });

    XeonBotInc.ev.on('creds.update', saveCreds);
  } catch (error) {
    console.error('Error during initialization:', error);
  }
}

// Start the QR function on application start
qr();

// Handle Heroku dynamic port binding
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Handle SIGTERM signal for graceful shutdown
process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
  // Clean up resources, close connections, etc.
  process.exit(0);
});
