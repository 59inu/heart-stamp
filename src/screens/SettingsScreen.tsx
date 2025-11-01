import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SURVEY_URL, SURVEY_BENEFIT } from '../constants/survey';
import { SurveyService } from '../services/surveyService';
import { FAQModal } from '../components/FAQModal';
import { ContactModal } from '../components/ContactModal';
import { UserGuideModal } from '../components/UserGuideModal';
import { DiaryStorage } from '../services/diaryStorage';
import { COLORS } from '../constants/colors';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(true);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [diaryCount, setDiaryCount] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [showUserGuideModal, setShowUserGuideModal] = useState(false);

  const appVersion = '1.0.0';

  // 설문조사 상태 확인
  React.useEffect(() => {
    const checkSurveyStatus = async () => {
      const completed = await SurveyService.hasCompletedSurvey();
      setSurveyCompleted(completed);

      // 초기 한 번만 실제 일기 개수로 동기화
      const diaries = await DiaryStorage.getAll();
      await SurveyService.syncDiaryCount(diaries.length);

      // 동기화된 카운트 사용
      const count = await SurveyService.getDiaryWriteCount();
      setDiaryCount(count);
    };
    checkSurveyStatus();
  }, []);

  const handlePrivacyPolicy = () => {
    // TODO: 개인정보 처리방침 페이지로 이동
    Alert.alert('개인정보 처리방침', '개인정보 처리방침 페이지가 준비 중입니다.');
  };

  const handleUserGuide = () => {
    setShowUserGuideModal(true);
  };

  const handleFeedback = () => {
    setShowContactModal(true);
  };

  const handleDataBackup = () => {
    Alert.alert('데이터 백업', '데이터 백업 기능이 준비 중입니다.');
  };

  const handleDataRestore = () => {
    Alert.alert('데이터 복원', '데이터 복원 기능이 준비 중입니다.');
  };

  const handleDataExport = () => {
    Alert.alert('일기 내보내기', '일기 내보내기 기능이 준비 중입니다.');
  };

  const handleSurvey = async () => {
    await SurveyService.markSurveyCompleted();
    setSurveyCompleted(true);
    Linking.openURL(SURVEY_URL);
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
              <Text style={styles.settingTitle}>푸시 알림</Text>
              <Text style={styles.settingDescription}>
                선생님 코멘트가 도착하면 알림을 받습니다
              </Text>
            </View>
            <Switch
              value={notificationEnabled}
              onValueChange={setNotificationEnabled}
              trackColor={{ false: '#d0d0d0', true: COLORS.secondaryLight }}
              thumbColor={notificationEnabled ? COLORS.secondary : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>일기 작성 알림</Text>
              <Text style={styles.settingDescription}>
                매일 저녁 9시에 일기 작성을 알려드립니다
              </Text>
            </View>
            <Switch
              value={dailyReminderEnabled}
              onValueChange={setDailyReminderEnabled}
              trackColor={{ false: '#d0d0d0', true: COLORS.secondaryLight }}
              thumbColor={dailyReminderEnabled ? COLORS.secondary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* 데이터 관리 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>데이터 관리</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleDataBackup}>
            <Ionicons name="cloud-upload-outline" size={24} color={COLORS.secondary} />
            <Text style={styles.menuItemText}>데이터 백업</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>준비중</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleDataRestore}>
            <Ionicons name="cloud-download-outline" size={24} color={COLORS.secondary} />
            <Text style={styles.menuItemText}>데이터 복원</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>준비중</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleDataExport}>
            <Ionicons name="document-text-outline" size={24} color={COLORS.secondary} />
            <Text style={styles.menuItemText}>일기 내보내기</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>준비중</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* 설문조사 - 3회 이상 일기 작성자만 표시 */}
        {diaryCount >= 3 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>설문조사</Text>

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
                  {!surveyCompleted && <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>}
                </View>
                <Text style={styles.surveyDescription}>
                  🎁 {SURVEY_BENEFIT.title}
                </Text>
                {surveyCompleted && (
                  <Text style={styles.completedText}>✓ 참여 완료</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        )}

        {/* 정보 및 지원 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>정보 및 지원</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleUserGuide}>
            <Ionicons name="book-outline" size={24} color={COLORS.secondary} />
            <Text style={styles.menuItemText}>사용 가이드</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleFeedback}>
            <Ionicons name="help-circle-outline" size={24} color={COLORS.secondary} />
            <Text style={styles.menuItemText}>FAQ / 문의하기</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handlePrivacyPolicy}>
            <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.secondary} />
            <Text style={styles.menuItemText}>개인정보 처리방침</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>준비중</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <Ionicons name="information-circle-outline" size={24} color={COLORS.secondary} />
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
    backgroundColor: COLORS.secondary,
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
});
