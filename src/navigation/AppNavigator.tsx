import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, NavigationState } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from './types';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { DiaryListScreen } from '../screens/DiaryListScreen';
import { DiaryWriteScreen } from '../screens/DiaryWriteScreen';
import { DiaryDetailScreen } from '../screens/DiaryDetailScreen';
import { ReportScreen } from '../screens/ReportScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { StampCollectionScreen } from '../screens/StampCollectionScreen';
import { ExportScreen } from '../screens/ExportScreen';
import { YearlyEmotionFlowScreen } from '../screens/YearlyEmotionFlowScreen';
import { COLORS } from '../constants/colors';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { logger } from '../utils/logger';

const Stack = createStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  onNavigationStateChange?: (routeName: string) => void;
}

export const AppNavigator: React.FC<AppNavigatorProps> = ({ onNavigationStateChange }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAgreed, setHasAgreed] = useState(false);

  useEffect(() => {
    const checkAgreement = async (retryCount = 0): Promise<void> => {
      const MAX_RETRIES = 2;

      try {
        const agreement = await AsyncStorage.getItem('privacyAgreement');
        setHasAgreed(!!agreement);
      } catch (error: any) {
        logger.error(`약관 동의 확인 오류 (시도 ${retryCount + 1}/${MAX_RETRIES + 1}):`, error);

        // AsyncStorage 에러 시 재시도
        if (retryCount < MAX_RETRIES) {
          logger.log(`⏳ ${500 * (retryCount + 1)}ms 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
          return checkAgreement(retryCount + 1);
        }

        // 최대 재시도 후에도 실패하면 안전하게 온보딩으로
        logger.warn('⚠️ AsyncStorage 접근 실패: 온보딩 화면으로 이동합니다.');
        setHasAgreed(false);
      } finally {
        // 마지막 시도에서만 로딩 종료
        if (retryCount === 0 || retryCount >= MAX_RETRIES) {
          setIsLoading(false);
        }
      }
    };

    checkAgreement();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const getCurrentRouteName = (state: NavigationState | undefined): string => {
    if (!state) return '';
    const route = state.routes[state.index];
    if ((route as any).state) {
      return getCurrentRouteName((route as any).state as NavigationState);
    }
    return route.name;
  };

  return (
    <NavigationContainer
      onStateChange={(state) => {
        const routeName = getCurrentRouteName(state);
        onNavigationStateChange?.(routeName);
      }}
    >
      <Stack.Navigator
        initialRouteName={hasAgreed ? 'DiaryList' : 'Onboarding'}
        screenOptions={{
          headerShown: false,
        }}
      >
        {!hasAgreed && (
          <Stack.Screen name="Onboarding">
            {() => (
              <ErrorBoundary level="screen">
                <OnboardingScreen />
              </ErrorBoundary>
            )}
          </Stack.Screen>
        )}
        <Stack.Screen name="DiaryList">
          {() => (
            <ErrorBoundary level="screen">
              <DiaryListScreen />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="DiaryWrite">
          {() => (
            <ErrorBoundary level="screen">
              <DiaryWriteScreen />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="DiaryDetail">
          {() => (
            <ErrorBoundary level="screen">
              <DiaryDetailScreen />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="Report">
          {() => (
            <ErrorBoundary level="screen">
              <ReportScreen />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="Settings">
          {() => (
            <ErrorBoundary level="screen">
              <SettingsScreen />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="StampCollection">
          {() => (
            <ErrorBoundary level="screen">
              <StampCollectionScreen />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="Export">
          {() => (
            <ErrorBoundary level="screen">
              <ExportScreen />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="YearlyEmotionFlow">
          {() => (
            <ErrorBoundary level="screen">
              <YearlyEmotionFlowScreen />
            </ErrorBoundary>
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};
