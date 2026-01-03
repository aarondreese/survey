// Meta-question related types
// Based on actual database schema

export interface MetaQuestionHeader {
  id: number;
  description?: string;
  rowstamp?: Buffer;
}

export interface MetaQuestionAnswer {
  id: number;
  metaQuestionHeaderId: number;
  questionSetHeaderId: number;
  isActive: boolean;
  rowstamp?: Buffer;
  // Enriched data from joins
  questionSetName?: string;
  questionSetDescription?: string;
}

export interface MetaQuestionWithAnswers extends MetaQuestionHeader {
  answers: MetaQuestionAnswer[];
}

export interface CreateMetaQuestionRequest {
  description?: string;
}

export interface UpdateMetaQuestionRequest extends Partial<CreateMetaQuestionRequest> {
  id: number;
}

export interface CreateMetaAnswerRequest {
  metaQuestionHeaderId: number;
  questionSetHeaderId: number;
  isActive?: boolean;
}

export interface UpdateMetaAnswerRequest extends Partial<CreateMetaAnswerRequest> {
  id: number;
}
