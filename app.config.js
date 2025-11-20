export default ({ config }) => {
  // APP_VARIANT 환경 변수로 판단 (eas.json에서 주입)
  const appVariant = process.env.APP_VARIANT;
  const appEnv = process.env.APP_ENV;
  const isProduction = appEnv === 'production';

  console.log('========================================');
  console.log('🔍 [app.config.js] Build Configuration');
  console.log('----------------------------------------');
  console.log('APP_VARIANT:', appVariant);
  console.log('APP_ENV:', appEnv);
  console.log('isProduction:', isProduction);

  // 환경 변수 미설정 경고
  if (!appVariant && !appEnv) {
    console.warn('⚠️  WARNING: Neither APP_VARIANT nor APP_ENV is set!');
    console.warn('⚠️  Defaulting to development environment.');
  }
  console.log('========================================');

  return {
    expo: {
      name: 'Heart Stamp',
      slug: 'heart-stamp',
      scheme: 'heartstamp',
      version: '1.1.0',
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
        supportsTablet: false,
        bundleIdentifier: isProduction ? 'com.59inu.heartstamp' : 'com.59inu.heartstamp.preview',
        googleServicesFile: process.env.GOOGLE_SERVICES_INFOPLIST,
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
        '@react-native-firebase/app',
        [
          'expo-notifications',
          {
            icon: './assets/icon.png',
            color: '#ffffff',
            enableBackgroundRemoteNotifications: true,
          },
        ],
      ],
      extra: {
        eas: {
          projectId: '46e61da8-364c-4ce8-b1b8-03883e7e6919',
        },
        // EAS Build에서 주입된 환경 변수를 앱 런타임에 전달
        appEnv: appEnv || 'development',
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
