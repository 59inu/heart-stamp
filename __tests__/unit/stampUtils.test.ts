/**
 * Stamp utilities 테스트
 *
 * 목적: 도장 레이블 매핑 로직 검증
 */

import { getStampLabel } from '../../src/utils/stampUtils';
import type { StampType } from '../../src/models/DiaryEntry';

describe('stampUtils - getStampLabel', () => {
  it('should return correct label for "excellent"', () => {
    const result = getStampLabel('excellent');
    expect(result).toBe('최고예요');
  });

  it('should return correct label for "good"', () => {
    const result = getStampLabel('good');
    expect(result).toBe('잘했어요');
  });

  it('should return correct label for "nice"', () => {
    const result = getStampLabel('nice');
    expect(result).toBe('좋아요');
  });

  it('should return correct label for "keep_going"', () => {
    const result = getStampLabel('keep_going');
    expect(result).toBe('힘내요');
  });

  it('should return empty string for invalid stamp type', () => {
    const result = getStampLabel('invalid' as StampType);
    expect(result).toBe('');
  });

  it('should handle all valid stamp types', () => {
    const validTypes: StampType[] = ['excellent', 'good', 'nice', 'keep_going'];

    validTypes.forEach((type) => {
      const result = getStampLabel(type);
      expect(result).toBeTruthy(); // 모든 유효한 타입은 빈 문자열이 아니어야 함
      expect(typeof result).toBe('string');
    });
  });

  it('should return unique labels for each stamp type', () => {
    const labels = new Set<string>();
    const types: StampType[] = ['excellent', 'good', 'nice', 'keep_going'];

    types.forEach((type) => {
      const label = getStampLabel(type);
      labels.add(label);
    });

    // 모든 레이블이 고유해야 함
    expect(labels.size).toBe(types.length);
  });
});
