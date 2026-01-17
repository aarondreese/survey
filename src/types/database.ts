// Database model interfaces based on your schema

export interface Address {
  AddressID: number;
  AddressLine1: string;
  AddressLine2?: string;
  AddressLine3?: string;
  Town: string;
  County: string;
  PostCode: string;
  UPRN?: string;
  PropertyID?: number;
}

export interface QuestionSetHeader {
  id: number;
  name: string;
  description?: string;
  sourceViewName?: string;
  subscript?: string;
  rowstamp?: Buffer;
}

export interface QuestionSetQuestion {
  id: number;
  questionSetHeaderId: number;
  fieldName: string;
  attributeLabel: string;
  surveyLabel: string;
  displayType: string;
  choices?: string;
  description?: string;
  placeholder?: string;
  minValue?: number;
  maxValue?: number;
  colCount?: number;
  isReadOnly: boolean;
  isVisible: boolean;
  isRequired: boolean;
  isBlind: boolean;
  minIsCurrent: boolean;
  sortOrder: number;

  rowstamp?: Buffer;
}

// Request/Response interfaces for API
export interface CreateQuestionSetRequest {
  name: string;
  description?: string;
  sourceViewName?: string;
  subscript?: string;
}

export interface UpdateQuestionSetRequest extends Partial<CreateQuestionSetRequest> {
  id: number;
}

export interface CreateQuestionRequest {
  questionSetHeaderId: number;
  fieldName: string;
  attributeLabel: string;
  surveyLabel: string;
  displayType: string;
  choices?: string;
  description?: string;
  placeholder?: string;
  minValue?: number;
  maxValue?: number;
  colCount?: number;
  isReadOnly: boolean;
  isVisible: boolean;
  isRequired: boolean;
  isBlind: boolean;
  minIsCurrent: boolean;
  sortOrder: number;
}

export interface UpdateQuestionRequest extends Partial<CreateQuestionRequest> {
  id: number;
}

// API Response interfaces
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Database query result interfaces
export interface QuestionSetWithQuestions extends QuestionSetHeader {
  questions: QuestionSetQuestion[];
}

// Form data interfaces (for frontend)
export interface QuestionSetFormData {
  name: string;
  description: string;
  sourceViewName: string;
}

export interface QuestionFormData {
  questionText: string;
  questionType: string;
  isRequired: boolean;
  orderIndex: number;
  propertyAttributeId: number | null;
  fieldName: string;
}