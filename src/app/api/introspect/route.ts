import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/database";

export async function GET() {
  try {
    const results: {
      connection: boolean;
      headerSchema: unknown[];
      questionSchema: unknown[];
      sampleHeaders: unknown[];
      sampleQuestions: unknown[];
      errors: string[];
    } = {
      connection: false,
      headerSchema: [],
      questionSchema: [],
      sampleHeaders: [],
      sampleQuestions: [],
      errors: []
    };

    // Test connection
    try {
      await executeQuery('SELECT 1 as test');
      results.connection = true;
    } catch (error) {
      results.errors.push(`Connection test failed: ${error}`);
    }

    // Get QuestionSetHeader table schema
    try {
      const headerSchema = await executeQuery(`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE,
          COLUMN_DEFAULT,
          CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'QuestionSetHeader'
        ORDER BY ORDINAL_POSITION
      `);
      results.headerSchema = headerSchema;
    } catch (error) {
      results.errors.push(`Header schema query failed: ${error}`);
    }

    // Get QuestionSetQuestion table schema
    try {
      const questionSchema = await executeQuery(`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE,
          COLUMN_DEFAULT,
          CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'QuestionSetQuestion'
        ORDER BY ORDINAL_POSITION
      `);
      results.questionSchema = questionSchema;
    } catch (error) {
      results.errors.push(`Question schema query failed: ${error}`);
    }

    // Get sample data from QuestionSetHeader
    try {
      const sampleHeaders = await executeQuery(`SELECT TOP 5 * FROM QuestionSetHeader`);
      results.sampleHeaders = sampleHeaders;
    } catch (error) {
      results.errors.push(`Sample headers query failed: ${error}`);
    }

    // Get sample data from QuestionSetQuestion
    try {
      const sampleQuestions = await executeQuery(`SELECT TOP 5 * FROM QuestionSetQuestion`);
      results.sampleQuestions = sampleQuestions;
    } catch (error) {
      results.errors.push(`Sample questions query failed: ${error}`);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Database introspection error:", error);
    return NextResponse.json(
      { error: `Database introspection failed: ${error}` },
      { status: 500 }
    );
  }
}