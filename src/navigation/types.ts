import { BSON } from 'realm';

export type RootStackParamList = {
  DiaryList: undefined;
  DiaryWrite: { entryId?: string; date?: Date };
  DiaryDetail: { entryId: string };
};
