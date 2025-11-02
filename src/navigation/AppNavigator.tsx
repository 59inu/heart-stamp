import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from './types';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { TermsDetailScreen } from '../screens/TermsDetailScreen';
import { PrivacyDetailScreen } from '../screens/PrivacyDetailScreen';
import { DiaryListScreen } from '../screens/DiaryListScreen';
import { DiaryWriteScreen } from '../screens/DiaryWriteScreen';
import { DiaryDetailScreen } from '../screens/DiaryDetailScreen';
import { ReportScreen } from '../screens/ReportScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { COLORS } from '../constants/colors';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAgreed, setHasAgreed] = useState(false);

  useEffect(() => {
    const checkAgreement = async () => {
      try {
        const agreement = await AsyncStorage.getItem('privacyAgreement');
        setHasAgreed(!!agreement);
      } catch (error) {
        console.error('약관 동의 확인 오류:', error);
        setHasAgreed(false);
      } finally {
        setIsLoading(false);
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

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={hasAgreed ? 'DiaryList' : 'Onboarding'}
        screenOptions={{
          headerShown: false,
        }}
      >
        {!hasAgreed && (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="TermsDetail" component={TermsDetailScreen} />
            <Stack.Screen name="PrivacyDetail" component={PrivacyDetailScreen} />
          </>
        )}
        <Stack.Screen name="DiaryList" component={DiaryListScreen} />
        <Stack.Screen name="DiaryWrite" component={DiaryWriteScreen} />
        <Stack.Screen name="DiaryDetail" component={DiaryDetailScreen} />
        <Stack.Screen name="Report" component={ReportScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        {hasAgreed && (
          <>
            <Stack.Screen name="TermsDetail" component={TermsDetailScreen} />
            <Stack.Screen name="PrivacyDetail" component={PrivacyDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
