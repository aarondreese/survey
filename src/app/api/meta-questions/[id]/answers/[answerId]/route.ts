import { NextRequest, NextResponse } from 'next/server';
import { MetaAnswerService } from '@/services/metaQuestionService';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ answerId: string }> }
) {
  try {
    const { answerId: answerIdString } = await params;
    const answerId = parseInt(answerIdString);
    
    if (isNaN(answerId)) {
      return NextResponse.json(
        { error: 'Invalid answer ID' },
        { status: 400 }
      );
    }

    const data = await request.json();
    const answer = await MetaAnswerService.update(answerId, data);
    
    if (!answer) {
      return NextResponse.json(
        { error: 'Answer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(answer);
  } catch (error) {
    console.error('Error updating meta-question answer:', error);
    return NextResponse.json(
      { error: 'Failed to update answer' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ answerId: string }> }
) {
  try {
    const { answerId: answerIdString } = await params;
    const answerId = parseInt(answerIdString);
    
    if (isNaN(answerId)) {
      return NextResponse.json(
        { error: 'Invalid answer ID' },
        { status: 400 }
      );
    }

    await MetaAnswerService.delete(answerId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meta-question answer:', error);
    return NextResponse.json(
      { error: 'Failed to delete answer' },
      { status: 500 }
    );
  }
}
