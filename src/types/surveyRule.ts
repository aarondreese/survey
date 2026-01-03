// Survey Rule types

export interface SurveyRule {
  id: number;
  ruleName: string;
  functionName: string;
  rowstamp?: Buffer;
}

export interface SurveyTemplateQuestionRule {
  id: number;
  surveyTemplateQuestionId: number;
  surveyRuleId: number;
  applyToRequired: boolean;
  applyToVisible: boolean;
  applyToReadOnly: boolean;
  rowstamp?: Buffer;
}

export interface DatabaseFunction {
  routineName: string;
  routineType: string;
}

export interface CreateSurveyRuleRequest {
  ruleName: string;
  functionName: string;
}

export interface UpdateSurveyRuleRequest extends Partial<CreateSurveyRuleRequest> {
  id: number;
}
