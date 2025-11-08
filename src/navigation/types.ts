import { BSON } from 'realm';

export type RootStackParamList = {
  Onboarding: undefined;
  TermsDetail: undefined;
  PrivacyDetail: undefined;
  DiaryList: undefined;
  DiaryWrite: { entryId?: string; date?: Date };
  DiaryDetail: { entryId: string };
  Report: undefined;
  Settings: undefined;
  StampCollection: { year: number; month: number };
};
