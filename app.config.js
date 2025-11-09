export default ({ config }) => {
  // EAS Build가 자동으로 주입하는 환경 변수
  const buildProfile = process.env.EAS_BUILD_PROFILE || 'production';

  // 빌드 프로파일에 따라 앱 이름 결정
  const getAppName = () => {
    switch (buildProfile) {
      case 'development':
        return 'Heart Stamp Dev';
      case 'preview':
        return 'Heart Stamp Preview';
      default:
        return 'Heart Stamp';
    }
  };

  // 빌드 프로파일에 따라 Bundle Identifier 결정
  const getBundleIdentifier = () => {
    switch (buildProfile) {
      case 'development':
        return 'com.heartstamp.app.dev';
      case 'preview':
        return 'com.heartstamp.app.preview';
      default:
        return 'com.heartstamp.app';
    }
  };

  // 빌드 프로파일에 따라 Android Package 결정
  const getAndroidPackage = () => {
    switch (buildProfile) {
      case 'development':
        return 'com.heartstamp.app.dev';
      case 'preview':
        return 'com.heartstamp.app.preview';
      default:
        return 'com.heartstamp.app';
    }
  };

  return {
    ...config,
    expo: {
      name: getAppName(),
      slug: 'heart-stamp',
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
