const appJson = require('./app.json');

const committedProjectId = appJson.expo.extra?.eas?.projectId || '';
const projectId = (process.env.EXPO_EAS_PROJECT_ID || committedProjectId).trim();
const updateChannel = (process.env.EXPO_UPDATES_CHANNEL || '').trim();

const expo = {
  ...appJson.expo,
  runtimeVersion: { policy: 'fingerprint' },
};

if (projectId) {
  expo.updates = {
    ...(appJson.expo.updates || {}),
    enabled: true,
    url: `https://u.expo.dev/${projectId}`,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
    ...(updateChannel ? {
      requestHeaders: {
        'expo-channel-name': updateChannel,
      },
    } : {}),
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
