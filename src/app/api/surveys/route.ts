import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET() {
  try {
    const pool = await getDatabase();
    
    const result = await pool.request()
      .query(`
        SELECT 
          ID as id,
          Name as name,
          Description as description,
          EntityType as entityType,
          PageSplit as pageSplit,
          isActive as isActive
        FROM SurveyTemplateHeader 
        ORDER BY ID DESC
      `);

    return NextResponse.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch surveys',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, entityType = 'Asset', pageSplit = 'NONE', isActive = true } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Survey name is required' },
        { status: 400 }
      );
    }

    const pool = await getDatabase();
    
    const result = await pool.request()
      .input('name', name)
      .input('description', description || null)
      .input('entityType', entityType)
      .input('pageSplit', pageSplit)
      .input('isActive', isActive)
      .query(`
        INSERT INTO SurveyTemplateHeader (Name, Description, EntityType, PageSplit, isActive)
        OUTPUT INSERTED.*
        VALUES (@name, @description, @entityType, @pageSplit, @isActive)
      `);

    if (result.recordset.length === 0) {
      throw new Error('Failed to create survey');
    }

    const createdSurvey = result.recordset[0];
    
    // Convert column names to camelCase for response
    const responseData = {
      id: createdSurvey.ID,
      name: createdSurvey.Name,
      description: createdSurvey.Description,
      entityType: createdSurvey.EntityType,
      pageSplit: createdSurvey.PageSplit,
      isActive: createdSurvey.isActive
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Survey created successfully'
    });

  } catch (error) {
    console.error('Survey creation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create survey',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}