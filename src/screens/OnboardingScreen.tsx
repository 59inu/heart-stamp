import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../constants/colors';

type OnboardingNavigationProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

interface AgreementItemProps {
  checked: boolean;
  onPress: () => void;
  required?: boolean;
  title: string;
  description?: string;
  onDetail?: () => void;
  bold?: boolean;
}

const AgreementItem: React.FC<AgreementItemProps> = ({
  checked,
  onPress,
  required,
  title,
  description,
  onDetail,
  bold,
}) => {
  return (
    <View style={styles.agreementItem}>
      <TouchableOpacity onPress={onPress} style={styles.checkboxContainer}>
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <Ionicons name="checkmark" size={18} color="#fff" />}
        </View>
        <View style={styles.agreementTextContainer}>
          <Text style={[styles.agreementTitle, bold && styles.agreementTitleBold]}>
            {required && <Text style={styles.required}>(필수) </Text>}
            {title}
          </Text>
          {description && (
            <Text style={styles.agreementDescription}>{description}</Text>
          )}
        </View>
      </TouchableOpacity>
      {onDetail && (
        <TouchableOpacity onPress={onDetail} style={styles.detailButton}>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<OnboardingNavigationProp>();
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    all: false,
  });

  const handleAllAgreement = () => {
    const newValue = !agreements.all;
    setAgreements({
      terms: newValue,
      privacy: newValue,
      all: newValue,
    });
  };

  const handleTermsToggle = () => {
    const newTerms = !agreements.terms;
    setAgreements(prev => ({
      ...prev,
      terms: newTerms,
      all: newTerms && prev.privacy,
    }));
  };

  const handlePrivacyToggle = () => {
    const newPrivacy = !agreements.privacy;
    setAgreements(prev => ({
      ...prev,
      privacy: newPrivacy,
      all: prev.terms && newPrivacy,
    }));
  };

  const handleStart = async () => {
    if (!agreements.terms || !agreements.privacy) {
      Alert.alert('동의가 필요합니다', '모든 필수 항목에 동의해주세요');
      return;
    }

    try {
      await AsyncStorage.setItem('privacyAgreement', JSON.stringify({
        agreedAt: new Date().toISOString(),
        version: '1.0',
        terms: true,
        privacy: true,
        aiDataSharing: true,
      }));

      // 메인 화면으로 이동
      navigation.replace('DiaryList');
    } catch (error) {
      console.error('동의 저장 오류:', error);
      Alert.alert('오류', '동의 정보 저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 로고 영역 */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="heart" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.appName}>Heart Stamp</Text>
          <Text style={styles.appDescription}>
            일기를 쓰면 선생님이{'\n'}
            도장을 찍어주는 감성 다이어리
          </Text>
        </View>

        {/* 약관 동의 영역 */}
        <View style={styles.agreementContainer}>
          <Text style={styles.agreementHeader}>서비스 이용을 위해 동의가 필요해요</Text>

          <AgreementItem
            checked={agreements.all}
            onPress={handleAllAgreement}
            title="모두 동의"
            bold
          />

          <View style={styles.divider} />

          <AgreementItem
            checked={agreements.terms}
            onPress={handleTermsToggle}
            required
            title="서비스 이용약관"
            onDetail={() => navigation.navigate('TermsDetail')}
          />

          <AgreementItem
            checked={agreements.privacy}
            onPress={handlePrivacyToggle}
            required
            title="개인정보 처리방침"
            description="AI 코멘트를 위해 Anthropic Claude로 일기 내용이 전송됩니다"
            onDetail={() => navigation.navigate('PrivacyDetail')}
          />
        </View>

        {/* 안내 문구 */}
        <View style={styles.noticeContainer}>
          <Text style={styles.noticeText}>
            • AI 코멘트는 Heart Stamp의 핵심 기능으로, 동의 없이는 서비스를 이용할 수 없습니다{'\n'}
            • 서비스가 맞지 않다면 언제든 앱을 삭제하실 수 있습니다
          </Text>
        </View>
      </ScrollView>

      {/* 시작하기 버튼 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.startButton,
            (!agreements.terms || !agreements.privacy) && styles.startButtonDisabled
          ]}
          onPress={handleStart}
          disabled={!agreements.terms || !agreements.privacy}
        >
          <Text style={styles.startButtonText}>시작하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF0F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  appDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  agreementContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  agreementHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  agreementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  agreementTextContainer: {
    flex: 1,
  },
  agreementTitle: {
    fontSize: 15,
    color: '#333',
  },
  agreementTitleBold: {
    fontWeight: '700',
    fontSize: 16,
  },
  required: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  agreementDescription: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
    lineHeight: 18,
  },
  detailButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  noticeContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  noticeText: {
    fontSize: 13,
    color: '#999',
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#ddd',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
