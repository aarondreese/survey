import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { parseRowJsonFields, parseRecordsetJsonFields } from '@/lib/parseDbJson';
import sql from 'mssql';

// Increase body size limit for this route
export const maxDuration = 60; // Max duration in seconds
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Read the body as text first to avoid size limits in request.json()
    const text = await request.text();
    console.log('Received body length:', text.length, 'characters');
    const body = JSON.parse(text);
    const { 
      surveyTemplateHeaderId, 
      entityReference, 
      surveyJson,
      surveyInstanceId: existingInstanceId,
      chunk,
      chunkIndex,
      totalChunks
    } = body;

    // Handle chunked upload
    if (chunk !== undefined) {
      console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks}`);
      
      const db = await getDatabase();
      
      if (chunkIndex === 0) {
        // First chunk: Create the instance with placeholder
        const dbRequest = db.request();
        dbRequest.input('SurveyTemplateHeaderID', sql.Int, surveyTemplateHeaderId);
        dbRequest.input('EntityReference', sql.VarChar(100), entityReference);
        dbRequest.input('ChunkData', sql.NVarChar(sql.MAX), chunk);
        // Debug: log whether first chunk contains meta-contents
        try {
          const containsMeta = typeof chunk === 'string' && chunk.indexOf('meta-contents') !== -1;
          console.log(`POST /api/survey-instance first chunk contains meta-contents: ${containsMeta}`);
          if (containsMeta) console.log('POST /api/survey-instance chunk excerpt:', chunk.substring(0, 1000));
        } catch (e) {
          console.warn('POST /api/survey-instance failed to inspect chunk for meta-contents');
        }

        const result = await dbRequest.query(
          `INSERT INTO SurveyInstance 
            (SurveyTemplateHeaderID, EntityReference, SurveyJSON, InstanceCreatedDate)
           OUTPUT INSERTED.ID
           VALUES (@SurveyTemplateHeaderID, @EntityReference, @ChunkData, GETDATE())`
        );
        
        const newInstanceId = result.recordset[0].ID;
        console.log(`Created instance ${newInstanceId} with first chunk`);
        
        return NextResponse.json({
          success: true,
          surveyInstanceId: newInstanceId,
          message: `Chunk ${chunkIndex + 1}/${totalChunks} saved`
        });
      } else {
        // Subsequent chunks: Append to existing JSON
        const dbRequest = db.request();
        dbRequest.input('ID', sql.Int, existingInstanceId);
        dbRequest.input('ChunkData', sql.NVarChar(sql.MAX), chunk);
        
        // Use string concatenation to append chunks
        await dbRequest.query(
          `UPDATE SurveyInstance 
           SET SurveyJSON = ISNULL(CAST(SurveyJSON AS NVARCHAR(MAX)), '') + CAST(@ChunkData AS NVARCHAR(MAX))
           WHERE ID = @ID`
        );
        
        console.log(`Appended chunk ${chunkIndex + 1}/${totalChunks} to instance ${existingInstanceId}`);
        
        return NextResponse.json({
          success: true,
          surveyInstanceId: existingInstanceId,
          message: `Chunk ${chunkIndex + 1}/${totalChunks} saved`
        });
      }
    }

    // Handle non-chunked upload (legacy support)
    if (!surveyTemplateHeaderId || !entityReference) {
      return NextResponse.json(
        { error: 'SurveyTemplateHeaderId and EntityReference are required' },
        { status: 400 }
      );
    }

    // Insert new survey instance (legacy non-chunked)
    const db = await getDatabase();
    const dbRequest = db.request();
    
    const jsonString = surveyJson ? JSON.stringify(surveyJson) : null;
    console.log('JSON string length for DB:', jsonString?.length, 'characters');
    
    dbRequest.input('SurveyTemplateHeaderID', sql.Int, surveyTemplateHeaderId);
    dbRequest.input('EntityReference', sql.VarChar(100), entityReference);
    // Use NVARCHAR(MAX) to avoid truncation
    dbRequest.input('SurveyJSON', sql.NVarChar(sql.MAX), jsonString);
    
    const result = await dbRequest.query(
      `INSERT INTO SurveyInstance 
        (SurveyTemplateHeaderID, EntityReference, SurveyJSON, InstanceCreatedDate)
       OUTPUT INSERTED.ID
       VALUES (@SurveyTemplateHeaderID, @EntityReference, @SurveyJSON, GETDATE())`
    );

    const legacyInstanceId = result.recordset[0].ID;

    return NextResponse.json({
      success: true,
      surveyInstanceId: legacyInstanceId,
      message: 'Survey instance created successfully'
    });

  } catch (error) {
    console.error('Error creating survey instance:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create survey instance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Get specific survey instance
      const db = await getDatabase();
      const dbRequest = db.request();
      dbRequest.input('ID', sql.Int, parseInt(id));

      // Execute stored procedure that returns the survey instance detail
      const result = await dbRequest.execute('api.SurveyInstance_GetByID');

      if (result.recordset.length === 0) {
        return NextResponse.json(
          { error: 'Survey instance not found' },
          { status: 404 }
        );
      }

      // Parse JSON string fields so the response contains real objects
      const row = parseRowJsonFields(result.recordset[0] as any) as any;

      return NextResponse.json({
        success: true,
        data: row,
      });
    } else {
      // Get all survey instances via stored procedure
      const db = await getDatabase();
      const dbRequest = db.request();
      const result = await dbRequest.execute('api.SurveyInstance_GetAll');

      return NextResponse.json({
        success: true,
        data: parseRecordsetJsonFields(result.recordset as any),
      });
    }

  } catch (error) {
    console.error('Error fetching survey instances:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch survey instances',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const text = await request.text();
    console.log('PUT - Received body length:', text.length, 'characters');
    const body = JSON.parse(text);
    const { 
      id,
      completedJson,
      completedDate 
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Survey instance ID is required' },
        { status: 400 }
      );
    }

    // Update survey instance with completed data
    const db = await getDatabase();
    const dbRequest = db.request();
    
    const jsonString = completedJson ? JSON.stringify(completedJson) : null;
    console.log('PUT - JSON string length for DB:', jsonString?.length, 'characters');
    
    dbRequest.input('ID', sql.Int, id);
    // Use NVARCHAR(MAX) to avoid truncation
    dbRequest.input('CompletedJSON', sql.NVarChar(sql.MAX), jsonString);
    dbRequest.input('CompletedDate', sql.DateTime, completedDate || new Date());
    
    await dbRequest.query(
      `UPDATE SurveyInstance 
       SET CompletedJSON = @CompletedJSON,
           CompletedDate = @CompletedDate
       WHERE ID = @ID`
    );

    return NextResponse.json({
      success: true,
      message: 'Survey instance updated successfully'
    });

  } catch (error) {
    console.error('Error updating survey instance:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update survey instance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
