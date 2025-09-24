import { executeQuery } from '@/lib/database';
import { 
  QuestionSetHeader, 
  QuestionSetQuestion, 
  CreateQuestionSetRequest, 
  CreateQuestionRequest,
  QuestionSetWithQuestions 
} from '@/types/database';

// Question Set Header operations
export class QuestionSetService {
  
  // Get all question sets
  static async getAll(): Promise<QuestionSetHeader[]> {
    const result = await executeQuery<QuestionSetHeader>(
      `SELECT 
        ID as id,
        Name as name,
        Description as description,
        SourceViewName as sourceViewName,
        Subscript as subscript
       FROM QuestionSetHeader`
    );
    return result;
  }

  // Get question set by ID
  static async getById(id: number): Promise<QuestionSetHeader | null> {
    const result = await executeQuery<QuestionSetHeader>(
      `SELECT 
        ID as id,
        Name as name,
        Description as description,
        SourceViewName as sourceViewName,
        Subscript as subscript
       FROM QuestionSetHeader 
       WHERE ID = @id`,
      { id }
    );
    return result.length > 0 ? result[0] : null;
  }

  // Get question set with questions
  static async getWithQuestions(id: number): Promise<QuestionSetWithQuestions | null> {
    const questionSet = await this.getById(id);
    if (!questionSet) return null;

    const questions = await QuestionService.getByQuestionSetId(id);
    
    return {
      ...questionSet,
      questions
    };
  }

  // Create new question set
  static async create(data: CreateQuestionSetRequest): Promise<QuestionSetHeader> {
    const result = await executeQuery<QuestionSetHeader>(
      `INSERT INTO QuestionSetHeader (Name, Description, SourceViewName, Subscript)
       OUTPUT INSERTED.ID as id, INSERTED.Name as name, INSERTED.Description as description, INSERTED.SourceViewName as sourceViewName, INSERTED.Subscript as subscript
       VALUES (@name, @description, @sourceViewName, @subscript)`,
      {
        name: data.name.trim(),
        description: data.description || null,
        sourceViewName: data.sourceViewName || null,
        subscript: 'Standard' // Default value based on the existing record
      }
    );

    if (result.length === 0) {
      throw new Error("Failed to create question set");
    }

    return result[0];
  }

  // Update question set
  static async update(id: number, data: Partial<CreateQuestionSetRequest>): Promise<QuestionSetHeader | null> {
    const updateFields: string[] = [];
    const params: Record<string, unknown> = { id };

    if (data.name !== undefined) {
      updateFields.push('Name = @name');
      params.name = data.name.trim();
    }
    if (data.description !== undefined) {
      updateFields.push('Description = @description');
      params.description = data.description || null;
    }
    if (data.sourceViewName !== undefined) {
      updateFields.push('SourceViewName = @sourceViewName');
      params.sourceViewName = data.sourceViewName || null;
    }

    if (updateFields.length === 0) {
      return this.getById(id);
    }

    const result = await executeQuery<QuestionSetHeader>(
      `UPDATE QuestionSetHeader 
       SET ${updateFields.join(', ')}
       OUTPUT INSERTED.ID as id, INSERTED.Name as name, INSERTED.Description as description, INSERTED.SourceViewName as sourceViewName, INSERTED.Subscript as subscript
       WHERE ID = @id`,
      params
    );

    return result.length > 0 ? result[0] : null;
  }

  // Delete question set
  static async delete(id: number): Promise<boolean> {
    const result = await executeQuery<{ rowsAffected: number }>(
      `DELETE FROM QuestionSetHeader WHERE ID = @id`,
      { id }
    );
    return result.length > 0;
  }

  // Check if question set exists
  static async exists(id: number): Promise<boolean> {
    const result = await executeQuery<{ count: number }>(
      `SELECT COUNT(*) as count FROM QuestionSetHeader WHERE ID = @id`,
      { id }
    );
    return result.length > 0 && result[0].count > 0;
  }
}

// Question operations
export class QuestionService {
  
