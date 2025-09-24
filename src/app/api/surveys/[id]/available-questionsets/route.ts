import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, sql } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: surveyId } = await params;

    if (!surveyId) {
      return NextResponse.json(
        { error: 'Survey ID is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Get all question set headers that are NOT currently assigned to this survey
    const query = `
      SELECT 
        qsh.ID as id,
        qsh.Name as name,
        qsh.Description as description,
        qsh.SourceViewName as sourceViewName,
        qsh.subscript,
        (SELECT COUNT(*) FROM QuestionSetQuestion qsq WHERE qsq.QuestionSetHeaderID = qsh.ID AND qsq.isVisible = 1) as questionCount
      FROM QuestionSetHeader qsh
      WHERE qsh.ID NOT IN (
        SELECT stq.QuestionSetHeaderID 
        FROM SurveyTemplateQuestion stq 
        WHERE stq.SurveyTemplateHeaderID = @surveyId 
        AND stq.isActive = 1
      )
      ORDER BY qsh.Name ASC
    `;

    const request = db.request();
    request.input('surveyId', sql.Int, parseInt(surveyId));
    const result = await request.query(query);

    return NextResponse.json({
      success: true,
      data: result.recordset.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        sourceViewName: row.sourceViewName,
        subscript: row.subscript,
        questionCount: row.questionCount
      }))
    });

  } catch (error) {
    console.error('Error fetching available question sets:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch available question sets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}