"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  SurveyTemplateQuestion,
  AvailableMetaQuestion,
  isQuestionSetItem,
  isMetaQuestionItem,
} from "@/types/surveys";
import {
  PlusIcon,
  HelpCircleIcon,
  DocumentIcon,
  DotsVerticalIcon,
  SettingsIcon,
  CircleIcon,
  DotsHorizontalIcon,
} from "@/components/icons";

interface SurveyTemplateHeader {
  id: number;
  name: string;
  description?: string;
  entityType: string;
  pageSplit: string;
  isActive: boolean;
}

interface AvailableQuestionSet {
  id: number;
  name: string;
  description?: string;
  sourceViewName?: string;
  subscript?: string;
  questionCount: number;
}

export default function SurveyConfigurePage() {
  const params = useParams();
  const surveyId = params.id as string;

  const [surveyTemplate, setSurveyTemplate] =
    useState<SurveyTemplateHeader | null>(null);
  const [templateQuestions, setTemplateQuestions] = useState<
    SurveyTemplateQuestion[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<"questionset" | "metaquestion">(
    "questionset"
  );
  const [availableQuestionSets, setAvailableQuestionSets] = useState<
    AvailableQuestionSet[]
  >([]);
  const [availableMetaQuestions, setAvailableMetaQuestions] = useState<
    AvailableMetaQuestion[]
  >([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  const fetchSurveyTemplateData = React.useCallback(async () => {
    try {
      setLoading(true);

      // Fetch survey template header
      const headerResponse = await fetch(`/api/surveys/${surveyId}`);
      if (!headerResponse.ok) {
        throw new Error("Failed to fetch survey template");
      }
      const headerData = await headerResponse.json();
      setSurveyTemplate(headerData.data);

      // Fetch survey template questions with enriched data
      const questionsResponse = await fetch(
        `/api/surveys/${surveyId}/questions`
      );
      if (!questionsResponse.ok) {
        throw new Error("Failed to fetch survey template questions");
      }
      const questionsData = await questionsResponse.json();
      setTemplateQuestions(questionsData.data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load survey template data"
      );
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    if (surveyId) {
      fetchSurveyTemplateData();
    }
  }, [surveyId, fetchSurveyTemplateData]);

  const fetchAvailableQuestionSets = React.useCallback(async () => {
    try {
      setLoadingAvailable(true);
      const response = await fetch(
        `/api/surveys/${surveyId}/available-questionsets`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch available question sets");
      }
      const data = await response.json();
      setAvailableQuestionSets(data.data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load available question sets"
      );
    } finally {
      setLoadingAvailable(false);
    }
  }, [surveyId]);

  const fetchAvailableMetaQuestions = React.useCallback(async () => {
    try {
      setLoadingAvailable(true);
      const response = await fetch(
        `/api/surveys/${surveyId}/available-meta-questions`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch available meta-questions");
      }
      const data = await response.json();
      setAvailableMetaQuestions(data.data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load available meta-questions"
      );
    } finally {
      setLoadingAvailable(false);
    }
  }, [surveyId]);

  const handleAddQuestionSet = async (questionSetId: number) => {
    try {
      setAdding(true);
      setError(null);

      const response = await fetch(`/api/surveys/${surveyId}/add-questionset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionSetHeaderId: questionSetId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add question set");
      }

      // Refresh the survey template data and available question sets
      await fetchSurveyTemplateData();
      await fetchAvailableQuestionSets();
      setShowAddModal(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add question set"
      );
    } finally {
      setAdding(false);
    }
  };

  const handleAddMetaQuestion = async (metaQuestionId: number) => {
    try {
      setAdding(true);
      setError(null);

      const response = await fetch(
        `/api/surveys/${surveyId}/add-meta-question`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            metaQuestionHeaderId: metaQuestionId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add meta-question");
      }

      // Refresh the survey template data and available meta-questions
      await fetchSurveyTemplateData();
      await fetchAvailableMetaQuestions();
      setShowAddModal(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add meta-question"
      );
    } finally {
      setAdding(false);
    }
  };

  const handleOpenAddQuestionSetModal = async () => {
    setModalType("questionset");
    setShowAddModal(true);
    await fetchAvailableQuestionSets();
  };

  const handleOpenAddMetaQuestionModal = async () => {
    setModalType("metaquestion");
    setShowAddModal(true);
    await fetchAvailableMetaQuestions();
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    index: number
  ) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.currentTarget.outerHTML);
    e.currentTarget.style.opacity = "0.5";
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = "1";
    setDraggedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // Add visual feedback for drop target
    e.currentTarget.classList.add("border-t-2", "border-blue-500");
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove("border-t-2", "border-blue-500");
  };

  const handleDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    dropIndex: number
  ) => {
    e.preventDefault();

    // Clean up visual feedback
    e.currentTarget.classList.remove("border-t-2", "border-blue-500");

    if (draggedIndex === null) return;

    if (draggedIndex !== dropIndex) {
      const newQuestions = [...templateQuestions];
      const draggedQuestion = newQuestions[draggedIndex];

      // Remove dragged item
      newQuestions.splice(draggedIndex, 1);

      // Insert at new position
      newQuestions.splice(dropIndex, 0, draggedQuestion);

      // Update sort orders based on new positions
      const updatedQuestions = newQuestions.map((question, index) => ({
        ...question,
        sortOrder: index + 1,
      }));

      setTemplateQuestions(updatedQuestions);

      // Save the new order to the database
      await saveQuestionSetOrder(updatedQuestions);
    }

    setDraggedIndex(null);
  };

  const saveQuestionSetOrder = async (
    reorderedQuestions: SurveyTemplateQuestion[]
  ) => {
    try {
      setReordering(true);
      setError(null);

      const response = await fetch(
        `/api/surveys/${surveyId}/reorder-questionsets`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reorderedItems: reorderedQuestions.map((q) => ({
              id: q.id,
              sortOrder: q.sortOrder,
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reorder question sets");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reorder question sets"
      );
      // Refresh the data to get the correct order back
      await fetchSurveyTemplateData();
    } finally {
      setReordering(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto p-6 max-w-6xl">
        <div className="text-center">Loading survey template...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto p-6 max-w-6xl">
        <div className="text-red-600 text-center">Error: {error}</div>
        <div className="mt-4 text-center">
          <Link href="/surveys" className="text-blue-600 hover:underline">
            Back to Survey Templates
          </Link>
        </div>
      </div>
    );
  }

  if (!surveyTemplate) {
    return (
      <div className="mx-auto p-6 max-w-6xl">
        <div className="text-gray-600 text-center">
          Survey template not found
        </div>
        <div className="mt-4 text-center">
          <Link href="/surveys" className="text-blue-600 hover:underline">
            Back to Survey Templates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto p-6 max-w-6xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 text-gray-600 text-sm">
          <Link href="/surveys" className="hover:text-blue-600">
            Survey Templates
          </Link>
          <span>›</span>
          <span className="text-gray-900">{surveyTemplate.name}</span>
          <span>›</span>
          <span className="text-gray-900">Configure</span>
        </div>
        <h1 className="font-bold text-gray-900 text-3xl">
          Configure Survey Template
        </h1>
        <p className="mt-2 text-gray-600">
          Manage question sets and their configuration for this survey template
        </p>
      </div>

      {/* Survey Template Header Panel */}
      <div className="bg-white shadow-sm mb-6 border border-gray-200 rounded-lg">
        <div className="p-6 border-gray-200 border-b">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="font-semibold text-gray-900 text-xl">
                  {surveyTemplate.name}
                </h2>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    surveyTemplate.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {surveyTemplate.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              {surveyTemplate.description && (
                <p className="mb-4 text-gray-600">
                  {surveyTemplate.description}
                </p>
              )}
              <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
                <div>
                  <label className="font-medium text-gray-700 text-sm">
                    Template ID
                  </label>
                  <p className="text-gray-900 text-sm">{surveyTemplate.id}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700 text-sm">
                    Entity Type
                  </label>
                  <p className="text-gray-900 text-sm">
                    {surveyTemplate.entityType}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-gray-700 text-sm">
                    Page Split
                  </label>
                  <p className="text-gray-900 text-sm">
                    {surveyTemplate.pageSplit}
                  </p>
                </div>
              </div>
            </div>
            <div className="ml-6">
              <Link
                href={`/surveys/${surveyId}/edit`}
                className="inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100 px-3 py-2 border border-blue-200 rounded-md font-medium text-blue-600 text-sm"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit Template
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Question Sets List */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
        <div className="p-6 border-gray-200 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                Question Sets & Meta-Questions
              </h3>
              <p className="mt-1 text-gray-600 text-sm">
                {templateQuestions.length} item
                {templateQuestions.length !== 1 ? "s" : ""} configured
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleOpenAddQuestionSetModal}
                className="inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100 px-4 py-2 border border-blue-200 rounded-md font-medium text-blue-600 text-sm"
              >
                <PlusIcon />
                Add Question Set
              </button>
              <button
                onClick={handleOpenAddMetaQuestionModal}
                className="inline-flex items-center gap-2 bg-purple-50 hover:bg-purple-100 px-4 py-2 border border-purple-200 rounded-md font-medium text-purple-600 text-sm"
              >
                <HelpCircleIcon />
                Add Meta-Question
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {templateQuestions.length === 0 ? (
            <div className="p-8 text-gray-500 text-center">
              <DocumentIcon className="mx-auto mb-4 w-12 h-12 text-gray-300" />
              <p className="mb-2 text-sm">No question sets configured</p>
              <p className="text-gray-400 text-xs">
                Add question sets to define the survey structure
              </p>
            </div>
          ) : (
            templateQuestions.map((templateQuestion, index) => {
              const isQuestionSet = isQuestionSetItem(templateQuestion);
              const isMetaQuestion = isMetaQuestionItem(templateQuestion);

              return (
                <div
                  key={templateQuestion.id}
                  className={`p-6 ${
                    draggedIndex === index ? "opacity-50" : ""
                  } ${reordering ? "pointer-events-none" : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-1 items-start gap-4">
                      {/* Drag handle */}
                      <div className="flex justify-center items-center mt-1">
                        <div
                          className="flex justify-center items-center w-5 h-5 text-gray-400 hover:text-gray-600 cursor-move"
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragEnd={handleDragEnd}
                          title="Drag to reorder"
                        >
                          <DotsVerticalIcon />
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className={`flex justify-center items-center rounded-full w-6 h-6 font-medium text-xs ${
                              isQuestionSet
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {templateQuestion.sortOrder}
                          </div>
                          {isQuestionSet && (
                            <span className="inline-flex items-center bg-blue-50 px-2 py-0.5 rounded-full font-medium text-blue-700 text-xs">
                              Question Set
                            </span>
                          )}
                          {isMetaQuestion && (
                            <span className="inline-flex items-center bg-purple-50 px-2 py-0.5 rounded-full font-medium text-purple-700 text-xs">
                              Meta-Question
                            </span>
                          )}
                          <h4 className="font-medium text-gray-900 text-lg">
                            {(isQuestionSet &&
                              templateQuestion.questionSetHeader?.name) ||
                              (isMetaQuestion &&
                                templateQuestion.metaQuestionHeader
                                  ?.description) ||
                              `Item ${templateQuestion.id}`}
                          </h4>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              templateQuestion.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {templateQuestion.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>

                        {/* Question Set Content */}
                        {isQuestionSet && (
                          <>
                            {templateQuestion.questionSetHeader
                              ?.description && (
                              <p className="mb-3 text-gray-600 text-sm">
                                {templateQuestion.questionSetHeader.description}
                              </p>
                            )}

                            <div className="gap-4 grid grid-cols-1 md:grid-cols-3 mb-4">
                              <div>
                                <label className="font-medium text-gray-700 text-xs">
                                  Question Set ID
                                </label>
                                <p className="text-gray-900 text-sm">
                                  {templateQuestion.questionSetHeaderId}
                                </p>
                              </div>
                              {templateQuestion.questionSetHeader
                                ?.sourceViewName && (
                                <div>
                                  <label className="font-medium text-gray-700 text-xs">
                                    Source View
                                  </label>
                                  <p className="text-gray-900 text-sm">
                                    {
                                      templateQuestion.questionSetHeader
                                        .sourceViewName
                                    }
                                  </p>
                                </div>
                              )}
                              {templateQuestion.questionSetHeader
                                ?.subscript && (
                                <div>
                                  <label className="font-medium text-gray-700 text-xs">
                                    Type
                                  </label>
                                  <p className="text-gray-900 text-sm">
                                    {
                                      templateQuestion.questionSetHeader
                                        .subscript
                                    }
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Questions Preview */}
                            {templateQuestion.questions &&
                              templateQuestion.questions.length > 0 && (
                                <div className="mt-4">
                                  <label className="block mb-2 font-medium text-gray-700 text-xs">
                                    Questions (
                                    {templateQuestion.questions.length})
                                  </label>
                                  <div className="bg-gray-50 p-3 rounded-md">
                                    <div className="gap-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                      {templateQuestion.questions
                                        .slice(0, 6)
                                        .map((question) => (
                                          <div
                                            key={question.id}
                                            className="flex items-center gap-2"
                                          >
                                            <div
                                              className={`w-2 h-2 rounded-full ${
                                                question.isRequired
                                                  ? "bg-red-400"
                                                  : "bg-gray-300"
                                              }`}
                                            ></div>
                                            <span className="text-gray-700 text-xs truncate">
                                              {question.surveyLabel}
                                            </span>
                                            <span className="bg-gray-200 px-1 rounded text-gray-500 text-xs">
                                              {question.displayType}
                                            </span>
                                          </div>
                                        ))}
                                      {templateQuestion.questions.length >
                                        6 && (
                                        <div className="text-gray-500 text-xs italic">
                                          +
                                          {templateQuestion.questions.length -
                                            6}{" "}
                                          more questions
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                          </>
                        )}

                        {/* Meta-Question Content */}
                        {isMetaQuestion && (
                          <>
                            <div className="gap-4 grid grid-cols-1 md:grid-cols-2 mb-4">
                              <div>
                                <label className="font-medium text-gray-700 text-xs">
                                  Meta-Question ID
                                </label>
                                <p className="text-gray-900 text-sm">
                                  {templateQuestion.metaQuestionHeaderId}
                                </p>
                              </div>
                              <div>
                                <label className="font-medium text-gray-700 text-xs">
                                  Answer Mappings
                                </label>
                                <p className="text-gray-900 text-sm">
                                  {templateQuestion.answerCount || 0} configured
                                </p>
                              </div>
                            </div>
                            <p className="bg-purple-50 p-3 rounded text-purple-700 text-xs">
                              <strong>Conditional Question:</strong> This
                              meta-question will dynamically inject question
                              sets based on user responses.
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-6">
                      {isQuestionSet && (
                        <Link
                          href={`/questionsets/${templateQuestion.questionSetHeaderId}/configure`}
                          className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-1 border border-blue-200 rounded font-medium text-blue-600 text-xs"
                        >
                          <SettingsIcon />
                          Configure
                        </Link>
                      )}
                      {isMetaQuestion && (
                        <Link
                          href={`/meta-questions/${templateQuestion.metaQuestionHeaderId}`}
                          className="inline-flex items-center gap-1 bg-purple-50 hover:bg-purple-100 px-2 py-1 border border-purple-200 rounded font-medium text-purple-600 text-xs"
                        >
                          <CircleIcon />
                          View Details
                        </Link>
                      )}
                      <button className="inline-flex items-center gap-1 bg-gray-50 hover:bg-gray-100 px-2 py-1 border border-gray-200 rounded font-medium text-gray-600 text-xs">
                        <DotsHorizontalIcon />
                        Options
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {templateQuestions.length > 0 && (
          <div className="bg-gray-50 p-6 border-gray-200 border-t">
            <div className="flex justify-between items-center text-gray-600 text-sm">
              <div>
                Total:{" "}
                {templateQuestions.reduce(
                  (sum: number, tq: SurveyTemplateQuestion) =>
                    sum +
                    (tq.questionType === "QuestionSet"
                      ? tq.questions?.length || 0
                      : 0),
                  0
                )}{" "}
                questions across {templateQuestions.length} question sets
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="bg-red-400 rounded-full w-2 h-2"></div>
                  <span className="text-xs">Required</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="bg-gray-300 rounded-full w-2 h-2"></div>
                  <span className="text-xs">Optional</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal (Question Set or Meta-Question) */}
      {showAddModal && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 p-4">
          <div className="bg-white shadow-xl rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-gray-200 border-b">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {modalType === "questionset"
                    ? "Add Question Set"
                    : "Add Meta-Question"}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="mt-2 text-gray-600 text-sm">
                {modalType === "questionset"
                  ? "Select a question set to add to this survey template"
                  : "Select a meta-question to add conditional question set logic"}
              </p>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              {error && (
                <div className="bg-red-50 mb-4 p-4 border border-red-200 rounded-md">
                  <div className="flex">
                    <svg
                      className="mt-0.5 mr-2 w-5 h-5 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="text-red-600 text-sm">{error}</div>
                  </div>
                </div>
              )}

              {loadingAvailable ? (
                <div className="py-8 text-center">
                  <div className="text-gray-500">
                    {modalType === "questionset"
                      ? "Loading available question sets..."
                      : "Loading available meta-questions..."}
                  </div>
                </div>
              ) : modalType === "questionset" ? (
                availableQuestionSets.length === 0 ? (
                  <div className="py-8 text-center">
                    <svg
                      className="mx-auto mb-4 w-12 h-12 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="mb-2 text-gray-500">
                      No available question sets
                    </p>
                    <p className="text-gray-400 text-xs">
                      All question sets are already added to this survey
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableQuestionSets.map((questionSet) => (
                      <div
                        key={questionSet.id}
                        className="hover:bg-gray-50 p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {questionSet.name}
                            </h4>
                            {questionSet.description && (
                              <p className="mt-1 text-gray-600 text-sm">
                                {questionSet.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-gray-500 text-xs">
                              <span>ID: {questionSet.id}</span>
                              {questionSet.sourceViewName && (
                                <span>
                                  Source: {questionSet.sourceViewName}
                                </span>
                              )}
                              {questionSet.subscript && (
                                <span>Type: {questionSet.subscript}</span>
                              )}
                              <span>{questionSet.questionCount} questions</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddQuestionSet(questionSet.id)}
                            disabled={adding}
                            className="bg-blue-50 hover:bg-blue-100 disabled:opacity-50 ml-4 px-3 py-1 border border-blue-200 rounded font-medium text-blue-600 text-xs disabled:cursor-not-allowed"
                          >
                            {adding ? "Adding..." : "Add"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : availableMetaQuestions.length === 0 ? (
                <div className="py-8 text-center">
                  <svg
                    className="mx-auto mb-4 w-12 h-12 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="mb-2 text-gray-500">
                    No available meta-questions
                  </p>
                  <p className="text-gray-400 text-xs">
                    All meta-questions are already added to this survey
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableMetaQuestions.map((metaQuestion) => (
                    <div
                      key={metaQuestion.id}
                      className="hover:bg-purple-50 p-4 border border-purple-200 rounded-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center bg-purple-100 px-2 py-0.5 rounded-full font-medium text-purple-700 text-xs">
                              Meta-Question #{metaQuestion.id}
                            </span>
                          </div>
                          <h4 className="font-medium text-gray-900">
                            {metaQuestion.description}
                          </h4>
                          <div className="flex items-center gap-4 mt-2 text-gray-500 text-xs">
                            <span>
                              {metaQuestion.answerCount} answer mapping
                              {metaQuestion.answerCount !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddMetaQuestion(metaQuestion.id)}
                          disabled={adding}
                          className="bg-purple-50 hover:bg-purple-100 disabled:opacity-50 ml-4 px-3 py-1 border border-purple-200 rounded font-medium text-purple-600 text-xs disabled:cursor-not-allowed"
                        >
                          {adding ? "Adding..." : "Add"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-6 border-gray-200 border-t">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="bg-white hover:bg-gray-50 px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
