"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import HomeButton from "@/components/HomeButton";
import CreateButton from "@/components/CreateButton";
import { EditIcon, TrashIcon, HelpCircleIcon } from "@/components/icons";
import { MetaQuestionHeader, MetaQuestionAnswer } from "@/types/metaQuestion";
import { Survey } from "survey-react-ui";
import { Model } from "survey-core";
import { LayeredLight } from "survey-core/themes";
import "survey-core/survey-core.min.css";

export default function MetaQuestionsPage() {
  const [metaQuestions, setMetaQuestions] = useState<MetaQuestionHeader[]>([]);
  const [selectedMetaQuestion, setSelectedMetaQuestion] =
    useState<MetaQuestionHeader | null>(null);
  const [answers, setAnswers] = useState<MetaQuestionAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSurveyJson, setPreviewSurveyJson] = useState<object | null>(
    null
  );

  useEffect(() => {
    fetchMetaQuestions();
  }, []);

  const fetchMetaQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/meta-questions");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMetaQuestions(data);
    } catch (err) {
      console.error("Error fetching meta-questions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load meta-questions"
      );
    } finally {
      setLoading(false);
    }
  };

  const generateSurveyPreview = (
    metaQuestion: MetaQuestionHeader,
    answersList: MetaQuestionAnswer[]
  ) => {
    if (!answersList || answersList.length === 0) {
      setPreviewSurveyJson(null);
      return;
    }

    const choices = answersList
      .filter((a) => a.isActive)
      .map((a) => ({
        value: a.questionSetHeaderId,
        text: a.questionSetName || `Question Set ${a.questionSetHeaderId}`,
      }));

    const surveyJson = {
      pages: [
        {
          name: "page1",
          elements: [
            {
              type: "dropdown",
              name: "metaQuestionResponse",
              title: metaQuestion.description || "Select an option",
              isRequired: true,
              choices: choices,
              description:
                choices.length > 0
                  ? `Based on the user's selection, the corresponding question set will be dynamically added to the survey.`
                  : "No active question sets are linked to this meta-question.",
            },
          ],
        },
      ],
    };

    setPreviewSurveyJson(surveyJson);
  };

  const fetchAnswers = async (metaQuestion: MetaQuestionHeader) => {
    try {
      setAnswersLoading(true);
      setSelectedMetaQuestion(metaQuestion);

      const response = await fetch(
        `/api/meta-questions/${metaQuestion.id}/answers`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const answersList = Array.isArray(data) ? data : [];
      setAnswers(answersList);
      generateSurveyPreview(metaQuestion, answersList);
    } catch (err) {
      console.error("Error fetching answers:", err);
      setAnswers([]);
      setPreviewSurveyJson(null);
    } finally {
      setAnswersLoading(false);
    }
  };

  const handleDelete = async (id: number, code: string) => {
    if (
      !confirm(`Are you sure you want to delete the meta-question "${code}"?`)
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/meta-questions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete meta-question");
      }

      await fetchMetaQuestions();

      // Clear selection if the deleted item was selected
      if (selectedMetaQuestion?.id === id) {
        setSelectedMetaQuestion(null);
        setAnswers([]);
      }
    } catch (err) {
      console.error("Error deleting meta-question:", err);
      alert("Failed to delete meta-question");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="inline-block border-4 border-gray-300 border-t-blue-500 rounded-full w-8 h-8 animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading meta-questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 p-4 border border-red-200 rounded-lg text-red-700">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <HomeButton />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-bold text-2xl">Meta-Questions</h1>
          <p className="mt-1 text-gray-600">
            Manage conditional questions that trigger additional question sets
          </p>
        </div>
        <CreateButton href="/meta-questions/new">
          Create New Meta-Question
        </CreateButton>
      </div>

      {metaQuestions.length === 0 ? (
        <div className="bg-white shadow-md p-8 rounded-lg text-center">
          <HelpCircleIcon className="mx-auto mb-4 w-12 h-12 text-gray-300" />
          <p className="text-gray-500 text-lg">No meta-questions found</p>
          <p className="mt-2 text-gray-400 text-sm">
            Create your first meta-question to get started
          </p>
        </div>
      ) : (
        <div className="gap-6 grid grid-cols-1 lg:grid-cols-2">
          {/* Left column - Meta-questions list */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="divide-y divide-gray-200 min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metaQuestions.map((metaQuestion) => (
                  <tr
                    key={metaQuestion.id}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      selectedMetaQuestion?.id === metaQuestion.id
                        ? "bg-blue-50"
                        : ""
                    }`}
                    onClick={() => fetchAnswers(metaQuestion)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 text-sm">
                        {metaQuestion.id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 text-sm">
                        {metaQuestion.description || (
                          <span className="text-gray-400 italic">
                            No description
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-center items-center gap-2">
                        <Link
                          href={`/meta-questions/${metaQuestion.id}`}
                          className="text-blue-600 hover:text-blue-800"
                          title="View/Edit"
                        >
                          <EditIcon className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(
                              metaQuestion.id,
                              metaQuestion.description || "meta-question"
                            );
                          }}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right column - Preview */}
          <div className="bg-white shadow-md p-4 rounded-lg">
            {!selectedMetaQuestion ? (
              <div className="py-8 text-gray-500 text-center">
                <HelpCircleIcon className="mx-auto mb-4 w-12 h-12 text-gray-300" />
                <p className="text-sm">
                  Select a meta-question to preview the survey
                </p>
              </div>
            ) : answersLoading ? (
              <div className="py-8 text-gray-500 text-center">
                <div className="inline-block mb-2 border-2 border-gray-300 border-t-purple-500 rounded-full w-6 h-6 animate-spin"></div>
                <p className="text-sm">Loading survey preview...</p>
              </div>
            ) : !previewSurveyJson || answers.length === 0 ? (
              <div className="py-8 text-gray-500 text-center">
                <HelpCircleIcon className="mx-auto mb-4 w-12 h-12 text-gray-300" />
                <p className="text-sm">
                  No question sets linked to this meta-question
                </p>
                <p className="mt-1 text-gray-400 text-xs">
                  Add question sets to see the survey preview
                </p>
              </div>
            ) : (
              <div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div
                    className="bg-white shadow-sm rounded-md overflow-y-auto"
                    style={{ height: "calc(100vh - 300px)" }}
                  >
                    <Survey
                      model={(() => {
                        const model = new Model(previewSurveyJson);
                        model.showCompletedPage = false;
                        model.completeText = "Add To Survey";
                        model.applyTheme(LayeredLight);
                        return model;
                      })()}
                    />
                  </div>
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
      )}
    </div>
  );
}
