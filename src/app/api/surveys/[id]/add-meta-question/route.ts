import { NextRequest, NextResponse } from 'next/server';
import { SurveyTemplateQuestionService } from '@/services/surveyTemplateQuestionService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: surveyId } = await params;
    const body = await request.json();
    const { metaQuestionHeaderId } = body;

    if (!surveyId) {
      return NextResponse.json(
        { error: 'Survey ID is required' },
        { status: 400 }
      );
    }

    if (!metaQuestionHeaderId) {
      return NextResponse.json(
        { error: 'Meta-Question Header ID is required' },
        { status: 400 }
      );
    }

    const newId = await SurveyTemplateQuestionService.addMetaQuestion(
      parseInt(surveyId),
      parseInt(metaQuestionHeaderId)
    );

    return NextResponse.json({
      success: true,
      data: { id: newId },
      message: 'Meta-question added to survey successfully'
    });

  } catch (error) {
    console.error('Error adding meta-question to survey:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to add meta-question to survey',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
