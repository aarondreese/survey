import { NextRequest, NextResponse } from 'next/server';
import { MetaAnswerService } from '@/services/metaQuestionService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const metaQuestionHeaderId = parseInt(idString);
    
    if (isNaN(metaQuestionHeaderId)) {
      return NextResponse.json(
        { error: 'Invalid meta-question ID' },
        { status: 400 }
      );
    }

    const answers = await MetaAnswerService.getByMetaQuestionId(metaQuestionHeaderId);
    return NextResponse.json(answers);
  } catch (error) {
    console.error('Error fetching meta-question answers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch answers' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const metaQuestionHeaderId = parseInt(idString);
    
    if (isNaN(metaQuestionHeaderId)) {
      return NextResponse.json(
        { error: 'Invalid meta-question ID' },
        { status: 400 }
      );
    }

    const data = await request.json();
    data.metaQuestionHeaderId = metaQuestionHeaderId;
    
    const answer = await MetaAnswerService.create(data);
    return NextResponse.json(answer, { status: 201 });
  } catch (error) {
    console.error('Error creating meta-question answer:', error);
    return NextResponse.json(
      { error: 'Failed to create answer' },
      { status: 500 }
    );
  }
}
