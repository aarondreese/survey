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
    const records = await executeQuery(query);
    
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