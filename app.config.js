export default ({ config }) => {
  // EAS Build가 자동으로 주입하는 환경 변수
  const buildProfile = process.env.EAS_BUILD_PROFILE || 'production';

  console.log('🔍 [app.config.js] buildProfile:', buildProfile);

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
        bundleIdentifier: buildProfile === 'development' ? 'com.59inu.heartstamp.dev' : 'com.59inu.heartstamp',
        associatedDomains: [
          'applinks:heartstamp.kr',
          'applinks:www.heartstamp.kr'
        ],
        config: {
          usesNonExemptEncryption: false,
        },
        splash: {
          image: './assets/splash.png',
          resizeMode: "contain",
          backgroundColor: "#F9F3EB"
        },
      },
      android: {
        package: buildProfile === 'development' ? 'com.59inu.heartstamp.dev' : 'com.59inu.heartstamp',
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#ffffff',
        },
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
