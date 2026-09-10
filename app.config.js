const appJson = require('./app.json');

const projectId = (process.env.EXPO_EAS_PROJECT_ID || '').trim();
const updateChannel = (process.env.EXPO_UPDATES_CHANNEL || 'preview').trim();

const expo = {
  ...appJson.expo,
  runtimeVersion: { policy: 'appVersion' },
};

if (projectId) {
  expo.updates = {
    enabled: true,
    url: `https://u.expo.dev/${projectId}`,
    checkAutomatically: 'NEVER',
    fallbackToCacheTimeout: 0,
    requestHeaders: {
      'expo-channel-name': updateChannel,
    },
  };
  expo.extra = {
    ...(appJson.expo.extra || {}),
    eas: {
      ...((appJson.expo.extra && appJson.expo.extra.eas) || {}),
      projectId,
    },
  };
} else {
  expo.updates = { enabled: false };
}

module.exports = { expo };
