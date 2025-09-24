import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/database";

export async function GET() {
  try {
    // First, let's see what tables exist
    const tables = await executeQuery(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    // Then check what columns exist in QuestionSetHeader
    let headerColumns: unknown[] = [];
    try {
      headerColumns = await executeQuery(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'QuestionSetHeader'
        ORDER BY ORDINAL_POSITION
      `);
    } catch (error) {
      console.log("QuestionSetHeader columns query failed:", error);
    }

    // Check what columns exist in QuestionSetQuestion
    let questionColumns: unknown[] = [];
    try {
      questionColumns = await executeQuery(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'QuestionSetQuestion'
        ORDER BY ORDINAL_POSITION
      `);
    } catch (error) {
      console.log("QuestionSetQuestion columns query failed:", error);
    }

    return NextResponse.json({
      success: true,
      data: {
        allTables: tables,
        questionSetHeaderColumns: headerColumns,
        questionSetQuestionColumns: questionColumns
      }
    });
  } catch (error) {
    console.error("Schema check error:", error);
    return NextResponse.json(
      { error: `Schema check failed: ${error}` },
      { status: 500 }
    );
  }
}