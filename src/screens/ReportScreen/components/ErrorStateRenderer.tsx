import React from 'react';
import { EmptyStateCard } from './EmptyStateCard';
import { GenerateReportCard } from './GenerateReportCard';
import { NoDiariesCard } from './NoDiariesCard';

type ReportPeriod = 'week' | 'month';

interface ErrorStateRendererProps {
  error: string | null;
  canGenerate: boolean;
  diaryCount: number | undefined;
  period: ReportPeriod;
  isGenerating: boolean;
  onGenerate: () => void;
}

export const ErrorStateRenderer: React.FC<ErrorStateRendererProps> = ({
  error,
  canGenerate,
  diaryCount,
  period,
  isGenerating,
  onGenerate,
}) => {
  if (error === 'not_completed') {
    return <EmptyStateCard error={error} period={period} />;
  }

  // 리포트 생성 가능한 경우
  if (canGenerate && error === 'Report not found') {
    return (
      <GenerateReportCard
        period={period}
        diaryCount={diaryCount || 0}
        isGenerating={isGenerating}
        onGenerate={onGenerate}
      />
    );
  }

  // 일기 부족
  if (error && (error.includes('No diaries found') || error === 'Report not found')) {
    // 0개일 때 특별 메시지
    if (diaryCount === 0) {
      return <NoDiariesCard />;
    }

    // 1개 이상일 때는 생성 가능
    return (
      <GenerateReportCard
        period={period}
        diaryCount={diaryCount || 0}
        isGenerating={isGenerating}
        onGenerate={onGenerate}
      />
    );
  }

  // "Week not completed yet" 처리
  if (error && error.includes('not completed yet')) {
    return <EmptyStateCard error={error} period={period} />;
  }

  if (error) {
    return <EmptyStateCard error={error} period={period} />;
  }

  return null;
};
