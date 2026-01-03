import { executeQuery } from "@/lib/database";
import { SurveyTemplateQuestion, AvailableQuestionSet, AvailableMetaQuestion } from "@/types/surveys";

interface QueryRow {
  id: number;
  surveyTemplateHeaderId: number;
  questionType: string;
  questionSetHeaderId: number | null;
  metaQuestionHeaderId: number | null;
  sortOrder: number;
  isActive: number;
  questionSetName: string | null;
  questionSetDescription: string | null;
  questionSetSourceViewName: string | null;
  questionSetSubscript: string | null;
  metaQuestionDescription: string | null;
  questionCount: number;
  answerCount: number;
}

interface MaxSortRow {
  maxSort: number;
}

interface InsertIdRow {
  id: number;
}

interface AvailableQSRow {
  id: number;
  name: string;
  description: string | null;
  sourceViewName: string | null;
  subscript: string | null;
  questionCount: number;
}

interface AvailableMQRow {
  id: number;
  description: string;
  answerCount: number;
}

export class SurveyTemplateQuestionService {
  /**
   * Get all questions (both question sets and meta-questions) for a survey template
   */
  static async getBySurveyTemplateId(surveyTemplateHeaderId: number): Promise<SurveyTemplateQuestion[]> {
    const query = `
      SELECT 
        stq.ID as id,
        stq.SurveyTemplateHeaderID as surveyTemplateHeaderId,
        stq.QuestionType as questionType,
        stq.QuestionSetHeaderID as questionSetHeaderId,
        stq.MetaQuestionHeaderID as metaQuestionHeaderId,
        stq.SortOrder as sortOrder,
        stq.isActive,
        -- Question Set data
        qsh.Name as questionSetName,
        qsh.Description as questionSetDescription,
        qsh.SourceViewName as questionSetSourceViewName,
        qsh.Subscript as questionSetSubscript,
        -- Meta Question data
        mqh.Description as metaQuestionDescription,
        -- Counts
        (SELECT COUNT(*) FROM QuestionSetQuestion WHERE QuestionSetHeaderID = stq.QuestionSetHeaderID) as questionCount,
        (SELECT COUNT(*) FROM MetaQuestionAnswer WHERE MetaQuestionHeaderID = stq.MetaQuestionHeaderID) as answerCount
      FROM SurveyTemplateQuestion stq
      LEFT JOIN QuestionSetHeader qsh ON stq.QuestionSetHeaderID = qsh.ID
      LEFT JOIN MetaQuestionHeader mqh ON stq.MetaQuestionHeaderID = mqh.ID
      WHERE stq.SurveyTemplateHeaderID = @surveyTemplateHeaderId
      ORDER BY stq.SortOrder
    `;

    const result = await executeQuery<QueryRow>(query, { surveyTemplateHeaderId });

    return result.map((row) => {
      if (row.questionType === 'QuestionSet' && row.questionSetHeaderId !== null) {
        return {
          id: row.id,
          surveyTemplateHeaderId: row.surveyTemplateHeaderId,
          questionType: 'QuestionSet' as const,
          questionSetHeaderId: row.questionSetHeaderId,
          metaQuestionHeaderId: null,
          sortOrder: row.sortOrder,
          isActive: row.isActive === 1,
          questionSetHeader: row.questionSetName ? {
            id: row.questionSetHeaderId,
            name: row.questionSetName,
            description: row.questionSetDescription || undefined,
            sourceViewName: row.questionSetSourceViewName || undefined,
            subscript: row.questionSetSubscript || undefined,
          } : undefined,
          questions: [], // Will be populated separately if needed
        };
      } else if (row.questionType === 'MetaQuestion' && row.metaQuestionHeaderId !== null) {
        return {
          id: row.id,
          surveyTemplateHeaderId: row.surveyTemplateHeaderId,
          questionType: 'MetaQuestion' as const,
          metaQuestionHeaderId: row.metaQuestionHeaderId,
          questionSetHeaderId: null,
          sortOrder: row.sortOrder,
          isActive: row.isActive === 1,
          metaQuestionHeader: row.metaQuestionDescription ? {
            id: row.metaQuestionHeaderId,
            description: row.metaQuestionDescription,
          } : undefined,
          answerCount: row.answerCount || 0,
        };
      }
      // This should never happen due to database constraints, but TypeScript needs a fallback
      throw new Error(`Invalid question type or missing IDs for row ${row.id}`);
    });
  }

