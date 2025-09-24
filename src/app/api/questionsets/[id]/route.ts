import { NextRequest, NextResponse } from 'next/server';
import { QuestionSetService } from '@/services/questionSetService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid question set ID' },
        { status: 400 }
      );
    }

    console.log(`GET /api/questionsets/${id} - Fetching question set`);
    
    const questionSet = await QuestionSetService.getById(id);
    
    if (!questionSet) {
      return NextResponse.json(
        { error: 'Question set not found' },
        { status: 404 }
      );
    }

    console.log('Question set found:', questionSet);

    return NextResponse.json({
      success: true,
      data: questionSet
    });

  } catch (error) {
    const { id: idString } = await params;
    console.error(`Error fetching question set ${idString}:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch question set',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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
        { error: 'Invalid question set ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log(`PUT /api/questionsets/${id} - Update data:`, body);

    const updatedQuestionSet = await QuestionSetService.update(id, body);
    
    if (!updatedQuestionSet) {
      return NextResponse.json(
        { error: 'Question set not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedQuestionSet
    });

  } catch (error) {
    const { id: idString } = await params;
    console.error(`Error updating question set ${idString}:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to update question set',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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
        { error: 'Invalid question set ID' },
        { status: 400 }
      );
    }

    console.log(`DELETE /api/questionsets/${id} - Deleting question set`);

    const success = await QuestionSetService.delete(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Question set not found or could not be deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Question set deleted successfully'
    });

  } catch (error) {
    const { id: idString } = await params;
    console.error(`Error deleting question set ${idString}:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to delete question set',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}