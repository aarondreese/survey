import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, sql } from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: surveyId } = await params;
    const body = await request.json();
    const { reorderedItems } = body;

    if (!surveyId) {
      return NextResponse.json(
        { error: 'Survey ID is required' },
        { status: 400 }
      );
    }

    if (!reorderedItems || !Array.isArray(reorderedItems)) {
      return NextResponse.json(
        { error: 'Reordered items array is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const transaction = db.transaction();

    try {
      await transaction.begin();

      // First, set all sort orders to negative values to avoid unique constraint violations
      const tempUpdateQuery = `
        UPDATE SurveyTemplateQuestion 
        SET SortOrder = -SortOrder - 1000
        WHERE SurveyTemplateHeaderID = @surveyId
      `;
      
      const tempRequest = transaction.request();
      tempRequest.input('surveyId', sql.Int, parseInt(surveyId));
      await tempRequest.query(tempUpdateQuery);

      // Then update with the new sort orders
      for (let i = 0; i < reorderedItems.length; i++) {
        const item = reorderedItems[i];
        const newSortOrder = i + 1;

        const updateQuery = `
          UPDATE SurveyTemplateQuestion 
          SET SortOrder = @sortOrder
          WHERE ID = @id AND SurveyTemplateHeaderID = @surveyId
        `;

        const updateRequest = transaction.request();
        updateRequest.input('id', sql.Int, item.id);
        updateRequest.input('sortOrder', sql.Int, newSortOrder);
        updateRequest.input('surveyId', sql.Int, parseInt(surveyId));
        await updateRequest.query(updateQuery);
      }

      await transaction.commit();

      return NextResponse.json({
        success: true,
        message: 'Question sets reordered successfully'
      });

    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }

  } catch (error) {
    console.error('Error reordering survey template questions:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to reorder question sets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}