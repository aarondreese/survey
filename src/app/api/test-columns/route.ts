import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/database";

export async function GET() {
  try {
    const testQueries = [];
    
    // Test various common column name variations
    const possibleDateColumns = [
      'CreatedDate', 'Created_Date', 'created_date', 'DateCreated', 'CreateDate',
      'CreatedOn', 'InsertDate', 'InsertedDate', 'Timestamp', 'CreateTime'
    ];
    
    const possibleDescColumns = [
      'Description', 'description', 'Desc', 'Notes', 'Comments'
    ];
    
    const possibleSourceColumns = [
      'SourceViewName', 'source_view_name', 'SourceView', 'ViewName', 'DataSource'
    ];
    
    // Try just basic columns first
    try {
      const basicResult = await executeQuery(`SELECT id, name FROM QuestionSetHeader`);
      testQueries.push({ query: 'id, name', success: true, count: basicResult.length });
    } catch (error) {
      testQueries.push({ query: 'id, name', success: false, error: `${error}` });
    }
    
    // Try with different date column names
    for (const dateCol of possibleDateColumns) {
      try {
        const result = await executeQuery(`SELECT id, name, ${dateCol} FROM QuestionSetHeader`);
        testQueries.push({ query: `id, name, ${dateCol}`, success: true, count: result.length });
        break; // Found working date column, stop trying
      } catch (error) {
        testQueries.push({ query: `id, name, ${dateCol}`, success: false, error: `${error}`.substring(0, 100) });
      }
    }
    
    return NextResponse.json({
      success: true,
      testResults: testQueries
    });
  } catch (error) {
    console.error("Column test error:", error);
    return NextResponse.json(
      { error: `Column test failed: ${error}` },
      { status: 500 }
    );
  }
}