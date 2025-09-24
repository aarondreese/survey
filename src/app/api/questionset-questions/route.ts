import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

interface CreateQuestionRequest {
  questionSetHeaderId: number;
  fieldName: string;
  attributeLabel: string;
  surveyLabel: string;
  displayType: string;
  choices?: string | null;
  description?: string | null;
  placeholder?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  colCount?: number | null;
  isReadOnly: boolean;
  isVisible: boolean;
  isRequired: boolean;
  isBlind: boolean;
  minIsCurrent: boolean;
  sortOrder: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questions }: { questions: CreateQuestionRequest[] } = body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: 'Questions array is required' },
        { status: 400 }
      );
    }

    // Get the question set ID from the first question (they should all be the same)
    const questionSetHeaderId = questions[0].questionSetHeaderId;

    const pool = await getDatabase();
    
    // Start transaction
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // First, get existing questions for this question set
      const existingResult = await transaction.request()
        .input('questionSetHeaderId', questionSetHeaderId)
        .query(`
          SELECT Id, FieldName, SortOrder 
          FROM QuestionSetQuestion 
          WHERE QuestionSetHeaderId = @questionSetHeaderId
        `);

      const existingQuestions = existingResult.recordset;
      const newFieldNames = new Set(questions.map(q => q.fieldName));

      // Step 1: Delete questions that are no longer in the new configuration
      const questionsToDelete = existingQuestions.filter(eq => !newFieldNames.has(eq.FieldName));
      for (const questionToDelete of questionsToDelete) {
        await transaction.request()
          .input('id', questionToDelete.Id)
          .query(`DELETE FROM QuestionSetQuestion WHERE Id = @id`);
      }

      // Step 2: Temporarily set sort orders to negative values to avoid conflicts
      // This prevents unique constraint violations during updates
      await transaction.request()
        .input('questionSetHeaderId', questionSetHeaderId)
        .query(`
          UPDATE QuestionSetQuestion 
          SET SortOrder = -SortOrder 
          WHERE QuestionSetHeaderId = @questionSetHeaderId AND SortOrder > 0
        `);

      const savedQuestions = [];

      // Step 3: Process each question (update existing or insert new)
      for (const question of questions) {
        const existingQuestion = existingQuestions.find(eq => eq.FieldName === question.fieldName);

        if (existingQuestion) {
          // Update existing question
          const result = await transaction.request()
            .input('id', existingQuestion.Id)
            .input('questionSetHeaderId', question.questionSetHeaderId)
            .input('fieldName', question.fieldName)
            .input('attributeLabel', question.attributeLabel)
            .input('surveyLabel', question.surveyLabel)
            .input('displayType', question.displayType)
            .input('choices', question.choices)
            .input('description', question.description)
            .input('placeholder', question.placeholder)
            .input('minValue', question.minValue)
            .input('maxValue', question.maxValue)
            .input('colCount', question.colCount)
            .input('isReadOnly', question.isReadOnly)
            .input('isVisible', question.isVisible)
            .input('isRequired', question.isRequired)
            .input('isBlind', question.isBlind)
            .input('minIsCurrent', question.minIsCurrent)
            .input('sortOrder', question.sortOrder)
            .query(`
              UPDATE QuestionSetQuestion 
              SET 
                QuestionSetHeaderId = @questionSetHeaderId,
                FieldName = @fieldName,
                AttributeLabel = @attributeLabel,
                SurveyLabel = @surveyLabel,
                DisplayType = @displayType,
                Choices = @choices,
                Description = @description,
                Placeholder = @placeholder,
                MinValue = @minValue,
                MaxValue = @maxValue,
                ColCount = @colCount,
                IsReadOnly = @isReadOnly,
                IsVisible = @isVisible,
                IsRequired = @isRequired,
                IsBlind = @isBlind,
                MinIsCurrent = @minIsCurrent,
                SortOrder = @sortOrder
              OUTPUT INSERTED.*
              WHERE Id = @id
            `);

          if (result.recordset.length > 0) {
            savedQuestions.push(result.recordset[0]);
          }
        } else {
          // Insert new question
          const result = await transaction.request()
            .input('questionSetHeaderId', question.questionSetHeaderId)
            .input('fieldName', question.fieldName)
            .input('attributeLabel', question.attributeLabel)
            .input('surveyLabel', question.surveyLabel)
            .input('displayType', question.displayType)
            .input('choices', question.choices)
            .input('description', question.description)
            .input('placeholder', question.placeholder)
            .input('minValue', question.minValue)
            .input('maxValue', question.maxValue)
            .input('colCount', question.colCount)
            .input('isReadOnly', question.isReadOnly)
            .input('isVisible', question.isVisible)
            .input('isRequired', question.isRequired)
            .input('isBlind', question.isBlind)
            .input('minIsCurrent', question.minIsCurrent)
            .input('sortOrder', question.sortOrder)
            .query(`
              INSERT INTO QuestionSetQuestion (
                QuestionSetHeaderId, FieldName, AttributeLabel, SurveyLabel, DisplayType,
                Choices, Description, Placeholder, MinValue, MaxValue, ColCount,
                IsReadOnly, IsVisible, IsRequired, IsBlind, MinIsCurrent, SortOrder
              )
              OUTPUT INSERTED.*
              VALUES (
                @questionSetHeaderId, @fieldName, @attributeLabel, @surveyLabel, @displayType,
                @choices, @description, @placeholder, @minValue, @maxValue, @colCount,
                @isReadOnly, @isVisible, @isRequired, @isBlind, @minIsCurrent, @sortOrder
              )
            `);

          if (result.recordset.length > 0) {
            savedQuestions.push(result.recordset[0]);
          }
        }
      }

      await transaction.commit();

      return NextResponse.json({
        success: true,
        data: savedQuestions,
        message: `Successfully saved ${savedQuestions.length} questions`
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Question save error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to save questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}