import { NextResponse } from "next/server";
import { QuestionService } from "@/services/questionSetService";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const questionSetId = parseInt(id);
    
    if (isNaN(questionSetId)) {
      return NextResponse.json(
        { error: "Invalid question set ID" },
        { status: 400 }
      );
    }
    
    const questions = await QuestionService.getByQuestionSetId(questionSetId);
    
    return NextResponse.json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}