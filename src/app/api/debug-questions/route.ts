import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET() {
  console.log('=== DEBUGGING QUESTIONSETQUESTION TABLE ===');
  
  try {
    const pool = await getDatabase();
    console.log('Connected to MSSQL database successfully');

    // First, check if the table exists and get columns
    const columnsResult = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'QuestionSetQuestion'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Available columns:', columnsResult.recordset.map((r: { COLUMN_NAME: string }) => r.COLUMN_NAME));

    // Get total count
    const countResult = await pool.request().query(`
      SELECT COUNT(*) as total FROM QuestionSetQuestion
    `);
    
    console.log('Total records in table:', countResult.recordset[0].total);

    // Get all records to see what's there
    const dataResult = await pool.request().query(`
      SELECT * FROM QuestionSetQuestion
    `);
    
    console.log('Records found:', dataResult.recordset.length);
    
    if (dataResult.recordset.length > 0) {
      console.log('First record keys:', Object.keys(dataResult.recordset[0]));
      console.log('First record values:', Object.values(dataResult.recordset[0]));
      console.log('Full first record:', JSON.stringify(dataResult.recordset[0], null, 2));
    }

    return NextResponse.json({
      success: true,
      columns: columnsResult.recordset.map((r: { COLUMN_NAME: string }) => r.COLUMN_NAME),
      totalRecords: countResult.recordset[0].total,
      sampleRecords: dataResult.recordset.slice(0, 3) // First 3 records
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}