  // Get questions by question set ID
  static async getByQuestionSetId(questionSetHeaderId: number): Promise<QuestionSetQuestion[]> {
    return executeQuery<QuestionSetQuestion>(
      `SELECT 
        ID as id,
        QuestionSetHeaderID as questionSetHeaderId,
        FieldName as fieldName,
        AttributeLabel as attributeLabel,
        SurveyLabel as surveyLabel,
        DisplayType as displayType,
        Choices as choices,
        Description as description,
        Placeholder as placeholder,
        MinValue as minValue,
        MaxValue as maxValue,
        ColCount as colCount,
        isReadOnly,
        isVisible,
        isRequired,
        isBlind,
        minIsCurrent,
        SortOrder as sortOrder
       FROM QuestionSetQuestion 
       WHERE QuestionSetHeaderID = @questionSetHeaderId 
       ORDER BY SortOrder ASC`,
      { questionSetHeaderId }
    );
  }

  // Get question by ID
  static async getById(id: number): Promise<QuestionSetQuestion | null> {
    const result = await executeQuery<QuestionSetQuestion>(
      `SELECT 
        ID as id,
        QuestionSetHeaderID as questionSetHeaderId,
        FieldName as fieldName,
        AttributeLabel as attributeLabel,
        SurveyLabel as surveyLabel,
        DisplayType as displayType,
        Choices as choices,
        Description as description,
        Placeholder as placeholder,
        MinValue as minValue,
        MaxValue as maxValue,
        ColCount as colCount,
        isReadOnly,
        isVisible,
        isRequired,
        isBlind,
        minIsCurrent,
        SortOrder as sortOrder
       FROM QuestionSetQuestion 
       WHERE ID = @id`,
      { id }
    );
    return result.length > 0 ? result[0] : null;
  }

  // Create new question
  static async create(data: CreateQuestionRequest): Promise<QuestionSetQuestion> {
    const result = await executeQuery<QuestionSetQuestion>(
      `INSERT INTO QuestionSetQuestion (
        QuestionSetHeaderID, FieldName, AttributeLabel, SurveyLabel, DisplayType, 
        Choices, Description, Placeholder, MinValue, MaxValue, ColCount,
        isReadOnly, isVisible, isRequired, isBlind, minIsCurrent, SortOrder
      )
       OUTPUT 
        INSERTED.ID as id,
        INSERTED.QuestionSetHeaderID as questionSetHeaderId,
        INSERTED.FieldName as fieldName,
        INSERTED.AttributeLabel as attributeLabel,
        INSERTED.SurveyLabel as surveyLabel,
        INSERTED.DisplayType as displayType,
        INSERTED.Choices as choices,
        INSERTED.Description as description,
        INSERTED.Placeholder as placeholder,
        INSERTED.MinValue as minValue,
        INSERTED.MaxValue as maxValue,
        INSERTED.ColCount as colCount,
        INSERTED.isReadOnly,
        INSERTED.isVisible,
        INSERTED.isRequired,
        INSERTED.isBlind,
        INSERTED.minIsCurrent,
        INSERTED.SortOrder as sortOrder
       VALUES (@questionSetHeaderId, @fieldName, @attributeLabel, @surveyLabel, @displayType,
               @choices, @description, @placeholder, @minValue, @maxValue, @colCount,
               @isReadOnly, @isVisible, @isRequired, @isBlind, @minIsCurrent, @sortOrder)`,
      {
        questionSetHeaderId: data.questionSetHeaderId,
        fieldName: data.fieldName,
        attributeLabel: data.attributeLabel,
        surveyLabel: data.surveyLabel,
        displayType: data.displayType,
        choices: data.choices || null,
        description: data.description || null,
        placeholder: data.placeholder || null,
        minValue: data.minValue || null,
        maxValue: data.maxValue || null,
        colCount: data.colCount || null,
        isReadOnly: data.isReadOnly ? 1 : 0,
        isVisible: data.isVisible ? 1 : 0,
        isRequired: data.isRequired ? 1 : 0,
        isBlind: data.isBlind ? 1 : 0,
        minIsCurrent: data.minIsCurrent ? 1 : 0,
        sortOrder: data.sortOrder
      }
    );

    if (result.length === 0) {
      throw new Error("Failed to create question");
    }

    return result[0];
  }

