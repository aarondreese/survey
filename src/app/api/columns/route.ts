import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/database";

export async function GET() {
  try {
    // Get the actual column names from QuestionSetHeader
    const columns = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'QuestionSetHeader'
      ORDER BY ORDINAL_POSITION
    `);
    
    // Try to get one record to see the actual data structure
    let sampleRecord = null;
    try {
      const records = await executeQuery(`SELECT TOP 1 * FROM QuestionSetHeader`);
      if (records.length > 0) {
        sampleRecord = records[0];
      }
    } catch (error) {
      console.log("Sample record query failed:", error);
    }

    return NextResponse.json({
      success: true,
      actualColumns: columns.map((col) => (col as Record<string, unknown>).COLUMN_NAME),
      sampleRecord: sampleRecord,
      sampleRecordKeys: sampleRecord ? Object.keys(sampleRecord as Record<string, unknown>) : []
    });
  } catch (error) {
    console.error("Column discovery error:", error);
    return NextResponse.json(
      { error: `Column discovery failed: ${error}` },
      { status: 500 }
    );
  }
}