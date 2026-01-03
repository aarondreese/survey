import { NextRequest, NextResponse } from 'next/server';
import { SurveyRuleService } from '@/services/surveyRuleService';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// GET single survey rule
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const rule = await SurveyRuleService.getById(parseInt(id));
    
    if (!rule) {
      return NextResponse.json(
        { error: 'Survey rule not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(rule);
  } catch (error) {
    console.error('Error fetching survey rule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch survey rule' },
      { status: 500 }
    );
  }
}

// PUT update survey rule
export async function PUT(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const updatedRule = await SurveyRuleService.update(parseInt(id), body);
    
    if (!updatedRule) {
      return NextResponse.json(
        { error: 'Survey rule not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedRule);
  } catch (error) {
    console.error('Error updating survey rule:', error);
    return NextResponse.json(
      { error: 'Failed to update survey rule' },
      { status: 500 }
    );
  }
}

// DELETE survey rule
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    await SurveyRuleService.delete(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting survey rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete survey rule' },
      { status: 500 }
    );
  }
}