  // Update question
  static async update(id: number, data: Partial<CreateQuestionRequest>): Promise<QuestionSetQuestion | null> {
    const updateFields: string[] = [];
    const params: Record<string, unknown> = { id };

    if (data.fieldName !== undefined) {
      updateFields.push('FieldName = @fieldName');
      params.fieldName = data.fieldName;
    }
    if (data.attributeLabel !== undefined) {
      updateFields.push('AttributeLabel = @attributeLabel');
      params.attributeLabel = data.attributeLabel;
    }
    if (data.surveyLabel !== undefined) {
      updateFields.push('SurveyLabel = @surveyLabel');
      params.surveyLabel = data.surveyLabel;
    }
    if (data.displayType !== undefined) {
      updateFields.push('DisplayType = @displayType');
      params.displayType = data.displayType;
    }
    if (data.choices !== undefined) {
      updateFields.push('Choices = @choices');
      params.choices = data.choices || null;
    }
    if (data.description !== undefined) {
      updateFields.push('Description = @description');
      params.description = data.description || null;
    }
    if (data.placeholder !== undefined) {
      updateFields.push('Placeholder = @placeholder');
      params.placeholder = data.placeholder || null;
    }
    if (data.minValue !== undefined) {
      updateFields.push('MinValue = @minValue');
      params.minValue = data.minValue || null;
    }
    if (data.maxValue !== undefined) {
      updateFields.push('MaxValue = @maxValue');
      params.maxValue = data.maxValue || null;
    }
    if (data.colCount !== undefined) {
      updateFields.push('ColCount = @colCount');
      params.colCount = data.colCount || null;
    }
    if (data.isReadOnly !== undefined) {
      updateFields.push('isReadOnly = @isReadOnly');
      params.isReadOnly = data.isReadOnly ? 1 : 0;
    }
    if (data.isVisible !== undefined) {
      updateFields.push('isVisible = @isVisible');
      params.isVisible = data.isVisible ? 1 : 0;
    }
    if (data.isRequired !== undefined) {
      updateFields.push('isRequired = @isRequired');
      params.isRequired = data.isRequired ? 1 : 0;
    }
    if (data.isBlind !== undefined) {
      updateFields.push('isBlind = @isBlind');
      params.isBlind = data.isBlind ? 1 : 0;
    }
    if (data.minIsCurrent !== undefined) {
      updateFields.push('minIsCurrent = @minIsCurrent');
      params.minIsCurrent = data.minIsCurrent ? 1 : 0;
    }
    if (data.sortOrder !== undefined) {
      updateFields.push('SortOrder = @sortOrder');
      params.sortOrder = data.sortOrder;
    }

    if (updateFields.length === 0) {
      return this.getById(id);
    }

    const result = await executeQuery<QuestionSetQuestion>(
      `UPDATE QuestionSetQuestion 
       SET ${updateFields.join(', ')}
       OUTPUT 
        INSERTED.ID as id,
        INSERTED.QuestionSetHeaderID as questionSetHeaderId,
        INSERTED.FieldName as fieldName,
        INSERTED.AttributeLabel as attributeLabel,
        INSERTED.SurveyLabel as surveyLabel,
        INSERTED.DisplayType as displayType,
        INSERTED.Choices as choices,
        INSERTED.Description as description,
        INSERTED.Placeholder as placeholder,
        INSERTED.MinValue as minValue,
        INSERTED.MaxValue as maxValue,
        INSERTED.ColCount as colCount,
        INSERTED.isReadOnly,
        INSERTED.isVisible,
        INSERTED.isRequired,
        INSERTED.isBlind,
        INSERTED.minIsCurrent,
        INSERTED.SortOrder as sortOrder
       WHERE ID = @id`,
      params
    );

    return result.length > 0 ? result[0] : null;
  }

  // Delete question
  static async delete(id: number): Promise<boolean> {
    const result = await executeQuery<{ rowsAffected: number }>(
      `DELETE FROM QuestionSetQuestion WHERE ID = @id`,
      { id }
    );
    return result.length > 0;
  }

  // Get next sort order for a question set
  static async getNextSortOrder(questionSetHeaderId: number): Promise<number> {
    const result = await executeQuery<{ maxOrder: number | null }>(
      `SELECT MAX(SortOrder) as maxOrder FROM QuestionSetQuestion WHERE QuestionSetHeaderID = @questionSetHeaderId`,
      { questionSetHeaderId }
    );
    
    const maxOrder = result.length > 0 ? result[0].maxOrder : null;
    return (maxOrder || 0) + 1;
  }
}