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

    const pool = await getDatabase();
    
    // Start transaction
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      const createdQuestions = [];

      for (const question of questions) {
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
          createdQuestions.push(result.recordset[0]);
        }
      }

      await transaction.commit();

      return NextResponse.json({
        success: true,
        data: createdQuestions,
        message: `Successfully created ${createdQuestions.length} questions`
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Question creation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}