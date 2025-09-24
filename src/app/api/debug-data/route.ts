import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/database";

export async function GET() {
  try {
    // Get count of records
    const countResult = await executeQuery(`SELECT COUNT(*) as recordCount FROM QuestionSetHeader`);
    const recordCount = countResult.length > 0 ? (countResult[0] as Record<string, unknown>).recordCount : 0;

    // Get all records with details
    const allRecords = await executeQuery(`SELECT * FROM QuestionSetHeader`);
    
    // Get column information
    const columnInfo = await executeQuery(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'QuestionSetHeader'
      ORDER BY ORDINAL_POSITION
    `);

    return NextResponse.json({
      success: true,
      recordCount: recordCount,
      totalRecordsFound: allRecords.length,
      columns: columnInfo,
      records: allRecords,
      firstRecordDetails: allRecords.length > 0 ? {
        keys: Object.keys(allRecords[0] as Record<string, unknown>),
        values: Object.values(allRecords[0] as Record<string, unknown>),
        fullRecord: allRecords[0]
      } : null
    });
  } catch (error) {
    console.error("Debug query error:", error);
    return NextResponse.json(
      { error: `Debug query failed: ${error}` },
      { status: 500 }
    );
  }
}