import { NextResponse } from 'next/server';
import { MetaQuestionService } from '@/services/metaQuestionService';

export async function GET() {
  try {
    const metaQuestions = await MetaQuestionService.getAll();
    return NextResponse.json(metaQuestions);
  } catch (error) {
    console.error('Error fetching meta-questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meta-questions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const metaQuestion = await MetaQuestionService.create(data);
    return NextResponse.json(metaQuestion, { status: 201 });
  } catch (error) {
    console.error('Error creating meta-question:', error);
    return NextResponse.json(
      { error: 'Failed to create meta-question' },
      { status: 500 }
    );
  }
}
