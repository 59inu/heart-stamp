import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  visible,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>개인정보 처리방침</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.subtitle}>시행일: 2025년 11월 1일</Text>
            <Text style={styles.subtitle}>담당자: Heart Stamp 운영팀</Text>
            <Text style={styles.subtitle}>
              문의: <Text style={styles.link}>heartstampdiary@gmail.com</Text>
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. 수집 항목</Text>
            <Text style={styles.text}>• 이메일, 닉네임(선택), 비밀번호</Text>
            <Text style={styles.text}>• 기기 정보(OS, 앱 버전 등), 접속 기록</Text>
            <Text style={styles.text}>• 사용자가 작성한 일기, 기분, 날씨 정보</Text>
            <Text style={styles.text}>
              • AI 코멘트 및 리포트 생성을 위한 텍스트 데이터(익명 처리)
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. 이용 목적</Text>
            <Text style={styles.text}>• 일기 기록 및 감정 리포트 제공</Text>
            <Text style={styles.text}>• AI 코멘트 생성 및 개인 맞춤 피드백</Text>
            <Text style={styles.text}>• 서비스 개선과 오류 대응</Text>
            <Text style={styles.text}>• 고객 문의 응대 및 공지 전달</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. 보유 및 파기</Text>
            <Text style={styles.text}>• 회원 탈퇴 시 또는 목적 달성 시 즉시 삭제</Text>
            <Text style={styles.text}>• 법령에 따라 일부 기록은 일정 기간 보관</Text>
            <Text style={styles.indentedText}>
              (예: 통신기록 3개월, 결제기록 5년)
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. 제3자 제공 및 위탁</Text>
            <Text style={styles.text}>
              • 개인정보를 외부에 판매하거나 임의 제공하지 않습니다.
            </Text>
            <Text style={styles.text}>
              • AI 분석 및 서버 운영에 필요한 데이터는 익명 처리 후 사용됩니다.
            </Text>
            <Text style={styles.text}>
              • 클라우드 인프라(AWS, Firebase 등)에 위탁 시 안전하게 관리됩니다.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. 이용자 권리</Text>
            <Text style={styles.text}>• 내 정보 열람, 수정, 삭제, 탈퇴 가능</Text>
            <Text style={styles.text}>
              • 문의: <Text style={styles.link}>heartstampdiary@gmail.com</Text>
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. 보호 조치</Text>
            <Text style={styles.text}>• SSL 암호화 통신 적용</Text>
            <Text style={styles.text}>• 비밀번호 암호화 저장</Text>
            <Text style={styles.text}>• 접근 권한 최소화 및 정기 보안 점검</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. 아동 보호</Text>
            <Text style={styles.text}>
              • 만 14세 미만 아동의 개인정보를 수집하지 않습니다.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. 변경 안내</Text>
            <Text style={styles.text}>
              • 정책 변경 시 앱 공지 또는 이메일로 최소 7일 전 안내합니다.
            </Text>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>
    </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  link: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 6,
  },
  indentedText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 6,
    marginLeft: 16,
  },
  bottomSpacing: {
    height: 80,
  },
});
