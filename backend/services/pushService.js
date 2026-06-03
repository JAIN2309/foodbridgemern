const User = require('../models/User');

// Send Expo push notification
const sendPush = async (pushToken, { title, body, data = {} }) => {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken')) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        data,
        sound: 'default',
        priority: 'high',
        channelId: 'default',
      }),
    });
  } catch (err) {
    console.error('Push notification failed:', err.message);
  }
};

// Silent push — wakes app without showing notification (for background sync)
const sendSilentPush = async (pushToken, data = {}) => {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken')) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        data: { type: 'silent_sync', ...data },
        sound: null,
        badge: 0,
        priority: 'high',
        _contentAvailable: true,   // iOS background wake
        channelId: 'silent',
      }),
    });
  } catch (err) {
    console.error('Silent push failed:', err.message);
  }
};

// Push to a user by ID
const pushToUser = async (userId, notification) => {
  const user = await User.findById(userId).select('push_token');
  if (user?.push_token) await sendPush(user.push_token, notification);
};

const silentSyncToUser = async (userId, data = {}) => {
  const user = await User.findById(userId).select('push_token');
  if (user?.push_token) await sendSilentPush(user.push_token, data);
};

module.exports = { sendPush, sendSilentPush, pushToUser, silentSyncToUser };
