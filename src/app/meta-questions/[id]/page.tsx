"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MetaQuestionWithAnswers } from "@/types/metaQuestion";
import { QuestionSetHeader } from "@/types/questionsets";

export default function MetaQuestionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const metaQuestionId = parseInt(params.id as string);

  const [metaQuestion, setMetaQuestion] =
    useState<MetaQuestionWithAnswers | null>(null);
  const [questionSets, setQuestionSets] = useState<QuestionSetHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAnswer, setShowAddAnswer] = useState(false);
  const [newAnswer, setNewAnswer] = useState({
    questionSetHeaderId: 0,
    isActive: true,
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metaQuestionId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch meta-question with answers
      const mqResponse = await fetch(`/api/meta-questions/${metaQuestionId}`);
      if (!mqResponse.ok) throw new Error("Failed to fetch meta-question");
      const mqData = await mqResponse.json();
      setMetaQuestion(mqData);

      // Fetch question sets for dropdown
      const qsResponse = await fetch("/api/questionsets");
      if (!qsResponse.ok) throw new Error("Failed to fetch question sets");
      const qsData = await qsResponse.json();
      setQuestionSets(Array.isArray(qsData) ? qsData : qsData.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAnswer = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `/api/meta-questions/${metaQuestionId}/answers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAnswer),
        }
      );

      if (!response.ok) throw new Error("Failed to add answer");

      // Reset form and refresh data
      setNewAnswer({
        questionSetHeaderId: 0,
        isActive: true,
      });
      setShowAddAnswer(false);
      await fetchData();
    } catch (error) {
      console.error("Error adding answer:", error);
      alert("Failed to add answer");
    }
  };

  const handleDeleteAnswer = async (answerId: number) => {
    if (!confirm("Are you sure you want to delete this answer mapping?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/meta-questions/${metaQuestionId}/answers/${answerId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete answer");
      await fetchData();
    } catch (error) {
      console.error("Error deleting answer:", error);
      alert("Failed to delete answer");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this meta-question?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/meta-questions/${metaQuestionId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");
      router.push("/meta-questions");
    } catch (error) {
      console.error("Error deleting meta-question:", error);
      alert("Failed to delete meta-question");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="inline-block border-4 border-gray-300 border-t-blue-500 rounded-full w-8 h-8 animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!metaQuestion) {
    return (
      <div className="p-6">
        <div className="bg-red-50 p-4 border border-red-200 rounded-lg text-red-700">
          Meta-question not found
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto p-6 max-w-6xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-gray-600 text-sm">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span>›</span>
          <Link href="/meta-questions" className="hover:text-blue-600">
            Meta-Questions
          </Link>
          <span>›</span>
          <span className="text-gray-900">#{metaQuestion.id}</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="font-bold text-2xl">
            Meta-Question #{metaQuestion.id}
          </h1>
          <p className="mt-1 text-gray-600">{metaQuestion.description}</p>
        </div>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 hover:bg-red-50 px-4 py-2 border border-red-300 rounded-lg font-medium text-red-600"
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Delete
        </button>
      </div>

      <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">
        {/* Details Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-md p-6 rounded-lg">
            <h2 className="mb-4 font-semibold text-lg">Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block mb-1 font-medium text-gray-700 text-xs">
                  ID
                </label>
                <p className="text-gray-900 text-sm">{metaQuestion.id}</p>
              </div>

              <div>
                <label className="block mb-1 font-medium text-gray-700 text-xs">
                  Description
                </label>
                <p className="text-gray-600 text-sm">
                  {metaQuestion.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Answer Mappings Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-md p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">Answer Mappings</h2>
              <button
                onClick={() => setShowAddAnswer(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium text-white text-sm"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Answer Mapping
              </button>
            </div>

            {showAddAnswer && (
              <form
                onSubmit={handleAddAnswer}
                className="bg-blue-50 mb-4 p-4 border border-blue-200 rounded-lg"
              >
                <h3 className="mb-3 font-medium text-sm">New Answer Mapping</h3>
                <div className="gap-3 grid grid-cols-1 md:grid-cols-2">
                  <div>
                    <label className="block mb-1 text-gray-700 text-xs">
                      Question Set *
                    </label>
                    <select
                      value={newAnswer.questionSetHeaderId}
                      onChange={(e) =>
                        setNewAnswer({
                          ...newAnswer,
                          questionSetHeaderId: parseInt(e.target.value),
                        })
                      }
                      className="px-2 py-1.5 border rounded w-full text-sm"
                      required
                    >
                      <option value="0">-- Select Question Set --</option>
                      {questionSets.map((qs) => (
                        <option key={qs.id} value={qs.id}>
                          {qs.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={newAnswer.isActive}
                        onChange={(e) =>
                          setNewAnswer({
                            ...newAnswer,
                            isActive: e.target.checked,
                          })
                        }
                        className="mr-2"
                      />
                      Active
                    </label>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded font-medium text-white text-sm"
                  >
                    Add Mapping
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddAnswer(false)}
                    className="hover:bg-gray-50 px-3 py-1.5 border border-gray-300 rounded font-medium text-gray-700 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {metaQuestion.answers.length === 0 ? (
              <div className="py-8 text-gray-500 text-center">
                <svg
                  className="mx-auto mb-3 w-12 h-12 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <p>No answer mappings configured</p>
                <p className="mt-1 text-sm">
                  Add mappings to trigger question sets
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {metaQuestion.answers.map((answer) => (
                  <div
                    key={answer.id}
                    className="hover:bg-gray-50 p-4 border rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-gray-400"
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
                          <span className="font-medium text-gray-900 text-sm">
                            {answer.questionSetName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-medium text-xs ${
                              answer.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {answer.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="mt-2 text-gray-500 text-xs">
                          <span>
                            Question Set ID: {answer.questionSetHeaderId}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAnswer(answer.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete mapping"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
