import { NextResponse } from 'next/server';
import { SurveyRuleService } from '@/services/surveyRuleService';

// GET all database functions
export async function GET() {
  try {
    const functions = await SurveyRuleService.getDatabaseFunctions();
    return NextResponse.json(functions);
  } catch (error) {
    console.error('Error fetching database functions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch database functions' },
      { status: 500 }
    );
  }
}
