const mineflayer = require('mineflayer');

// Railway environment variables
const SERVER_IP = process.env.SERVER_IP || 'localhost';
const SERVER_PORT = parseInt(process.env.SERVER_PORT, 10) || 25565;
const MC_USERNAME = process.env.MC_USERNAME || 'AFKBot';
const MC_PASSWORD = process.env.MC_PASSWORD || ''; // Optional, for /login on cracked servers

let bot;
let antiAfkInterval;
let reconnectTimeout;
let isReconnecting = false;

function createBot() {
  console.log(`[INFO] Connecting to ${SERVER_IP}:${SERVER_PORT} as ${MC_USERNAME}...`);

  bot = mineflayer.createBot({
    host: SERVER_IP,
    port: SERVER_PORT,
    username: MC_USERNAME,
    auth: 'offline', // <-- cracked / offline-mode account
    version: false   // auto-detect server version
  });

  bot.once('spawn', () => {
    console.log(`[SUCCESS] ${bot.username} spawned in the server.`);
    isReconnecting = false;
    startAntiAfk();

    // Optional: auto-login if the cracked server uses AuthMe or similar
    if (MC_PASSWORD) {
      setTimeout(() => {
        bot.chat(`/login ${MC_PASSWORD}`);
        console.log('[AUTH] Sent /login command.');
      }, 3000);
    }
  });

  bot.on('end', (reason) => {
    console.log(`[WARN] Disconnected: ${reason}`);
    stopAntiAfk();
    scheduleReconnect();
  });

  bot.on('kicked', (reason) => {
    console.log(`[WARN] Kicked: ${reason}`);
  });

  bot.on('error', (err) => {
    console.error('[ERROR]', err.message || err);
  });
}

function scheduleReconnect() {
  if (isReconnecting) return;
  isReconnecting = true;

  const delay = 5000;
  console.log(`[INFO] Reconnecting in ${delay / 1000} seconds...`);

  clearTimeout(reconnectTimeout);
  reconnectTimeout = setTimeout(() => {
    isReconnecting = false;
    createBot();
  }, delay);
}

function startAntiAfk() {
  stopAntiAfk();

  antiAfkInterval = setInterval(() => {
    if (!bot || !bot.entity) return;

    const action = Math.floor(Math.random() * 3);

    if (action === 0) {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
      console.log('[ANTI-AFK] Jumped');
    } else if (action === 1) {
      bot.look(bot.entity.yaw + 0.5, bot.entity.pitch, true);
      console.log('[ANTI-AFK] Looked around');
    } else {
      bot.setControlState('sneak', true);
      setTimeout(() => bot.setControlState('sneak', false), 500);
      console.log('[ANTI-AFK] Sneaked');
    }
  }, 30000); // every 30 seconds
}

function stopAntiAfk() {
  if (antiAfkInterval) {
    clearInterval(antiAfkInterval);
    antiAfkInterval = null;
  }
}

createBot();
