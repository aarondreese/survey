import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const questionSetId = parseInt(params.id);

    if (isNaN(questionSetId)) {
      return NextResponse.json(
        { error: 'Invalid question set ID' },
        { status: 400 }
      );
    }

    const pool = await getDatabase();
    
    const result = await pool.request()
      .input('questionSetHeaderId', questionSetId)
      .query(`
        SELECT 
          Id as id,
          QuestionSetHeaderId as questionSetHeaderId,
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
          IsReadOnly as isReadOnly,
          IsVisible as isVisible,
          IsRequired as isRequired,
          IsBlind as isBlind,
          MinIsCurrent as minIsCurrent,
          SortOrder as sortOrder
        FROM QuestionSetQuestion 
        WHERE QuestionSetHeaderId = @questionSetHeaderId
        ORDER BY SortOrder ASC
      `);

    return NextResponse.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}