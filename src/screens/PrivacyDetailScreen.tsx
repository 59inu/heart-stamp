import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export const PrivacyDetailScreen: React.FC = () => {
  const navigation = useNavigation();

  const openAnthropicPrivacy = () => {
    Linking.openURL('https://www.anthropic.com/legal/privacy');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>개인정보 처리방침</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.updateDate}>시행일: 2025년 11월 2일</Text>

        <Text style={styles.intro}>
          Heart Stamp(이하 "서비스")는 이용자의 개인정보를 소중히 여기며, 개인정보 보호법 등 관련 법령을 준수합니다.
        </Text>

        <Text style={styles.sectionTitle}>1. 수집하는 개인정보 항목</Text>
        <Text style={styles.text}>
          서비스는 다음의 개인정보를 수집합니다:{'\n\n'}
          • 일기 내용 및 작성 날짜{'\n'}
          • 감정 정보 (기분, 감정 태그){'\n'}
          • 날씨 정보{'\n'}
          • 사진 (선택사항){'\n'}
          • 기기 정보 (디바이스 ID, OS 버전, 앱 버전){'\n'}
          • 푸시 알림 토큰 (알림 수신 동의 시)
        </Text>

        <Text style={styles.sectionTitle}>2. 개인정보의 수집 및 이용 목적</Text>
        <Text style={styles.text}>
          수집한 개인정보는 다음의 목적으로만 이용됩니다:{'\n\n'}
          • 일기 작성, 저장 및 조회 서비스 제공{'\n'}
          • AI 기반 일기 코멘트 생성{'\n'}
          • 감정 분석 및 주간 리포트 제공{'\n'}
          • 푸시 알림 발송{'\n'}
          • 서비스 개선 및 통계 분석{'\n'}
          • 고객 문의 응대
        </Text>

        <Text style={styles.sectionTitle}>3. 개인정보의 제3자 제공</Text>
        <Text style={styles.text}>
          서비스는 AI 코멘트 생성을 위해 다음과 같이 개인정보를 제3자에게 제공합니다.
        </Text>

        <View style={styles.highlightBox}>
          <Text style={styles.highlightTitle}>Anthropic PBC (Claude API)</Text>
          <Text style={styles.highlightText}>
            • 제공받는 자: Anthropic PBC (미국){'\n'}
            • 제공 목적: AI 기반 일기 코멘트 및 감정 분석{'\n'}
            • 제공 항목: 일기 내용, 작성 날짜, 감정 정보{'\n'}
            • 보유 및 이용기간:{'\n'}
              - Anthropic은 API를 통해 전송된 데이터를 모델 학습에 사용하지 않습니다{'\n'}
              - Trust & Safety 목적으로 최대 90일 보관 후 자동 삭제됩니다{'\n'}
              - 자세한 내용:
          </Text>
          <TouchableOpacity onPress={openAnthropicPrivacy}>
            <Text style={styles.link}>https://www.anthropic.com/legal/privacy</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.importantText}>
          ※ 본 제3자 제공에 동의하지 않을 경우, Heart Stamp의 AI 코멘트 기능을 이용할 수 없습니다. AI 코멘트는 서비스의 핵심 기능이므로, 동의 없이는 서비스를 이용하실 수 없습니다.
        </Text>

        <Text style={styles.sectionTitle}>4. 개인정보의 보유 및 이용기간</Text>
        <Text style={styles.text}>
          • 서비스 이용 중: 이용자가 앱을 삭제할 때까지{'\n'}
          • 앱 삭제 시: 디바이스 내 모든 데이터 즉시 삭제{'\n'}
          • 서버 데이터: 백업 목적으로 30일 보관 후 자동 삭제{'\n'}
          • Anthropic 전송 데이터: 처리 완료 후 최대 90일 보관 후 삭제
        </Text>

        <Text style={styles.sectionTitle}>5. 개인정보의 파기 절차 및 방법</Text>
        <Text style={styles.text}>
          • 앱 삭제 시 모든 로컬 데이터가 즉시 삭제됩니다{'\n'}
          • 서버에 저장된 데이터는 이용자의 요청 시 즉시 삭제 가능합니다{'\n'}
          • 삭제 요청: 설정 &gt; 문의하기를 통해 연락해주세요{'\n'}
          • 파기 방법: 복구 불가능한 방법으로 영구 삭제
        </Text>

        <Text style={styles.sectionTitle}>6. 개인정보의 암호화</Text>
        <Text style={styles.text}>
          • 일기 원문은 암호화되어 저장됩니다{'\n'}
          • 서버 관리자를 포함한 어떤 운영자도 암호화된 일기를 열람할 수 없습니다{'\n'}
          • 통신 구간은 HTTPS로 암호화됩니다
        </Text>

        <Text style={styles.sectionTitle}>7. 이용자의 권리</Text>
        <Text style={styles.text}>
          이용자는 다음의 권리를 행사할 수 있습니다:{'\n\n'}
          • 개인정보 열람 요구{'\n'}
          • 개인정보 정정 요구{'\n'}
          • 개인정보 삭제 요구{'\n'}
          • 개인정보 처리 정지 요구{'\n\n'}
          권리 행사 방법: 설정 &gt; 문의하기 또는 아래 연락처로 문의
        </Text>

        <Text style={styles.sectionTitle}>8. 개인정보 보호책임자</Text>
        <Text style={styles.text}>
          서비스는 이용자의 개인정보를 보호하고 개인정보와 관련된 불만을 처리하기 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.{'\n\n'}
          • 담당자: Heart Stamp 팀{'\n'}
          • 연락처: 설정 &gt; 문의하기 (구글폼)
        </Text>

        <Text style={styles.sectionTitle}>9. 개인정보 처리방침의 변경</Text>
        <Text style={styles.text}>
          본 개인정보 처리방침은 법령, 정책 또는 보안기술의 변경에 따라 내용의 추가, 삭제 및 수정이 있을 시에는 변경사항 시행일의 최소 7일 전부터 앱 내 공지사항을 통해 고지할 것입니다.
        </Text>

        <Text style={styles.sectionTitle}>10. 아동의 개인정보 보호</Text>
        <Text style={styles.text}>
          서비스는 만 14세 미만 아동의 개인정보를 수집하지 않습니다. 만 14세 미만 아동이 서비스를 이용하려면 법정대리인의 동의가 필요합니다.
        </Text>

        <Text style={styles.sectionTitle}>부칙</Text>
        <Text style={styles.text}>
          본 개인정보 처리방침은 2025년 11월 2일부터 시행됩니다.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            개인정보 처리와 관련하여 문의사항이 있으시면{'\n'}
            설정 &gt; 문의하기를 통해 연락해주세요.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  updateDate: {
    fontSize: 13,
    color: '#999',
    marginBottom: 16,
    textAlign: 'right',
  },
  intro: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
    marginBottom: 24,
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
  },
  highlightBox: {
    backgroundColor: '#F0F6FF',
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  highlightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  highlightText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
  },
  link: {
    fontSize: 13,
    color: COLORS.primary,
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  importantText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#d32f2f',
    backgroundColor: '#fff3f3',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#d32f2f',
    marginTop: 8,
  },
  footer: {
    marginTop: 40,
    marginBottom: 40,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
