import { NextRequest, NextResponse } from 'next/server';
import { SurveyTemplateQuestionService } from '@/services/surveyTemplateQuestionService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: surveyId } = await params;

    if (!surveyId) {
      return NextResponse.json(
        { error: 'Survey ID is required' },
        { status: 400 }
      );
    }

    const availableMetaQuestions = await SurveyTemplateQuestionService.getAvailableMetaQuestions(
      parseInt(surveyId)
    );

    return NextResponse.json({
      success: true,
      data: availableMetaQuestions
    });

  } catch (error) {
    console.error('Error fetching available meta-questions:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch available meta-questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
