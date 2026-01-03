import { executeQuery } from '@/lib/database';
import { 
  MetaQuestionHeader, 
  MetaQuestionAnswer,
  CreateMetaQuestionRequest,
  CreateMetaAnswerRequest,
  MetaQuestionWithAnswers
} from '@/types/metaQuestion';

// Meta Question Header operations
export class MetaQuestionService {
  
  // Get all meta-questions
  static async getAll(): Promise<MetaQuestionHeader[]> {
    const result = await executeQuery<MetaQuestionHeader>(
      `SELECT 
        ID as id,
        Description as description
       FROM MetaQuestionHeader
       ORDER BY ID`
    );
    return result;
  }

  // Get meta-question by ID
  static async getById(id: number): Promise<MetaQuestionHeader | null> {
    const result = await executeQuery<MetaQuestionHeader>(
      `SELECT 
        ID as id,
        Description as description
       FROM MetaQuestionHeader 
       WHERE ID = @id`,
      { id }
    );
    return result.length > 0 ? result[0] : null;
  }

  // Get meta-question with answers
  static async getWithAnswers(id: number): Promise<MetaQuestionWithAnswers | null> {
    const metaQuestion = await this.getById(id);
    if (!metaQuestion) return null;

    const answers = await MetaAnswerService.getByMetaQuestionId(id);
    
    return {
      ...metaQuestion,
      answers
    };
  }

  // Create new meta-question
  static async create(data: CreateMetaQuestionRequest): Promise<MetaQuestionHeader> {
    const result = await executeQuery<MetaQuestionHeader>(
      `INSERT INTO MetaQuestionHeader (Description)
      OUTPUT 
        INSERTED.ID as id,
        INSERTED.Description as description
      VALUES (@description)`,
      {
        description: data.description || null
      }
    );
    return result[0];
  }

  // Update meta-question
  static async update(id: number, data: Partial<CreateMetaQuestionRequest>): Promise<MetaQuestionHeader | null> {
    const fields: string[] = [];
    const params: Record<string, unknown> = { id };

    if (data.description !== undefined) {
      fields.push('Description = @description');
      params.description = data.description;
    }

    if (fields.length === 0) {
      return this.getById(id);
    }

    const result = await executeQuery<MetaQuestionHeader>(
      `UPDATE MetaQuestionHeader 
       SET ${fields.join(', ')}
       OUTPUT 
         INSERTED.ID as id,
         INSERTED.Description as description
       WHERE ID = @id`,
      params
    );
    return result.length > 0 ? result[0] : null;
  }

  // Delete meta-question
  static async delete(id: number): Promise<boolean> {
    await executeQuery(
      `DELETE FROM MetaQuestionHeader WHERE ID = @id`,
      { id }
    );
    return true;
  }

  // Check if meta-question exists
  static async exists(id: number): Promise<boolean> {
    const result = await executeQuery<{ count: number }>(
      `SELECT COUNT(*) as count FROM MetaQuestionHeader WHERE ID = @id`,
      { id }
    );
    return result[0].count > 0;
  }
}

// Meta Answer operations
export class MetaAnswerService {
  
  // Get answers by meta-question ID
  static async getByMetaQuestionId(metaQuestionHeaderId: number): Promise<MetaQuestionAnswer[]> {
    const result = await executeQuery<MetaQuestionAnswer>(
      `SELECT 
        mqa.ID as id,
        mqa.MetaQuestionHeaderID as metaQuestionHeaderId,
        mqa.QuestionSetHeaderID as questionSetHeaderId,
        mqa.isActive,
        qsh.Name as questionSetName,
        qsh.Description as questionSetDescription
       FROM MetaQuestionAnswer mqa
       LEFT JOIN QuestionSetHeader qsh ON mqa.QuestionSetHeaderID = qsh.ID
       WHERE mqa.MetaQuestionHeaderID = @metaQuestionHeaderId 
       ORDER BY mqa.ID`,
      { metaQuestionHeaderId }
    );
    return result;
  }

  // Get answer by ID
  static async getById(id: number): Promise<MetaQuestionAnswer | null> {
    const result = await executeQuery<MetaQuestionAnswer>(
      `SELECT 
        mqa.ID as id,
        mqa.MetaQuestionHeaderID as metaQuestionHeaderId,
        mqa.QuestionSetHeaderID as questionSetHeaderId,
        mqa.isActive,
        qsh.Name as questionSetName,
        qsh.Description as questionSetDescription
       FROM MetaQuestionAnswer mqa
       LEFT JOIN QuestionSetHeader qsh ON mqa.QuestionSetHeaderID = qsh.ID
       WHERE mqa.ID = @id`,
      { id }
    );
    return result.length > 0 ? result[0] : null;
  }

  // Create new answer
  static async create(data: CreateMetaAnswerRequest): Promise<MetaQuestionAnswer> {
    const result = await executeQuery<MetaQuestionAnswer>(
      `INSERT INTO MetaQuestionAnswer (
        MetaQuestionHeaderID, QuestionSetHeaderID, isActive
      )
      OUTPUT 
        INSERTED.ID as id,
        INSERTED.MetaQuestionHeaderID as metaQuestionHeaderId,
        INSERTED.QuestionSetHeaderID as questionSetHeaderId,
        INSERTED.isActive
      VALUES (@metaQuestionHeaderId, @questionSetHeaderId, @isActive)`,
      {
        metaQuestionHeaderId: data.metaQuestionHeaderId,
        questionSetHeaderId: data.questionSetHeaderId,
        isActive: data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1
      }
    );
    return result[0];
  }

  // Update answer
  static async update(id: number, data: Partial<CreateMetaAnswerRequest>): Promise<MetaQuestionAnswer | null> {
    const fields: string[] = [];
    const params: Record<string, unknown> = { id };

    if (data.questionSetHeaderId !== undefined) {
      fields.push('QuestionSetHeaderID = @questionSetHeaderId');
      params.questionSetHeaderId = data.questionSetHeaderId;
    }
    if (data.isActive !== undefined) {
      fields.push('isActive = @isActive');
      params.isActive = data.isActive ? 1 : 0;
    }

    if (fields.length === 0) {
      return this.getById(id);
    }

    const result = await executeQuery<MetaQuestionAnswer>(
      `UPDATE MetaQuestionAnswer 
       SET ${fields.join(', ')}
       OUTPUT 
         INSERTED.ID as id,
         INSERTED.MetaQuestionHeaderID as metaQuestionHeaderId,
         INSERTED.QuestionSetHeaderID as questionSetHeaderId,
         INSERTED.isActive
       WHERE ID = @id`,
      params
    );
    return result.length > 0 ? result[0] : null;
  }

  // Delete answer
  static async delete(id: number): Promise<boolean> {
    await executeQuery(
      `DELETE FROM MetaQuestionAnswer WHERE ID = @id`,
      { id }
    );
    return true;
  }
}
