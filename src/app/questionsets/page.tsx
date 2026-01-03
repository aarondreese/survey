"use client";
import { useState, useEffect } from "react";
import { QuestionSetHeader, QuestionSetQuestion } from "@/types/questionsets";
import HomeButton from "@/components/HomeButton";
import CreateButton from "@/components/CreateButton";
import ListCard from "@/components/ListCard";
import ActionButton from "@/components/ActionButton";
import { EditIcon, PencilIcon, DocumentIcon } from "@/components/icons";
import { Survey } from "survey-react-ui";
import { Model } from "survey-core";
import { LayeredLight } from "survey-core/themes";
import "survey-core/survey-core.min.css";

export default function QuestionSetsPage() {
  const [questionSets, setQuestionSets] = useState<QuestionSetHeader[]>([]);
  const [selectedQuestionSet, setSelectedQuestionSet] =
    useState<QuestionSetHeader | null>(null);
  const [questions, setQuestions] = useState<QuestionSetQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [previewSurveyJson, setPreviewSurveyJson] = useState<object | null>(
    null
  );

  // Load all question sets on component mount
  useEffect(() => {
    fetchQuestionSets();
  }, []);

  const fetchQuestionSets = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/questionsets");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Handle both array response and object with data property
      const questionSetsData = Array.isArray(data) ? data : data.data || [];

      setQuestionSets(questionSetsData);
    } catch (error) {
      console.error("Error fetching question sets:", error);
      setQuestionSets([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const generateSurveyPreview = (
    questionsList: QuestionSetQuestion[],
    questionSetData: QuestionSetHeader,
    sourceData: Record<string, unknown>[] = []
  ) => {
    if (!questionsList || questionsList.length === 0) {
      setPreviewSurveyJson(null);
      return;
    }

    const enabledQuestions = questionsList.filter((q) => q.isVisible);

    const surveyElements = enabledQuestions.map((question) => {
      const element: Record<string, unknown> = {
        type: getSurveyJSType(question.displayType),
        name: question.fieldName,
        title: question.surveyLabel || question.attributeLabel,
        isRequired: question.isRequired,
        readOnly: question.isReadOnly,
      };

      // Set inputType for date fields
      if (question.displayType.toLowerCase() === "date") {
        element.inputType = "date";
      }

      // Set inputType for number fields
      if (question.displayType.toLowerCase() === "number") {
        element.inputType = "number";
      }

      // Add placeholder if available
      if (question.placeholder) {
        element.placeholder = question.placeholder;
      }

      // Add description if available
      if (question.description) {
        element.description = question.description;
      }

      // Handle choices for dropdown/radio/checkbox - try source data first, then saved choices
      if (
        ["dropdown", "radiogroup", "checkbox"].includes(element.type as string)
      ) {
        // First try to get options from source view data
        const matchingSourceRecord = sourceData.find((record) => {
          const sourceFieldName = String(
            record.fieldName || record.label || ""
          );
          return sourceFieldName === question.fieldName;
        });

        let choices: Array<{ value: unknown; text: string }> = [];

        if (matchingSourceRecord) {
          const optionsJson = String(matchingSourceRecord.options || "");
          if (optionsJson && optionsJson.trim() !== "") {
            try {
              const parsedOptions = JSON.parse(optionsJson);
              if (Array.isArray(parsedOptions)) {
                choices = parsedOptions.map((choice: unknown) => {
                  if (
                    typeof choice === "object" &&
                    choice !== null &&
                    "Text" in choice
                  ) {
                    const choiceObj = choice as Record<string, unknown>;
                    return {
                      value:
                        choiceObj.Value || choiceObj.value || choiceObj.Text,
                      text: String(
                        choiceObj.Text ||
                          choiceObj.text ||
                          choiceObj.Value ||
                          choiceObj.value
                      ),
                    };
                  }
                  return { value: choice, text: String(choice) };
                });
              }
            } catch (error) {
              console.error("Error parsing options from source view:", error);
            }
          }
        }

        // Fallback to saved choices if no source data options
        if (choices.length === 0 && question.choices) {
          try {
            const parsedChoices = JSON.parse(question.choices);
            if (Array.isArray(parsedChoices)) {
              choices = parsedChoices.map((choice: unknown) => {
                if (
                  typeof choice === "object" &&
                  choice !== null &&
                  "value" in choice
                ) {
                  const choiceObj = choice as Record<string, unknown>;
                  return {
                    value: choiceObj.value,
                    text: String(
                      choiceObj.Text || choiceObj.text || choiceObj.value
                    ),
                  };
                }
                return { value: choice, text: String(choice) };
              });
            }
          } catch (error) {
            console.error("Error parsing saved choices:", error);
          }
        }

        if (choices.length > 0) {
          element.choices = choices;
        }
      }

      // Handle numeric ranges
      if (question.displayType === "number") {
        if (question.minValue !== undefined) element.min = question.minValue;
        if (question.maxValue !== undefined) element.max = question.maxValue;
      }

      return element;
    });

    const surveyJson = {
      title: questionSetData.name || "Question Set Preview",
      description: questionSetData.description || "",
      pages: [
        {
          name: "page1",
          elements: surveyElements,
        },
      ],
    };

    setPreviewSurveyJson(surveyJson);
  };

  const getSurveyJSType = (displayType: string): string => {
    const typeMap: Record<string, string> = {
      text: "text",
      textarea: "comment",
      number: "text",
      date: "text",
      dropdown: "dropdown",
      radio: "radiogroup",
      checkbox: "checkbox",
      rating: "rating",
    };

    return typeMap[displayType.toLowerCase()] || "text";
  };

  const fetchQuestions = async (
    questionSetId: number,
    questionSetData: QuestionSetHeader
  ) => {
    try {
      setQuestionsLoading(true);

      // Fetch questions
      const questionsResponse = await fetch(
        `/api/questionsets/${questionSetId}/questions`
      );

      if (!questionsResponse.ok) {
        throw new Error(`HTTP error! status: ${questionsResponse.status}`);
      }

      const questionsData = await questionsResponse.json();
      const questions = Array.isArray(questionsData)
        ? questionsData
        : questionsData.data || [];

      // Fetch source view data if available
      let sourceData: Record<string, unknown>[] = [];
      if (questionSetData.sourceViewName) {
        try {
          const sourceResponse = await fetch(
            `/api/database-data?viewName=${encodeURIComponent(
              questionSetData.sourceViewName
            )}`
          );
          if (sourceResponse.ok) {
            const sourceResult = await sourceResponse.json();
            sourceData = sourceResult.records || [];
          }
        } catch (error) {
          console.error("Error fetching source view data:", error);
        }
      }

      setQuestions(questions);
      generateSurveyPreview(questions, questionSetData, sourceData);
    } catch (error) {
      console.error("Error fetching questions:", error);
      setQuestions([]);
      setPreviewSurveyJson(null);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleQuestionSetSelect = (questionSet: QuestionSetHeader) => {
    setSelectedQuestionSet(questionSet);
    fetchQuestions(questionSet.id, questionSet);
  };

  if (loading) {
    return <div className="p-4">Loading question sets...</div>;
  }

  return (
    <div className="p-6">
      <HomeButton />

      <div className="flex justify-between items-center mb-6">
        <h1 className="font-bold text-2xl">Question Sets</h1>
        <CreateButton href="/questionsets/new">
          Create New Question Set
        </CreateButton>
      </div>

      <div className="gap-6 grid grid-cols-1 lg:grid-cols-2">
        {/* Question Sets List */}
        <div className="bg-white shadow-md p-4 rounded-lg">
          <h2 className="mb-4 font-semibold text-lg">Question Set Headers</h2>

          {questionSets.length === 0 ? (
            <p className="text-gray-500">No question sets found.</p>
          ) : (
            <div className="space-y-2">
              {questionSets.map((questionSet) => (
                <ListCard
                  key={questionSet.id}
                  isSelected={selectedQuestionSet?.id === questionSet.id}
                  onClick={() => handleQuestionSetSelect(questionSet)}
                >
                  <div>
                    <div className="font-medium">{questionSet.name}</div>
                    {questionSet.description && (
                      <div className="mt-1 text-gray-600 text-sm">
                        {questionSet.description}
                      </div>
                    )}
                    <div className="mt-1 text-gray-500 text-xs">
                      ID: {questionSet.id}
                      {questionSet.subscript && (
                        <span className="ml-2">
                          Type: {questionSet.subscript}
                        </span>
                      )}
                      {questionSet.sourceViewName && (
                        <span className="ml-2">
                          Source: {questionSet.sourceViewName}
                        </span>
                      )}
                      {selectedQuestionSet?.id === questionSet.id &&
                        questions.length > 0 && (
                          <span className="ml-2">
                            Questions: {questions.length} (
                            {questions.filter((q) => q.isVisible).length}{" "}
                            visible)
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex justify-end gap-2 mt-3 pt-2 border-gray-100 border-t">
                    <ActionButton
                      href={`/questionsets/${questionSet.id}/edit`}
                      variant="green"
                      icon={<PencilIcon />}
                    >
                      Edit Header
                    </ActionButton>
                    <ActionButton
                      href={`/questionsets/${questionSet.id}/configure`}
                      variant="blue"
                      icon={<EditIcon />}
                    >
                      Edit Questions
                    </ActionButton>
                  </div>
                </ListCard>
              ))}
            </div>
          )}
        </div>

        {/* Survey Preview */}
        <div className="bg-white shadow-md p-4 rounded-lg">
          {!selectedQuestionSet ? (
            <div className="py-8 text-gray-500 text-center">
              <DocumentIcon className="mx-auto mb-4 w-12 h-12 text-gray-300" />
              <p className="text-sm">
                Select a question set to preview the survey
              </p>
            </div>
          ) : questionsLoading ? (
            <div className="py-8 text-gray-500 text-center">
              <div className="inline-block mb-2 border-2 border-gray-300 border-t-blue-500 rounded-full w-6 h-6 animate-spin"></div>
              <p className="text-sm">Loading survey preview...</p>
            </div>
          ) : !previewSurveyJson || questions.length === 0 ? (
            <div className="py-8 text-gray-500 text-center">
              <DocumentIcon className="mx-auto mb-4 w-12 h-12 text-gray-300" />
              <p className="text-sm">
                No questions found for this question set
              </p>
              <p className="mt-1 text-gray-400 text-xs">
                Configure questions to see the survey preview
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div
                className="bg-white shadow-sm rounded-md overflow-y-auto"
                style={{ height: "calc(100vh - 200px)" }}
              >
                <Survey
                  model={(() => {
                    const model = new Model(previewSurveyJson);
                    // Allow interaction but don't save data
                    model.showCompletedPage = false;
                    // Apply the Layered Light theme
                    model.applyTheme(LayeredLight);
                    return model;
                  })()}
                />
              </div>
              <div className="mt-4 text-gray-500 text-xs text-center">
                This is an interactive preview - no data will be saved
              </div>

              {/* Debug Panel */}
              <div className="mt-4">
                <details className="bg-gray-800 rounded-lg overflow-hidden">
                  <summary className="hover:bg-gray-700 px-4 py-2 font-medium text-white text-sm cursor-pointer">
                    Debug: Survey JSON
                  </summary>
                  <div className="p-4 border-gray-700 border-t">
                    <pre className="overflow-x-auto font-mono text-green-400 text-xs">
                      {JSON.stringify(previewSurveyJson, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
