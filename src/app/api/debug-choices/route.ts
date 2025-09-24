import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET() {
  console.log('=== DEBUGGING CHOICES DATA ===');
  
  try {
    const pool = await getDatabase();
    console.log('Connected to MSSQL database successfully');

    // Get all records with non-null choices
    const dataResult = await pool.request().query(`
      SELECT ID, FieldName, AttributeLabel, SurveyLabel, DisplayType, Choices, SortOrder
      FROM QuestionSetQuestion 
      WHERE Choices IS NOT NULL AND Choices != ''
      ORDER BY SortOrder ASC
    `);
    
    console.log('Questions with choices found:', dataResult.recordset.length);
    
    if (dataResult.recordset.length > 0) {
      dataResult.recordset.forEach((record, index) => {
        console.log(`Question ${index + 1}:`, {
          id: record.ID,
          fieldName: record.FieldName,
          label: record.AttributeLabel,
          choices: record.Choices,
          displayType: record.DisplayType
        });
      });
    }

    return NextResponse.json({
      success: true,
      questionsWithChoices: dataResult.recordset.length,
      questions: dataResult.recordset
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}