import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/database";

export async function GET() {
  try {
    console.log("=== DEBUGGING QUESTIONSETHEADER TABLE ===");
    
    // Get column names
    const columns = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'QuestionSetHeader'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log("Available columns:", columns.map(col => (col as Record<string, unknown>).COLUMN_NAME));
    
    // Get record count
    const countResult = await executeQuery(`SELECT COUNT(*) as total FROM QuestionSetHeader`);
    const totalRecords = countResult.length > 0 ? (countResult[0] as Record<string, unknown>).total : 0;
    
    console.log("Total records in table:", totalRecords);
    
    // Get all records
    const records = await executeQuery(`SELECT * FROM QuestionSetHeader`);
    
    console.log("Records found:", records.length);
    
    if (records.length > 0) {
      console.log("First record keys:", Object.keys(records[0] as Record<string, unknown>));
      console.log("First record values:", Object.values(records[0] as Record<string, unknown>));
      console.log("Full first record:", JSON.stringify(records[0], null, 2));
    }
    
    return NextResponse.json({
      success: true,
      message: "Check terminal console for detailed debug info",
      summary: {
        columnsFound: columns.length,
        recordsFound: records.length,
        totalFromCount: totalRecords
      }
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: `Debug failed: ${error}` },
      { status: 500 }
    );
  }
}