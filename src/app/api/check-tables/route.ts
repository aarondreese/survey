import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET() {
  try {
    const pool = await getDatabase();
    
    const result = await pool.request()
      .query(`
        SELECT TOP 5 
          FieldName, 
          DisplayType, 
          Choices 
        FROM QuestionSetQuestion 
        WHERE QuestionSetHeaderId = 2 
        AND Choices IS NOT NULL 
        AND Choices != ''
      `);

    return NextResponse.json({
      success: true,
      tables: result.recordset
    });

  } catch (error) {
    console.error('Error checking tables:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check tables',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}