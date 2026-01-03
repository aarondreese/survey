import { NextRequest, NextResponse } from 'next/server';
import { MetaQuestionService } from '@/services/metaQuestionService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid meta-question ID' },
        { status: 400 }
      );
    }

    const metaQuestion = await MetaQuestionService.getWithAnswers(id);
    
    if (!metaQuestion) {
      return NextResponse.json(
        { error: 'Meta-question not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(metaQuestion);
  } catch (error) {
    console.error('Error fetching meta-question:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meta-question' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid meta-question ID' },
        { status: 400 }
      );
    }

    const data = await request.json();
    const metaQuestion = await MetaQuestionService.update(id, data);
    
    if (!metaQuestion) {
      return NextResponse.json(
        { error: 'Meta-question not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(metaQuestion);
  } catch (error) {
    console.error('Error updating meta-question:', error);
    return NextResponse.json(
      { error: 'Failed to update meta-question' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid meta-question ID' },
        { status: 400 }
      );
    }

    await MetaQuestionService.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meta-question:', error);
    return NextResponse.json(
      { error: 'Failed to delete meta-question' },
      { status: 500 }
    );
  }
}
