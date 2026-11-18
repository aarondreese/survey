// Type definitions for CompletedJSON v1

export interface AddedQuestionSetInstance {
  uuid: string;
  questionSetHeaderId?: number;
  origin?: 'manual' | 'meta';
  insertAt?: { pageId?: string; panelName?: string; index?: number };
  answers?: Record<string, any>;
  createdAt?: string; // ISO timestamp
  createdBy?: string;
}

export interface MetaChoiceEntry {
  metaQuestionHeaderId: number | string;
  selectedAnswerId: number | string;
  insertedQuestionSetUUIDs: string[];
}

export interface CompletedJsonV1 {
  version: 1;
  snapshot: Record<string, any>; // The full SurveyJS runtime model at completion
  additions?: AddedQuestionSetInstance[];
  metaChoices?: MetaChoiceEntry[];
  answers?: Record<string, any>; // optional flat map for queries
  actions?: Array<Record<string, any>>; // optional event log
  audit?: Array<Record<string, any>>; // optional audit entries
}

export type CompletedJson = CompletedJsonV1;
