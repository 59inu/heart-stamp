export default ({ config }) => {
  // EAS Build가 자동으로 주입하는 환경 변수
  const buildProfile = process.env.EAS_BUILD_PROFILE || 'production';

  // 모든 빌드에서 동일한 앱 이름 사용 (스킴 일관성 유지)
  const getAppName = () => {
    return 'Heart Stamp';
  };

  // 빌드 프로파일에 따라 Bundle Identifier 결정
  const getBundleIdentifier = () => {
    switch (buildProfile) {
      case 'development':
        return 'com.59inu.heartstamp.dev';
      case 'preview':
        return 'com.59inu.heartstamp'; // preview도 production과 동일한 Bundle ID 사용
      default:
        return 'com.59inu.heartstamp';
    }
  };

  // 빌드 프로파일에 따라 Android Package 결정
  const getAndroidPackage = () => {
    const pkg = (() => {
      switch (buildProfile) {
        case 'development':
          return 'com.59inu.heartstamp.dev';
        case 'preview':
          return 'com.59inu.heartstamp'; // preview도 production과 동일한 Package 사용
        default:
          return 'com.59inu.heartstamp';
      }
    })();
    console.log('🔍 [app.config.js] buildProfile:', buildProfile);
    console.log('🔍 [app.config.js] Android package:', pkg);
    return pkg;
  };

  return {
    expo: {
      name: getAppName(),
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
        bundleIdentifier: getBundleIdentifier(),
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
        package: getAndroidPackage(),
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
