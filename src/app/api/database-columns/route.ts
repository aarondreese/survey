import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

interface ColumnInfo {
  columnName: string;
  dataType: string;
  isNullable: string;
  maxLength: number | null;
  numericPrecision: number | null;
  numericScale: number | null;
  defaultValue: string | null;
  ordinalPosition: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const viewName = searchParams.get('viewName');

    if (!viewName) {
      return NextResponse.json(
        { error: 'View name is required' },
        { status: 400 }
      );
    }

    const pool = await getDatabase();
    
    // Get column information from the specified view
    const result = await pool.request()
      .input('viewName', viewName)
      .query(`
        SELECT 
          COLUMN_NAME as columnName,
          DATA_TYPE as dataType,
          IS_NULLABLE as isNullable,
          CHARACTER_MAXIMUM_LENGTH as maxLength,
          NUMERIC_PRECISION as numericPrecision,
          NUMERIC_SCALE as numericScale,
          COLUMN_DEFAULT as defaultValue,
          ORDINAL_POSITION as ordinalPosition
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'dbo' 
          AND TABLE_NAME = @viewName
        ORDER BY ORDINAL_POSITION
      `);

    const columns = result.recordset.map((col: ColumnInfo) => ({
      columnName: col.columnName,
      dataType: col.dataType,
      isNullable: col.isNullable === 'YES',
      maxLength: col.maxLength,
      numericPrecision: col.numericPrecision,
      numericScale: col.numericScale,
      defaultValue: col.defaultValue,
      ordinalPosition: col.ordinalPosition
    }));

    return NextResponse.json({
      success: true,
      viewName,
      columns
    });

  } catch (error) {
    console.error('Database columns fetch error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch database columns',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}