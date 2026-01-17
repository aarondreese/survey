// Survey Template Types

export interface SurveyTemplateHeader {
  id: number;
  name: string;
  description?: string;
  entityType: string;
  pageSplit: string;
  isActive: boolean;
  rowstamp?: Buffer;
}

export interface QuestionSetHeader {
  id: number;
  name: string;
  description?: string;
  sourceViewName?: string;
  subscript?: string;
}

export interface QuestionSetQuestion {
  id: number;
  fieldName: string;
  attributeLabel: string;
  surveyLabel: string;
  displayType: string;
  choices?: string;
  description?: string;
  isRequired: boolean;
  isVisible: boolean;
  sortOrder: number;
}

export interface MetaQuestionHeader {
  id: number;
  description: string;
  rowstamp?: Buffer;
}

// Base interface for common fields
interface BaseSurveyTemplateQuestion {
  id: number;
  surveyTemplateHeaderId: number;
  sortOrder: number;
  isActive: boolean;
  rowstamp?: Buffer;
}

// Discriminated union for SurveyTemplateQuestion
export type SurveyTemplateQuestion = 
  | (BaseSurveyTemplateQuestion & {
      questionType: 'QuestionSet';
      questionSetHeaderId: number;
      metaQuestionHeaderId: null;
      // Enriched data
      questionSetHeader?: QuestionSetHeader;
      questions?: QuestionSetQuestion[];
    })
  | (BaseSurveyTemplateQuestion & {
      questionType: 'MetaQuestion';
      metaQuestionHeaderId: number;
      questionSetHeaderId: null;
      // Enriched data
      metaQuestionHeader?: MetaQuestionHeader;
      answerCount?: number;
    });

// Type guards
export function isQuestionSetItem(item: SurveyTemplateQuestion): item is Extract<SurveyTemplateQuestion, { questionType: 'QuestionSet' }> {
  return item.questionType === 'QuestionSet';
}

export function isMetaQuestionItem(item: SurveyTemplateQuestion): item is Extract<SurveyTemplateQuestion, { questionType: 'MetaQuestion' }> {
  return item.questionType === 'MetaQuestion';
}

// Request/Response types
export interface AddQuestionSetRequest {
  questionSetHeaderId: number;
}

export interface AddMetaQuestionRequest {
  metaQuestionHeaderId: number;
}

export interface ReorderItemsRequest {
  reorderedItems: Array<{
    id: number;
    sortOrder: number;
  }>;
}

export interface AvailableQuestionSet {
  id: number;
  name: string;
  description?: string;
  sourceViewName?: string;
  subscript?: string;
  questionCount: number;
}

export interface AvailableMetaQuestion {
  id: number;
  description: string;
  answerCount: number;
}

// Survey Instance Types
export interface SurveyInstance {
  ID: number;
  SurveyTemplateHeaderID: number;
  EntityReference: string;
  InstanceCreatedDate: Date;
  SurveyJSON?: string;
  CompletedJSON?: string;
  CompletedDate?: Date;
  ReviewedDate?: Date;
  ApprovedDate?: Date;
  ExportedDate?: Date;
  ExportPath?: string;
  ExportFileName?: string;
}

export interface CreateSurveyInstanceRequest {
  surveyTemplateHeaderId: number;
  entityReference: string;
  surveyJson?: object;
}

export interface UpdateSurveyInstanceRequest {
  id: number;
  completedJson?: object;
  completedDate?: Date;
}
