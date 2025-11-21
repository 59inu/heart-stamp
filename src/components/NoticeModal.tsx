import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NoticeModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NoticeModal: React.FC<NoticeModalProps> = ({ visible, onClose }) => {
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
          {/* 1.1.0 업데이트 안내 (최신 공지) */}
          <View style={styles.noticeItem}>
            <View style={styles.noticeBadge}>
              <Text style={styles.noticeBadgeText}>NEW</Text>
            </View>
            <Text style={styles.noticeDate}>2025.11.21</Text>
            <Text style={styles.noticeTitle}>📌 What's New — Version 1.1.0</Text>
            <Text style={styles.noticeContent}>
              ✏️ <Text style={styles.bold}>크레용으로 그려주는 그림 일기 기능이 생겼어요</Text>
              {'\n'}일기 속 순간을 그림으로 다시 만나보세요!{'\n'}
              <Text style={styles.privacyNote}>
                ※ 일기 원문 전체가 아닌, 한 장면만 추출되어 그림이 생성되며, 개인정보 보호를 위해 추상적으로 표현됩니다
              </Text>
              {'\n\n'}
              🖼️ <Text style={styles.bold}>마음에 드는 일기를 이미지로 저장하거나 공유할 수 있어요</Text>
              {'\n'}나만의 기록을 예쁘게 간직하세요{'\n\n'}
              🌈 <Text style={styles.bold}>1년 감정 로그를 색으로 확인해보세요</Text>
              {'\n'}올 한 해의 마음을 한 눈에!{'\n\n'}
              💌 <Text style={styles.bold}>선생님 편지가 도착할지도 몰라요</Text>
              {'\n'}일기를 꾸준히 쓰는 당신께 작은 선물처럼{'\n\n'}
              🔧 <Text style={styles.bold}>그 외 버그 수정 및 안정화가 함께 진행되었어요</Text>
            </Text>
          </View>

          {/* 1.0.0 출시 안내 (이전 공지) */}
          <View style={styles.noticeItem}>
            <Text style={styles.noticeDate}>2025.11.02</Text>
            <Text style={styles.noticeTitle}>Heart Stamp 출시 안내</Text>
            <Text style={styles.noticeContent}>
              안녕하세요, Heart Stamp 팀입니다.{'\n\n'}
              일기를 쓰면 선생님이 도장을 찍어주는 감성 다이어리 앱, Heart Stamp를 찾아주셔서
              감사합니다!{'\n\n'}
              <Text style={styles.bold}>주요 기능:</Text>
              {'\n'}• 하루 한 번, 일기 작성{'\n'}• 기분에 따른 감정 메시지{'\n'}• AI 선생님의 따뜻한
              코멘트와 도장{'\n'}• 주간/월간 감정 리포트{'\n\n'}
              여러분의 하루를 소중히 기록하고, 선생님의 격려를 받아보세요.{'\n'}
              감사합니다.
            </Text>
          </View>

          {/* 서비스 이용 안내 (기존 공지) */}
          <View style={styles.noticeItem}>
            <Text style={styles.noticeDate}>2025.11.02</Text>
            <Text style={styles.noticeTitle}>서비스 이용 안내</Text>
            <Text style={styles.noticeContent}>
              <Text style={styles.bold}>일기 작성</Text>
              {'\n'}• 하루에 한 번, 언제든지 작성 가능합니다{'\n'}• 오늘 날짜의 일기만 선생님의
              코멘트를 받을 수 있습니다{'\n\n'}
              <Text style={styles.bold}>AI 코멘트</Text>
              {'\n'}• 매일 새벽 3시에 전날 일기에 코멘트가 달립니다{'\n'}• 오전 8시 30분에 푸시
              알림으로 알려드립니다{'\n'}• 일기를 작성한 다음 날 아침에 확인하실 수 있습니다{'\n'}•
              Anthropic Claude API를 사용하여 따뜻하고 섬세한 코멘트를 생성합니다{'\n\n'}
              <Text style={styles.bold}>개인정보 보호</Text>
              {'\n'}• 일기 원문은 암호화되어 저장됩니다{'\n'}• AI 코멘트 생성을 위해 Anthropic
              Claude API로 일기가 전송됩니다{'\n'}• 전송된 데이터는 AI 학습에 사용되지 않으며, Trust
              & Safety 목적으로 최대 90일 보관 후 자동 삭제됩니다{'\n'}• 자세한 내용은 설정{' '}
              {'>'} 개인정보 처리방침을 확인해주세요{'\n\n'}
              <Text style={styles.bold}>문의사항</Text>
              {'\n'}
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
  privacyNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  bottomSpacing: {
    height: 40,
  },
});
