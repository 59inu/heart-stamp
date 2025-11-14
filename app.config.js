export default ({ config }) => {
  // APP_VARIANT 환경 변수로 판단 (eas.json에서 주입)
  const appVariant = process.env.APP_VARIANT;
  const isProduction = process.env.APP_ENV === 'production';

  console.log('🔍 [app.config.js] APP_VARIANT:', appVariant);
  console.log('🔍 [app.config.js] APP_ENV:', process.env.APP_ENV);

  return {
    expo: {
      name: 'Heart Stamp',
      slug: 'heart-stamp',
      scheme: 'heartstamp',
      version: '1.0.0',
      orientation: 'portrait',
      icon: './assets/icon.png',
      userInterfaceStyle: 'light',
      newArchEnabled: true,
      owner: '59nuna',
      projectId: '46e61da8-364c-4ce8-b1b8-03883e7e6919',
      splash: {
        image: './assets/splash.png',
        resizeMode: "contain",
        backgroundColor: "#F9F3EB"
      },
      ios: {
        supportsTablet: true,
        bundleIdentifier: isProduction ? 'com.59inu.heartstamp' : 'com.59inu.heartstamp.preview',
        associatedDomains: [
          'applinks:heartstamp.kr',
          'applinks:www.heartstamp.kr'
        ],
        config: {
          usesNonExemptEncryption: false,
        },
        entitlements: {
          'aps-environment': isProduction ? 'production' : 'development',
        },
        infoPlist: {
          UIBackgroundModes: ['remote-notification'],
          NSUserNotificationsUsageDescription: '매일 아침 AI 선생님의 따뜻한 코멘트를 받아보세요',
        },
        splash: {
          image: './assets/splash.png',
          resizeMode: "contain",
          backgroundColor: "#F9F3EB"
        },
      },
      android: {
        package: isProduction ? 'com.team59inu.heartstamp' : 'com.team59inu.heartstamp.dev',
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#ffffff',
        },
        permissions: [
          'POST_NOTIFICATIONS',
          'RECEIVE_BOOT_COMPLETED',
        ],
        edgeToEdgeEnabled: true,
        predictiveBackGestureEnabled: false,
      },
      web: {
        favicon: './assets/favicon.png',
      },
      plugins: [
        'expo-web-browser',
        'expo-secure-store',
        '@sentry/react-native/expo',
        [
          'expo-notifications',
          {
            icon: './assets/icon.png',
            color: '#ffffff',
          },
        ],
      ],
      extra: {
        eas: {
          projectId: '46e61da8-364c-4ce8-b1b8-03883e7e6919',
        },
      },
      runtimeVersion: {
        policy: 'appVersion',
      },
      updates: {
        url: 'https://u.expo.dev/46e61da8-364c-4ce8-b1b8-03883e7e6919',
      },
    },
  };
};
