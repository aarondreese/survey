"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import HomeButton from "@/components/HomeButton";
import CreateButton from "@/components/CreateButton";
import ListCard from "@/components/ListCard";
import ActionButton from "@/components/ActionButton";
import { EditIcon, SettingsIcon, DocumentIcon } from "@/components/icons";

interface SurveyHeader {
  id: number;
  name: string;
  description?: string;
  entityType: string;
  pageSplit: string;
  isActive: boolean;
}

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<SurveyHeader[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyHeader | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/surveys");
      if (!response.ok) {
        throw new Error("Failed to fetch surveys");
      }
      const data = await response.json();
      setSurveys(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load surveys");
    } finally {
      setLoading(false);
    }
  };

  const handleSurveySelect = (survey: SurveyHeader) => {
    setSelectedSurvey(selectedSurvey?.id === survey.id ? null : survey);
  };

  if (loading) {
    return (
      <div className="mx-auto p-6 max-w-6xl">
        <div className="text-center">Loading surveys...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto p-6 max-w-6xl">
        <div className="text-red-600 text-center">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <HomeButton />

      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-gray-900 text-3xl">
              Survey Templates
            </h1>
            <p className="mt-2 text-gray-600">
              Manage survey templates and their configurations
            </p>
          </div>
          <CreateButton href="/surveys/create">
            Create Survey Template
          </CreateButton>
        </div>
      </div>

      <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">
        {/* Survey List */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
            <div className="p-6 border-gray-200 border-b">
              <h2 className="font-semibold text-lg">Survey Templates</h2>
              <p className="mt-1 text-gray-600 text-sm">
                {surveys.length} template{surveys.length !== 1 ? "s" : ""}{" "}
                available
              </p>
            </div>
            <div className="divide-y divide-gray-200">
              {surveys.length === 0 ? (
                <div className="p-6 text-gray-500 text-center">
                  <DocumentIcon className="mx-auto mb-4 w-12 h-12 text-gray-300" />
                  <p className="text-sm">No survey templates found</p>
                  <Link
                    href="/surveys/create"
                    className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Create your first survey template
                  </Link>
                </div>
              ) : (
                surveys.map((survey) => (
                  <ListCard
                    key={survey.id}
                    isSelected={selectedSurvey?.id === survey.id}
                    onClick={() => handleSurveySelect(survey)}
                  >
                    <div className="gap-2 lg:gap-4 grid grid-cols-1 lg:grid-cols-[1fr_auto] lg:items-start">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 truncate">
                            {survey.name}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              survey.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {survey.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        {survey.description && (
                          <p className="mt-1 text-gray-600 text-sm truncate">
                            {survey.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-gray-500 text-xs">
                          <span>ID: {survey.id}</span>
                          <span>Type: {survey.entityType}</span>
                          <span>Pages: {survey.pageSplit}</span>
                        </div>
                      </div>

                      <div className="flex lg:flex-col gap-2 mt-2 lg:mt-0 pt-2 lg:pt-0 border-gray-100 lg:border-0 border-t">
                        <ActionButton
                          href={`/surveys/${survey.id}/edit`}
                          variant="blue"
                          icon={<EditIcon />}
                          className="justify-center w-28"
                        >
                          Edit
                        </ActionButton>
                        <ActionButton
                          href={`/surveys/${survey.id}/configure`}
                          variant="green"
                          icon={<SettingsIcon />}
                          className="justify-center w-28"
                        >
                          Configure
                        </ActionButton>
                      </div>
                    </div>
                  </ListCard>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Survey Details Panel */}
        <div className="lg:col-span-1">
          <div className="top-6 sticky bg-white shadow-sm border border-gray-200 rounded-lg">
            <div className="p-6 border-gray-200 border-b">
              <h3 className="font-semibold text-lg">Survey Details</h3>
            </div>
            <div className="p-6">
              {selectedSurvey ? (
                <div className="space-y-4">
                  <div>
                    <label className="font-medium text-gray-700 text-sm">
                      Name
                    </label>
                    <p className="mt-1 text-gray-900 text-sm">
                      {selectedSurvey.name}
                    </p>
                  </div>

                  {selectedSurvey.description && (
                    <div>
                      <label className="font-medium text-gray-700 text-sm">
                        Description
                      </label>
                      <p className="mt-1 text-gray-900 text-sm">
                        {selectedSurvey.description}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="font-medium text-gray-700 text-sm">
                      Status
                    </label>
                    <p className="mt-1 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          selectedSurvey.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {selectedSurvey.isActive ? "Active" : "Inactive"}
                      </span>
                    </p>
                  </div>

                  <div>
                    <label className="font-medium text-gray-700 text-sm">
                      Survey ID
                    </label>
                    <p className="mt-1 text-gray-900 text-sm">
                      {selectedSurvey.id}
                    </p>
                  </div>

                  <div>
                    <label className="font-medium text-gray-700 text-sm">
                      Entity Type
                    </label>
                    <p className="mt-1 text-gray-900 text-sm">
                      {selectedSurvey.entityType}
                    </p>
                  </div>

                  <div>
                    <label className="font-medium text-gray-700 text-sm">
                      Page Split
                    </label>
                    <p className="mt-1 text-gray-900 text-sm">
                      {selectedSurvey.pageSplit}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4">
                    <Link
                      href={`/surveys/${selectedSurvey.id}/edit`}
                      className="inline-flex justify-center items-center gap-2 bg-blue-50 hover:bg-blue-100 px-3 py-2 border border-blue-200 rounded-md w-full font-medium text-blue-600 text-sm"
                    >
                      <EditIcon className="w-4 h-4" />
                      Edit Survey Template
                    </Link>
                    <Link
                      href={`/surveys/${selectedSurvey.id}/configure`}
                      className="inline-flex justify-center items-center gap-2 bg-green-50 hover:bg-green-100 px-3 py-2 border border-green-200 rounded-md w-full font-medium text-green-600 text-sm"
                    >
                      <SettingsIcon className="w-4 h-4" />
                      Configure Survey
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-center">
                  <DocumentIcon className="mx-auto mb-3 w-8 h-8 text-gray-300" />
                  <p className="text-sm">
                    Select a survey template to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
