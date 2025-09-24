import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET() {
  try {
    const pool = await getDatabase();
    console.log('Connected to MSSQL database successfully');

    // Get all views in the dbo schema
    const result = await pool.request().query(`
      SELECT 
        TABLE_NAME as viewName,
        TABLE_SCHEMA as schemaName
      FROM INFORMATION_SCHEMA.VIEWS 
      WHERE TABLE_SCHEMA = 'dbo'
      ORDER BY TABLE_NAME ASC
    `);
    
    console.log('Database views found:', result.recordset.length);

    return NextResponse.json({
      success: true,
      views: result.recordset.map(row => ({
        name: row.viewName,
        schema: row.schemaName,
        fullName: `${row.schemaName}.${row.viewName}`
      }))
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}