import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { SURVEY_URL, SURVEY_BENEFIT } from '../constants/survey';
import { SurveyService } from '../services/surveyService';
import { FAQModal } from '../components/FAQModal';
import { ContactModal } from '../components/ContactModal';
import { UserGuideModal } from '../components/UserGuideModal';
import { NoticeModal } from '../components/NoticeModal';
import { DiaryStorage } from '../services/diaryStorage';
import { NotificationService } from '../services/notificationService';
import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../constants/colors';
import { logger } from '../utils/logger';
import { AnalyticsService } from '../services/analyticsService';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(true);
  const [hasPushPermission, setHasPushPermission] = useState(true);
  const [diaryCount, setDiaryCount] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [showUserGuideModal, setShowUserGuideModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  const appVersion = '1.0.0';

  // 일기 개수 확인
  React.useEffect(() => {
    const loadDiaryCount = async () => {
      // 초기 한 번만 실제 일기 개수로 동기화
      const diaries = await DiaryStorage.getAll();
      await SurveyService.syncDiaryCount(diaries.length);

      // 동기화된 카운트 사용
      const count = await SurveyService.getDiaryWriteCount();
      setDiaryCount(count);
    };
    loadDiaryCount();
  }, []);

  // 알림 설정 불러오기
  useFocusEffect(
    React.useCallback(() => {
      const loadNotificationSettings = async () => {
        try {
          // 푸시 권한 체크
          const pushPermission = await NotificationService.checkPushPermission();
          setHasPushPermission(pushPermission);

          const dailyReminderSetting = await NotificationService.getDailyReminderEnabled();
          setDailyReminderEnabled(dailyReminderSetting);

          const teacherCommentSetting = await NotificationService.getTeacherCommentNotificationEnabled();
          setNotificationEnabled(teacherCommentSetting);
        } catch (error) {
          logger.error('Failed to load notification settings:', error);
        }
      };
      loadNotificationSettings();
    }, [])
  );

  const handleNotice = () => {
    setShowNoticeModal(true);
  };

  const handleTerms = async () => {
    await WebBrowser.openBrowserAsync('https://heartstamp.kr/terms?embedded=true');
  };

  const handlePrivacyPolicy = async () => {
    await WebBrowser.openBrowserAsync('https://heartstamp.kr/privacy?embedded=true');
  };

  const handleUserGuide = () => {
    setShowUserGuideModal(true);
  };

  const handleFeedback = () => {
    setShowContactModal(true);
  };

  const handleDataRestore = () => {
    Toast.show({
      type: 'info',
      text1: '데이터 복원',
      text2: '데이터 복원 기능이 준비 중입니다',
      position: 'bottom',
      visibilityTime: 2000,
    });
  };

  const handleDataExport = () => {
    Toast.show({
      type: 'info',
      text1: '일기 내보내기',
      text2: '일기 내보내기 기능이 준비 중입니다',
      position: 'bottom',
      visibilityTime: 2000,
    });
  };

  const handleTeacherCommentNotificationToggle = async (value: boolean) => {
    const previousState = notificationEnabled;

    try {
      // 일단 낙관적 업데이트
      setNotificationEnabled(value);

      // 켜려고 할 때
      if (value) {
        logger.log('🔔 [Settings] Enabling teacher comment notification...');

        // 알림 활성화 시도 (내부에서 권한 요청)
        const result = await NotificationService.setTeacherCommentNotificationEnabled(true);

        // 권한 상태 다시 체크
        const newPermission = await NotificationService.checkPushPermission();
        logger.log('🔔 [Settings] Permission check result:', newPermission);
        setHasPushPermission(newPermission);

        if (!newPermission) {
          // 권한 없으면 설정으로 안내
          setNotificationEnabled(false);
          handleOpenSettings();
          return;
        }

        // Analytics: 알림 설정 토글 (이탈 위험 신호 감지)
        await AnalyticsService.logNotificationToggle('teacher_comment', true, previousState);
        await AnalyticsService.updateNotificationSettings(true, dailyReminderEnabled);

        Toast.show({
          type: 'success',
          text1: '알림 설정 완료',
          text2: '선생님 코멘트가 도착하면 오전에 알림을 받습니다',
          position: 'bottom',
          visibilityTime: 3000,
        });
      } else {
        // 끄기
        await NotificationService.setTeacherCommentNotificationEnabled(false);

        // Analytics
        await AnalyticsService.logNotificationToggle('teacher_comment', false, previousState);
        await AnalyticsService.updateNotificationSettings(false, dailyReminderEnabled);

        Toast.show({
          type: 'info',
          text1: '알림 끄기 완료',
          text2: '선생님 코멘트 알림을 더 이상 받지 않습니다',
          position: 'bottom',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      logger.error('Failed to toggle teacher comment notification:', error);
      // 실패 시 원래 상태로 복구
      setNotificationEnabled(previousState);
      Alert.alert(
        '알림 설정 실패',
        '알림 설정 중 오류가 발생했습니다. 다시 시도해주세요.'
      );
    }
  };

  const handleDailyReminderToggle = async (value: boolean) => {
    const previousState = dailyReminderEnabled;
    try {
      setDailyReminderEnabled(value);
      await NotificationService.setDailyReminderEnabled(value);

      // Analytics: 알림 설정 토글
      await AnalyticsService.logNotificationToggle('daily_reminder', value, previousState);
      await AnalyticsService.updateNotificationSettings(notificationEnabled, value);

      if (value) {
        Toast.show({
          type: 'success',
          text1: '알림 설정 완료',
          text2: '매일 저녁 9시에 일기 작성 알림을 받습니다',
          position: 'bottom',
          visibilityTime: 3000,
        });
      } else {
        Toast.show({
          type: 'info',
          text1: '알림 끄기 완료',
          text2: '일기 작성 알림을 더 이상 받지 않습니다',
          position: 'bottom',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      logger.error('Failed to toggle daily reminder:', error);
      // 실패 시 원래 상태로 복구
      setDailyReminderEnabled(!value);
      Alert.alert(
        '알림 설정 실패',
        '알림 설정 중 오류가 발생했습니다. 다시 시도해주세요.'
      );
    }
  };

  const handleSurvey = async () => {
    await WebBrowser.openBrowserAsync(SURVEY_URL);
  };

  const handleOpenSettings = () => {
    Alert.alert(
      '알림 권한 필요',
      '알림을 받으려면 설정에서 알림 권한을 허용해주세요.',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '설정으로 이동',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>설정</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 알림 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>선생님 코멘트 알림</Text>
              <Text style={styles.settingDescription}>
                선생님 코멘트가 도착하면 오전에 알림을 받습니다
              </Text>
            </View>
            <Switch
              value={notificationEnabled}
              onValueChange={handleTeacherCommentNotificationToggle}
              trackColor={{ false: '#d0d0d0', true: COLORS.settingsIconColor }}
              thumbColor={notificationEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>

          {/* 권한 없을 때 안내 문구 */}
          {!hasPushPermission && (
            <TouchableOpacity
              style={styles.permissionWarning}
              onPress={handleOpenSettings}
              activeOpacity={0.7}
            >
              <Ionicons name="alert-circle" size={18} color="#FF9800" />
              <Text style={styles.permissionWarningText}>
                알림 권한이 필요합니다. 탭하여 설정으로 이동
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#FF9800" />
            </TouchableOpacity>
          )}

          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>일기 작성 알림</Text>
              <Text style={styles.settingDescription}>
                매일 저녁 9시에 일기 작성을 알려드립니다
              </Text>
            </View>
            <Switch
              value={dailyReminderEnabled}
              onValueChange={handleDailyReminderToggle}
              trackColor={{ false: '#d0d0d0', true: COLORS.settingsIconColor }}
              thumbColor={dailyReminderEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* 데이터 관리 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>데이터 관리</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleDataRestore}>
            <Ionicons name="cloud-download-outline" size={24} color={COLORS.settingsIconColor} />
            <Text style={styles.menuItemText}>데이터 복원</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>준비중</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleDataExport}>
            <Ionicons name="document-text-outline" size={24} color={COLORS.settingsIconColor} />
            <Text style={styles.menuItemText}>일기 내보내기</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>준비중</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* 설문조사 배너 - 5회 이상 일기 작성자에게 표시 */}
        {diaryCount >= 5 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.menuItem, styles.surveyItem]}
              onPress={handleSurvey}
            >
              <View style={styles.surveyIconContainer}>
                <Ionicons name="clipboard-outline" size={24} color="#fff" />
              </View>
              <View style={styles.surveyTextContainer}>
                <View style={styles.surveyTitleRow}>
                  <Text style={styles.surveyTitle}>사용자 설문조사 참여하기</Text>
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                </View>
                <Text style={styles.surveyDescription}>
                  🎁 {SURVEY_BENEFIT.title}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        )}

        {/* 정보 및 지원 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>정보 및 지원</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleNotice}>
            <Ionicons name="megaphone-outline" size={24} color={COLORS.settingsIconColor} />
            <Text style={styles.menuItemText}>공지사항</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleUserGuide}>
            <Ionicons name="book-outline" size={24} color={COLORS.settingsIconColor} />
            <Text style={styles.menuItemText}>사용 가이드</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleFeedback}>
            <Ionicons name="help-circle-outline" size={24} color={COLORS.settingsIconColor} />
            <Text style={styles.menuItemText}>FAQ / 문의하기</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleTerms}>
            <Ionicons name="document-text-outline" size={24} color={COLORS.settingsIconColor} />
            <Text style={styles.menuItemText}>서비스 이용약관</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handlePrivacyPolicy}>
            <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.settingsIconColor} />
            <Text style={styles.menuItemText}>개인정보 처리방침</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <Ionicons name="information-circle-outline" size={24} color={COLORS.settingsIconColor} />
            <Text style={styles.menuItemText}>앱 버전</Text>
            <Text style={styles.versionText}>{appVersion}</Text>
          </View>
        </View>

        {/* 하단 여백 */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* 문의하기 모달 */}
      <ContactModal
        visible={showContactModal}
        onClose={() => setShowContactModal(false)}
        onFAQ={() => setShowFAQModal(true)}
      />

      {/* FAQ 모달 */}
      <FAQModal
        visible={showFAQModal}
        onClose={() => setShowFAQModal(false)}
      />

      {/* 사용 가이드 모달 */}
      <UserGuideModal
        visible={showUserGuideModal}
        onClose={() => setShowUserGuideModal(false)}
        hideStartButton={true}
      />

      {/* 공지사항 모달 */}
      <NoticeModal
        visible={showNoticeModal}
        onClose={() => setShowNoticeModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 16,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
  },
  surveyItem: {
    backgroundColor: '#fffaed',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderBottomWidth: 0,
  },
  surveyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.buttonSecondaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  surveyTextContainer: {
    flex: 1,
  },
  surveyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  surveyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  newBadge: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  surveyDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 4,
  },
  completedText: {
    fontSize: 13,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  comingSoonBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
  },
  bottomSpacing: {
    height: 40,
  },
  permissionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: -1,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  permissionWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#F57C00',
    marginLeft: 8,
    fontWeight: '500',
  },
});
