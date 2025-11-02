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

interface NoticeModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NoticeModal: React.FC<NoticeModalProps> = ({
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
          <Text style={styles.headerTitle}>공지사항</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 최신 공지사항 */}
          <View style={styles.noticeItem}>
            <View style={styles.noticeBadge}>
              <Text style={styles.noticeBadgeText}>NEW</Text>
            </View>
            <Text style={styles.noticeDate}>2025.11.02</Text>
            <Text style={styles.noticeTitle}>Heart Stamp 정식 출시 안내</Text>
            <Text style={styles.noticeContent}>
              안녕하세요, Heart Stamp 팀입니다.{'\n\n'}
              일기를 쓰면 선생님이 도장을 찍어주는 감성 다이어리 앱, Heart Stamp가 정식 출시되었습니다!{'\n\n'}

              <Text style={styles.bold}>주요 기능:</Text>{'\n'}
              • 하루 한 번, 일기 작성{'\n'}
              • AI 선생님의 따뜻한 코멘트와 도장{'\n'}
              • 기분에 따른 감정 메시지{'\n'}
              • 매월 감정 리포트{'\n\n'}

              여러분의 하루를 소중히 기록하고, 선생님의 격려를 받아보세요.{'\n'}
              감사합니다.
            </Text>
          </View>

          {/* 이전 공지사항 예시 */}
          <View style={styles.noticeItem}>
            <Text style={styles.noticeDate}>2025.11.01</Text>
            <Text style={styles.noticeTitle}>베타 테스트 종료 안내</Text>
            <Text style={styles.noticeContent}>
              베타 테스트에 참여해주신 모든 분들께 감사드립니다.{'\n\n'}
              소중한 피드백을 바탕으로 앱을 개선하여 정식 버전으로 출시하게 되었습니다.{'\n\n'}
              베타 테스트 기간 동안 작성하신 일기는 모두 유지됩니다.
            </Text>
          </View>

          <View style={styles.noticeItem}>
            <Text style={styles.noticeDate}>2025.10.25</Text>
            <Text style={styles.noticeTitle}>서비스 이용 안내</Text>
            <Text style={styles.noticeContent}>
              <Text style={styles.bold}>일기 작성 시간</Text>{'\n'}
              • 하루에 한 번, 언제든지 작성 가능합니다{'\n'}
              • 이전 날짜의 일기는 작성할 수 없습니다{'\n\n'}

              <Text style={styles.bold}>AI 코멘트</Text>{'\n'}
              • 매일 새벽 3시에 전날 일기에 코멘트가 달립니다{'\n'}
              • 오전 8시 30분에 푸시 알림으로 알려드립니다{'\n\n'}

              <Text style={styles.bold}>문의사항</Text>{'\n'}
              설정 {'>'} FAQ / 문의하기에서 언제든지 문의 주세요!
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
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  noticeItem: {
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  noticeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF5722',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  noticeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  noticeDate: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    lineHeight: 24,
  },
  noticeContent: {
    fontSize: 15,
    color: '#666',
    lineHeight: 24,
  },
  bold: {
    fontWeight: '600',
    color: '#333',
  },
  bottomSpacing: {
    height: 40,
  },
});
