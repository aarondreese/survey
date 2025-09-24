import { NextResponse } from "next/server";
import survey from "../surveyDefinition";

export async function GET() {
  return NextResponse.json(survey);
}
