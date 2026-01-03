"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface SurveyTemplateHeader {
  id: number;
  name: string;
  description?: string;
  entityType: string;
  pageSplit: string;
  isActive: boolean;
}

export default function EditSurveyTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const [surveyTemplate, setSurveyTemplate] =
    useState<SurveyTemplateHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [entityType, setEntityType] = useState("");
  const [pageSplit, setPageSplit] = useState("");
  const [isActive, setIsActive] = useState(true);

  const fetchSurveyTemplate = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/surveys/${surveyId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch survey template");
      }

      const data = await response.json();
      if (data.success && data.data) {
        const template = data.data;
        setSurveyTemplate(template);
        setName(template.name || "");
        setDescription(template.description || "");
        setEntityType(template.entityType || "");
        setPageSplit(template.pageSplit || "");
        setIsActive(template.isActive !== false);
      } else {
        throw new Error("Survey template not found");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load survey template"
      );
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    if (surveyId) {
      fetchSurveyTemplate();
    }
  }, [surveyId, fetchSurveyTemplate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Survey template name is required");
      return;
    }

    if (!entityType.trim()) {
      setError("Entity type is required");
      return;
    }

    if (!pageSplit.trim()) {
      setError("Page split is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const surveyData = {
        name: name.trim(),
        description: description.trim() || null,
        entityType: entityType.trim(),
        pageSplit: pageSplit.trim(),
        isActive,
      };

      const response = await fetch(`/api/surveys/${surveyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(surveyData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update survey template");
      }

      if (result.success) {
        router.push("/surveys");
      } else {
        throw new Error(result.error || "Failed to update survey template");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update survey template"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto p-6 max-w-2xl">
        <div className="text-center">Loading survey template...</div>
      </div>
    );
  }

  if (error && !surveyTemplate) {
    return (
      <div className="mx-auto p-6 max-w-2xl">
        <div className="text-red-600 text-center">Error: {error}</div>
        <div className="mt-4 text-center">
          <Link href="/surveys" className="text-blue-600 hover:underline">
            Back to Survey Templates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto p-6 max-w-2xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 text-gray-600 text-sm">
          <Link href="/surveys" className="hover:text-blue-600">
            Survey Templates
          </Link>
          <span>›</span>
          <span className="text-gray-900">
            {surveyTemplate?.name || "Survey Template"}
          </span>
          <span>›</span>
          <span className="text-gray-900">Edit</span>
        </div>
        <h1 className="font-bold text-gray-900 text-3xl">
          Edit Survey Template
        </h1>
        <p className="mt-2 text-gray-600">
          Update the survey template details and settings
        </p>
      </div>

      {/* Form */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-50 mb-6 p-4 border border-red-200 rounded-md">
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

          <div className="space-y-6">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block mb-2 font-medium text-gray-700 text-sm"
              >
                Survey Template Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="shadow-sm px-3 py-2 border border-gray-300 focus:border-blue-500 rounded-md focus:outline-none focus:ring-blue-500 w-full"
                placeholder="Enter survey template name"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block mb-2 font-medium text-gray-700 text-sm"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="shadow-sm px-3 py-2 border border-gray-300 focus:border-blue-500 rounded-md focus:outline-none focus:ring-blue-500 w-full"
                placeholder="Enter survey template description (optional)"
              />
            </div>

            {/* Entity Type */}
            <div>
              <label
                htmlFor="entityType"
                className="block mb-2 font-medium text-gray-700 text-sm"
              >
                Entity Type *
              </label>
              <select
                id="entityType"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="shadow-sm px-3 py-2 border border-gray-300 focus:border-blue-500 rounded-md focus:outline-none focus:ring-blue-500 w-full"
                required
              >
                <option value="">Select entity type</option>
                <option value="Asset">Asset</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Customer">Customer</option>
                <option value="Tenancy">Tenancy</option>
              </select>
            </div>

            {/* Page Split */}
            <div>
              <label
                htmlFor="pageSplit"
                className="block mb-2 font-medium text-gray-700 text-sm"
              >
                Page Split *
              </label>
              <input
                type="text"
                id="pageSplit"
                value={pageSplit}
                onChange={(e) => setPageSplit(e.target.value)}
                className="shadow-sm px-3 py-2 border border-gray-300 focus:border-blue-500 rounded-md focus:outline-none focus:ring-blue-500 w-full"
                placeholder="Enter page split value (e.g., NONE, SinglePage, etc.)"
                required
              />
              <p className="mt-1 text-gray-500 text-xs">
                Specify how the survey should be split across pages
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="border-gray-300 rounded focus:ring-blue-500 w-4 h-4 text-blue-600"
              />
              <label
                htmlFor="isActive"
                className="block ml-2 text-gray-700 text-sm"
              >
                Active
              </label>
              <p className="ml-2 text-gray-500 text-xs">
                {isActive
                  ? "This survey template is active and can be used"
                  : "This survey template is inactive and cannot be used"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-6 pt-6 border-gray-200 border-t">
            <Link
              href="/surveys"
              className="bg-white hover:bg-gray-50 shadow-sm px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium text-gray-700 text-sm"
            >
              Cancel
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href={`/surveys/${surveyId}/configure`}
                className="bg-blue-50 hover:bg-blue-100 px-4 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium text-blue-600 text-sm"
              >
                Configure Questions
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-sm px-4 py-2 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium text-white text-sm disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
