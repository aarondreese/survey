import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    const db = await getDatabase();
    const dbRequest = db.request();
    
    // Search by address line, postcode, or town
    dbRequest.input('SearchQuery', `%${query}%`);
    
    const result = await dbRequest.query(`
      SELECT TOP 20
        a.ID as AddressID,
        a.AddressLine1,
        a.AddressLine2,
        a.AddressLine3,
        a.Town,
        a.County,
        a.PostCode,
        a.UPRN,
        p.ID as PropertyID
      FROM HMS.Address a
      LEFT JOIN HMS.Property p ON a.ID = p.AddressID
      WHERE 
        a.AddressLine1 LIKE @SearchQuery
        OR a.AddressLine2 LIKE @SearchQuery
        OR a.Town LIKE @SearchQuery
        OR a.PostCode LIKE @SearchQuery
      ORDER BY a.AddressLine1, a.PostCode
    `);

    return NextResponse.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error searching addresses:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search addresses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
