import { EventEmitter } from 'events';

class DiaryEventEmitter extends EventEmitter {}

export const diaryEvents = new DiaryEventEmitter();

// 이벤트 타입 정의
export const EVENTS = {
  DIARY_UPDATED: 'diary_updated',
  AI_COMMENT_RECEIVED: 'ai_comment_received',
} as const;
