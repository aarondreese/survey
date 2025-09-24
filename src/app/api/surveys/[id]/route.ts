import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const surveyId = parseInt(params.id);

    if (isNaN(surveyId)) {
      return NextResponse.json(
        { error: 'Invalid survey ID' },
        { status: 400 }
      );
    }

    const pool = await getDatabase();
    
    const result = await pool.request()
      .input('surveyId', surveyId)
      .query(`
        SELECT 
          ID as id,
          Name as name,
          Description as description,
          EntityType as entityType,
          PageSplit as pageSplit,
          isActive as isActive
        FROM SurveyTemplateHeader 
        WHERE ID = @surveyId
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('Error fetching survey:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch survey',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const surveyId = parseInt(params.id);

    if (isNaN(surveyId)) {
      return NextResponse.json(
        { error: 'Invalid survey ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, entityType, pageSplit, isActive } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Survey name is required' },
        { status: 400 }
      );
    }

    const pool = await getDatabase();
    
    const result = await pool.request()
      .input('surveyId', surveyId)
      .input('name', name)
      .input('description', description || null)
      .input('entityType', entityType || 'Asset')
      .input('pageSplit', pageSplit || 'NONE')
      .input('isActive', isActive)
      .query(`
        UPDATE SurveyTemplateHeader 
        SET 
          Name = @name,
          Description = @description,
          EntityType = @entityType,
          PageSplit = @pageSplit,
          isActive = @isActive
        OUTPUT INSERTED.*
        WHERE ID = @surveyId
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }

    const updatedSurvey = result.recordset[0];
    
    // Convert column names to camelCase for response
    const responseData = {
      id: updatedSurvey.ID,
      name: updatedSurvey.Name,
      description: updatedSurvey.Description,
      entityType: updatedSurvey.EntityType,
      pageSplit: updatedSurvey.PageSplit,
      isActive: updatedSurvey.isActive
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Survey updated successfully'
    });

  } catch (error) {
    console.error('Survey update error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update survey',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const surveyId = parseInt(params.id);

    if (isNaN(surveyId)) {
      return NextResponse.json(
        { error: 'Invalid survey ID' },
        { status: 400 }
      );
    }

    const pool = await getDatabase();
    
    // Check if survey exists and get its data before deletion
    const checkResult = await pool.request()
      .input('surveyId', surveyId)
      .query(`
        SELECT ID, Name FROM SurveyTemplateHeader WHERE ID = @surveyId
      `);

    if (checkResult.recordset.length === 0) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }

    // Delete the survey
    await pool.request()
      .input('surveyId', surveyId)
      .query(`
        DELETE FROM SurveyTemplateHeader WHERE ID = @surveyId
      `);

    return NextResponse.json({
      success: true,
      message: `Survey "${checkResult.recordset[0].Name}" deleted successfully`
    });

  } catch (error) {
    console.error('Survey deletion error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete survey',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}