  /**
   * Add a question set to a survey template
   */
  static async addQuestionSet(surveyTemplateHeaderId: number, questionSetHeaderId: number): Promise<number> {
    // Get the next sort order
    const maxSortQuery = `
      SELECT ISNULL(MAX(SortOrder), 0) as maxSort
      FROM SurveyTemplateQuestion
      WHERE SurveyTemplateHeaderID = @surveyTemplateHeaderId
    `;
    const maxResult = await executeQuery<MaxSortRow>(maxSortQuery, { surveyTemplateHeaderId });
    const nextSort = (maxResult[0]?.maxSort || 0) + 1;

    // Insert the question set
    const insertQuery = `
      INSERT INTO SurveyTemplateQuestion (
        SurveyTemplateHeaderID,
        QuestionType,
        QuestionSetHeaderID,
        MetaQuestionHeaderID,
        SortOrder,
        isActive
      )
      VALUES (
        @surveyTemplateHeaderId,
        'QuestionSet',
        @questionSetHeaderId,
        NULL,
        @sortOrder,
        1
      );
      SELECT SCOPE_IDENTITY() as id;
    `;

    const result = await executeQuery<InsertIdRow>(insertQuery, { 
      surveyTemplateHeaderId, 
      questionSetHeaderId, 
      sortOrder: nextSort 
    });

    return result[0].id;
  }

  /**
   * Add a meta-question to a survey template
   */
  static async addMetaQuestion(surveyTemplateHeaderId: number, metaQuestionHeaderId: number): Promise<number> {
    // Get the next sort order
    const maxSortQuery = `
      SELECT ISNULL(MAX(SortOrder), 0) as maxSort
      FROM SurveyTemplateQuestion
      WHERE SurveyTemplateHeaderID = @surveyTemplateHeaderId
    `;
    const maxResult = await executeQuery<MaxSortRow>(maxSortQuery, { surveyTemplateHeaderId });
    const nextSort = (maxResult[0]?.maxSort || 0) + 1;

    // Insert the meta-question
    const insertQuery = `
      INSERT INTO SurveyTemplateQuestion (
        SurveyTemplateHeaderID,
        QuestionType,
        QuestionSetHeaderID,
        MetaQuestionHeaderID,
        SortOrder,
        isActive
      )
      VALUES (
        @surveyTemplateHeaderId,
        'MetaQuestion',
        NULL,
        @metaQuestionHeaderId,
        @sortOrder,
        1
      );
      SELECT SCOPE_IDENTITY() as id;
    `;

    const result = await executeQuery<InsertIdRow>(insertQuery, { 
      surveyTemplateHeaderId, 
      metaQuestionHeaderId, 
      sortOrder: nextSort 
    });

    return result[0].id;
  }

  /**
   * Remove an item (question set or meta-question) from a survey template
   */
  static async removeItem(id: number): Promise<void> {
    const query = `
      DELETE FROM SurveyTemplateQuestion
      WHERE ID = @id
    `;

    await executeQuery(query, { id });
  }

  /**
   * Update sort orders for multiple items
   */
  static async updateSortOrders(items: Array<{ id: number; sortOrder: number }>): Promise<void> {
    for (const item of items) {
      const query = `
        UPDATE SurveyTemplateQuestion
        SET SortOrder = @sortOrder
        WHERE ID = @id
      `;

      await executeQuery(query, { id: item.id, sortOrder: item.sortOrder });
    }
  }

  /**
   * Get available question sets (not already in this survey template)
   */
  static async getAvailableQuestionSets(surveyTemplateHeaderId: number): Promise<AvailableQuestionSet[]> {
    const query = `
      SELECT 
        qsh.ID as id,
        qsh.Name as name,
        qsh.Description as description,
        qsh.SourceViewName as sourceViewName,
        qsh.Subscript as subscript,
        (SELECT COUNT(*) FROM QuestionSetQuestion WHERE QuestionSetHeaderID = qsh.ID) as questionCount
      FROM QuestionSetHeader qsh
      WHERE qsh.ID NOT IN (
        SELECT QuestionSetHeaderID 
        FROM SurveyTemplateQuestion 
        WHERE SurveyTemplateHeaderID = @surveyTemplateHeaderId 
        AND QuestionType = 'QuestionSet'
        AND QuestionSetHeaderID IS NOT NULL
      )
      ORDER BY qsh.Name
    `;

    const result = await executeQuery<AvailableQSRow>(query, { surveyTemplateHeaderId });

    return result.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      sourceViewName: row.sourceViewName || undefined,
      subscript: row.subscript || undefined,
      questionCount: row.questionCount || 0,
    }));
  }

  /**
   * Get available meta-questions (not already in this survey template)
   */
  static async getAvailableMetaQuestions(surveyTemplateHeaderId: number): Promise<AvailableMetaQuestion[]> {
    const query = `
      SELECT 
        mqh.ID as id,
        mqh.Description as description,
        (SELECT COUNT(*) FROM MetaQuestionAnswer WHERE MetaQuestionHeaderID = mqh.ID) as answerCount
      FROM MetaQuestionHeader mqh
      WHERE mqh.ID NOT IN (
        SELECT MetaQuestionHeaderID 
        FROM SurveyTemplateQuestion 
        WHERE SurveyTemplateHeaderID = @surveyTemplateHeaderId 
        AND QuestionType = 'MetaQuestion'
        AND MetaQuestionHeaderID IS NOT NULL
      )
      ORDER BY mqh.ID
    `;

    const result = await executeQuery<AvailableMQRow>(query, { surveyTemplateHeaderId });

    return result.map((row) => ({
      id: row.id,
      description: row.description,
      answerCount: row.answerCount || 0,
    }));
  }
}
