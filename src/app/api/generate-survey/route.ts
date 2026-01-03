import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, assetId } = body;

    if (!templateId || !assetId) {
      return NextResponse.json(
        { error: 'templateId and assetId are required' },
        { status: 400 }
      );
    }

    // Call the stored procedure
    const result = await executeQuery<{ ID: number; JSONText: string }>(
      `EXEC usp_GenerateSurvey @TemplateID = @templateId, @AssetID = @assetId`,
      { templateId, assetId }
    );

    // Parse the JSONText for each page since it's returned as a string
    const pages = result.map((page) => ({
      ID: page.ID,
      JSONText: page.JSONText,
      // Pre-parse the JSON to avoid double-escaping
      ParsedJSON: JSON.parse(page.JSONText)
    }));

    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Error generating survey:', error);
    return NextResponse.json(
      { error: 'Failed to generate survey' },
      { status: 500 }
    );
  }
}
