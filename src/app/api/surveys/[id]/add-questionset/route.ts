import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, sql } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: surveyId } = await params;
    const body = await request.json();
    const { questionSetHeaderId } = body;

    if (!surveyId) {
      return NextResponse.json(
        { error: 'Survey ID is required' },
        { status: 400 }
      );
    }

    if (!questionSetHeaderId) {
      return NextResponse.json(
        { error: 'Question Set Header ID is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if the question set is already assigned to this survey
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM SurveyTemplateQuestion 
      WHERE SurveyTemplateHeaderID = @surveyId 
      AND QuestionSetHeaderID = @questionSetHeaderId
      AND isActive = 1
    `;

    const checkRequest = db.request();
    checkRequest.input('surveyId', sql.Int, parseInt(surveyId));
    checkRequest.input('questionSetHeaderId', sql.Int, parseInt(questionSetHeaderId));
    const checkResult = await checkRequest.query(checkQuery);

    if (checkResult.recordset[0].count > 0) {
      return NextResponse.json(
        { error: 'Question set is already assigned to this survey' },
        { status: 400 }
      );
    }

    // Get the next sort order
    const sortOrderQuery = `
      SELECT ISNULL(MAX(SortOrder), 0) + 1 as nextSortOrder
      FROM SurveyTemplateQuestion 
      WHERE SurveyTemplateHeaderID = @surveyId
    `;

    const sortOrderRequest = db.request();
    sortOrderRequest.input('surveyId', sql.Int, parseInt(surveyId));
    const sortOrderResult = await sortOrderRequest.query(sortOrderQuery);
    const nextSortOrder = sortOrderResult.recordset[0].nextSortOrder;

    // Insert the new survey template question
    const insertQuery = `
      INSERT INTO SurveyTemplateQuestion (SurveyTemplateHeaderID, QuestionSetHeaderID, SortOrder, isActive)
      OUTPUT INSERTED.ID, INSERTED.SurveyTemplateHeaderID, INSERTED.QuestionSetHeaderID, INSERTED.SortOrder, INSERTED.isActive
      VALUES (@surveyId, @questionSetHeaderId, @sortOrder, 1)
    `;

    const insertRequest = db.request();
    insertRequest.input('surveyId', sql.Int, parseInt(surveyId));
    insertRequest.input('questionSetHeaderId', sql.Int, parseInt(questionSetHeaderId));
    insertRequest.input('sortOrder', sql.Int, nextSortOrder);
    const insertResult = await insertRequest.query(insertQuery);

    const newRecord = insertResult.recordset[0];

    return NextResponse.json({
      success: true,
      data: {
        id: newRecord.ID,
        surveyTemplateHeaderId: newRecord.SurveyTemplateHeaderID,
        questionSetHeaderId: newRecord.QuestionSetHeaderID,
        sortOrder: newRecord.SortOrder,
        isActive: newRecord.isActive
      },
      message: 'Question set added to survey successfully'
    });

  } catch (error) {
    console.error('Error adding question set to survey:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to add question set to survey',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}