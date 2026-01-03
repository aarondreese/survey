import { NextRequest, NextResponse } from 'next/server';
import { SurveyRuleService } from '@/services/surveyRuleService';

// GET all survey rules
export async function GET() {
  try {
    const rules = await SurveyRuleService.getAll();
    return NextResponse.json(rules);
  } catch (error) {
    console.error('Error fetching survey rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch survey rules' },
      { status: 500 }
    );
  }
}

// POST create new survey rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newRule = await SurveyRuleService.create(body);
    return NextResponse.json(newRule, { status: 201 });
  } catch (error) {
    console.error('Error creating survey rule:', error);
    return NextResponse.json(
      { error: 'Failed to create survey rule' },
      { status: 500 }
    );
  }
}
