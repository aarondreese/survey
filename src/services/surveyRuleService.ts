import { executeQuery } from '@/lib/database';
import type { 
  SurveyRule, 
  CreateSurveyRuleRequest,
  DatabaseFunction
} from '@/types/surveyRule';

export class SurveyRuleService {
  // Get all survey rules
  static async getAll(): Promise<SurveyRule[]> {
    const result = await executeQuery<SurveyRule>(
      `SELECT 
        ID as id,
        RuleName as ruleName,
        FunctionName as functionName
       FROM SurveyRule
       ORDER BY RuleName`,
      {}
    );
    return result;
  }

  // Get rule by ID
  static async getById(id: number): Promise<SurveyRule | null> {
    const result = await executeQuery<SurveyRule>(
      `SELECT 
        ID as id,
        RuleName as ruleName,
        FunctionName as functionName
       FROM SurveyRule
       WHERE ID = @id`,
      { id }
    );
    return result.length > 0 ? result[0] : null;
  }

  // Create new rule
  static async create(data: CreateSurveyRuleRequest): Promise<SurveyRule> {
    const result = await executeQuery<SurveyRule>(
      `INSERT INTO SurveyRule (RuleName, FunctionName)
       OUTPUT 
        INSERTED.ID as id,
        INSERTED.RuleName as ruleName,
        INSERTED.FunctionName as functionName
       VALUES (@ruleName, @functionName)`,
      {
        ruleName: data.ruleName,
        functionName: data.functionName
      }
    );
    return result[0];
  }

  // Update existing rule
  static async update(id: number, data: Partial<CreateSurveyRuleRequest>): Promise<SurveyRule | null> {
    const setClauses: string[] = [];
    const params: Record<string, string | number> = { id };

    if (data.ruleName !== undefined) {
      setClauses.push('RuleName = @ruleName');
      params.ruleName = data.ruleName;
    }
    if (data.functionName !== undefined) {
      setClauses.push('FunctionName = @functionName');
      params.functionName = data.functionName;
    }

    if (setClauses.length === 0) {
      return this.getById(id);
    }

    const result = await executeQuery<SurveyRule>(
      `UPDATE SurveyRule 
       SET ${setClauses.join(', ')}
       OUTPUT 
        INSERTED.ID as id,
        INSERTED.RuleName as ruleName,
        INSERTED.FunctionName as functionName
       WHERE ID = @id`,
      params as Record<string, string | number>
    );
    return result.length > 0 ? result[0] : null;
  }

  // Delete rule
  static async delete(id: number): Promise<boolean> {
    await executeQuery(
      `DELETE FROM SurveyRule WHERE ID = @id`,
      { id }
    );
    return true;
  }

  // Get all available database functions
  static async getDatabaseFunctions(): Promise<DatabaseFunction[]> {
    const result = await executeQuery<DatabaseFunction>(
      `SELECT 
        ROUTINE_NAME as routineName,
        ROUTINE_TYPE as routineType
       FROM INFORMATION_SCHEMA.ROUTINES
       WHERE ROUTINE_TYPE = 'FUNCTION'
       ORDER BY ROUTINE_NAME`,
      {}
    );
    return result;
  }
}
