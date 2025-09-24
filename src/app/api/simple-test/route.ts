import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/database";

export async function GET() {
  try {
    // Just try to get the first few records without specifying columns
    const result = await executeQuery(`SELECT TOP 3 * FROM QuestionSetHeader`);
    
    return NextResponse.json({
      success: true,
      recordCount: result.length,
      sampleData: result,
      firstRecordKeys: result.length > 0 ? Object.keys(result[0] as Record<string, unknown>) : []
    });
  } catch (error) {
    console.error("Simple query error:", error);
    return NextResponse.json(
      { error: `Simple query failed: ${error}` },
      { status: 500 }
    );
  }
}