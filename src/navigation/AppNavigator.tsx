import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from './types';
import { DiaryListScreen } from '../screens/DiaryListScreen';
import { DiaryWriteScreen } from '../screens/DiaryWriteScreen';
import { DiaryDetailScreen } from '../screens/DiaryDetailScreen';
import { ReportScreen } from '../screens/ReportScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { NotificationScreen } from '../screens/NotificationScreen';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="DiaryList"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="DiaryList" component={DiaryListScreen} />
        <Stack.Screen name="DiaryWrite" component={DiaryWriteScreen} />
        <Stack.Screen name="DiaryDetail" component={DiaryDetailScreen} />
        <Stack.Screen name="Report" component={ReportScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Notification" component={NotificationScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
