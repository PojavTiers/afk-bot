const mineflayer = require('mineflayer');

// All credentials pulled from Railway environment variables (never hardcoded)
const SERVER_IP = process.env.SERVER_IP || 'bananasmp.net';
const SERVER_PORT = parseInt(process.env.SERVER_PORT, 10) || 25565;
const MC_USERNAME = process.env.MC_USERNAME;
const MC_PASSWORD = process.env.MC_PASSWORD;

// Sanity check — fails loudly if you forget to set the Railway variables
if (!MC_USERNAME) {
  console.error('[FATAL] MC_USERNAME environment variable is not set.');
  process.exit(1);
}

// How long the bot stays completely still after spawn (anti-bot grace period)
const JOIN_GRACE_PERIOD_MS = 3000;

let bot;
let afkInterval;
let reconnectTimeout;
let isReconnecting = false;
let lastAction = 0;

function createBot() {
  console.log(`[INFO] Connecting to ${SERVER_IP}:${SERVER_PORT} as ${MC_USERNAME}...`);

  bot = mineflayer.createBot({
    host: SERVER_IP,
    port: SERVER_PORT,
    username: MC_USERNAME,
    auth: 'offline',
    version: '1.21.4', // Java version. Try '1.21.1' if this fails.
    physicsEnabled: true,
    checkTimeoutInterval: 60000,
  });

  // DEBUG: See how far the connection gets
  bot.on('login', () => console.log('[DEBUG] Login packet sent. Waiting for spawn...'));

  bot.once('spawn', () => {
    console.log(`[SUCCESS] ${bot.username} spawned. Waiting ${JOIN_GRACE_PERIOD_MS}ms for anti-bot check to pass...`);

    setTimeout(() => {
      console.log('[INFO] Grace period over. Starting anti-AFK loop.');
      isReconnecting = false;
      startHumanLikeLoop();

      if (MC_PASSWORD) {
        bot.chat(`/login ${MC_PASSWORD}`);
        console.log('[AUTH] Sent /login');
      }
    }, JOIN_GRACE_PERIOD_MS);
  });

  bot.on('end', (reason) => {
    console.log(`[WARN] Disconnected: ${reason}`);
    stopLoop();
    scheduleReconnect();
  });

  // FIXED: This now shows the actual kick message instead of [object Object]
  bot.on('kicked', (reason, loggedIn) => {
    const kickReason = typeof reason === 'string' ? reason : JSON.stringify(reason);
    console.log(`[WARN] Kicked. LoggedIn: ${loggedIn}. Reason: ${kickReason}`);
  });

  bot.on('error', (err) => console.error('[ERROR]', err.message || err));
}

function scheduleReconnect() {
  if (isReconnecting) return;
  isReconnecting = true;
  const delay = 5000 + Math.random() * 5000;
  console.log(`[INFO] Reconnecting in ${(delay / 1000).toFixed(1)}s...`);
  clearTimeout(reconnectTimeout);
  reconnectTimeout = setTimeout(() => {
    isReconnecting = false;
    createBot();
  }, delay);
}

function startHumanLikeLoop() {
  stopLoop();
  afkInterval = setInterval(() => {
    if (!bot || !bot.entity) return;

    const now = Date.now();
    if (now - lastAction < 8000) return;
    lastAction = now;

    const action = Math.floor(Math.random() * 5);
    switch (action) {
      case 0:
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 300 + Math.random() * 200);
        console.log('[HUMAN] Jumped');
        break;
      case 1: {
        const newYaw = bot.entity.yaw + (Math.random() - 0.5) * 0.8;
        const newPitch = bot.entity.pitch + (Math.random() - 0.5) * 0.4;
        bot.look(newYaw, newPitch, true);
        console.log('[HUMAN] Looked around');
        break;
      }
      case 2:
        bot.setControlState('sneak', true);
        setTimeout(() => bot.setControlState('sneak', false), 400 + Math.random() * 300);
        console.log('[HUMAN] Sneaked');
        break;
      case 3:
        bot.setControlState('forward', true);
        setTimeout(() => bot.setControlState('forward', false), 500 + Math.random() * 500);
        console.log('[HUMAN] Walked forward');
        break;
      case 4:
        bot.swingArm();
        console.log('[HUMAN] Swung arm');
        break;
    }
  }, 8000 + Math.random() * 12000);
}

function stopLoop() {
  if (afkInterval) {
    clearInterval(afkInterval);
    afkInterval = null;
  }
}

createBot();