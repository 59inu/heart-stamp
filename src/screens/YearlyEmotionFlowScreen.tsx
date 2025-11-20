import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { useYearlyDiaries } from './YearlyEmotionFlowScreen/hooks/useYearlyDiaries';
import { YearlyHeatmap } from './YearlyEmotionFlowScreen/components/YearlyHeatmap';
import { YearlyLineChart } from './YearlyEmotionFlowScreen/components/YearlyLineChart';

type NavigationProp = StackNavigationProp<RootStackParamList, 'YearlyEmotionFlow'>;

type ViewMode = 'heatmap' | 'chart';

export const YearlyEmotionFlowScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { diaries, loading } = useYearlyDiaries(selectedYear);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#4B5563" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>감정 로그</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 연도 선택 & 모드 전환 */}
      <View style={styles.controlBar}>
        {/* 연도 선택 */}
        <View style={styles.yearSelector}>
          <TouchableOpacity
            style={styles.yearButton}
            onPress={() => setSelectedYear(selectedYear - 1)}
          >
            <Ionicons name="chevron-back" size={18} color="#666" />
          </TouchableOpacity>
          <Text style={styles.yearText}>{selectedYear}년</Text>
          <TouchableOpacity
            style={styles.yearButton}
            onPress={() => {
              const currentYear = new Date().getFullYear();
              if (selectedYear < currentYear) {
                setSelectedYear(selectedYear + 1);
              }
            }}
            disabled={selectedYear >= new Date().getFullYear()}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={selectedYear >= new Date().getFullYear() ? '#ccc' : '#666'}
            />
          </TouchableOpacity>
        </View>

        {/* 모드 전환 버튼 */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, viewMode === 'heatmap' && styles.modeButtonActive]}
            onPress={() => setViewMode('heatmap')}
          >
            <Ionicons name="grid" size={16} color={viewMode === 'heatmap' ? '#fff' : '#666'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, viewMode === 'chart' && styles.modeButtonActive]}
            onPress={() => setViewMode('chart')}
          >
            <Ionicons name="analytics" size={16} color={viewMode === 'chart' ? '#fff' : '#666'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 컨텐츠 영역 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#87A6D1" />
            <Text style={styles.loadingText}>데이터를 불러오는 중...</Text>
          </View>
        ) : diaries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>{selectedYear}년 일기가 없어요</Text>
            <Text style={styles.emptySubText}>일기를 작성하면 감정 흐름을 볼 수 있어요</Text>
          </View>
        ) : viewMode === 'heatmap' ? (
          <YearlyHeatmap diaries={diaries} year={selectedYear} />
        ) : (
          <YearlyLineChart diaries={diaries} year={selectedYear} />
        )}
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
    height: 56,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  headerRight: {
    width: 36,
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  yearButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  yearText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    minWidth: 70,
    textAlign: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
  },
  modeButtonActive: {
    backgroundColor: '#87A6D1',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingTop: 12,
    backgroundColor: '#f5f5f5',
    paddingBottom: 40,
  },
  placeholder: {
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  placeholderSubText: {
    fontSize: 14,
    color: '#999',
  },
  dataInfo: {
    marginTop: 16,
    fontSize: 12,
    color: '#87A6D1',
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#999',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
