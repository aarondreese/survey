import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/database";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const viewName = searchParams.get('viewName');
    
    if (!viewName) {
      return NextResponse.json(
        { error: 'viewName parameter is required' },
        { status: 400 }
      );
    }

    // Validate view name to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(viewName)) {
      return NextResponse.json(
        { error: 'Invalid view name format' },
        { status: 400 }
      );
    }

    // Get data records from the view
    const query = `SELECT * FROM [${viewName}]`;
    const rawRecords = await executeQuery(query) as Record<string, unknown>[];
    
    // Normalize property names to camelCase
    const records = rawRecords.map((record) => {
      const normalized: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(record)) {
        // Convert PascalCase or snake_case to camelCase
        const camelKey = key
          .replace(/^[A-Z]/, (letter) => letter.toLowerCase()) // PascalCase to camelCase
          .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()); // snake_case to camelCase
        
        normalized[camelKey] = value;
      }
      
      return normalized;
    });
    
    return NextResponse.json({
      success: true,
      viewName: viewName,
      recordCount: records.length,
      records: records
    });
  } catch (error) {
    console.error("Database data query error:", error);
    return NextResponse.json(
      { error: `Failed to fetch data from view: ${error}` },
      { status: 500 }
    );
  }
}