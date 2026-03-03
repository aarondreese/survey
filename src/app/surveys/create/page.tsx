"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ErrorIcon, SpinnerIcon, PlusIcon, InfoIcon } from "@/components/icons";

interface CreateSurveyForm {
  name: string;
  description: string;
  entityType: string;
  pageSplit: string;
  isActive: boolean;
}

const entityTypeOptions = [
  { value: "Asset", label: "Asset" },
  { value: "Vehicle", label: "Vehicle" },
  { value: "Customer", label: "Customer" },
  { value: "Tenancy", label: "Tenancy" },
];

export default function CreateSurveyPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<CreateSurveyForm>({
    name: "",
    description: "",
    entityType: "Asset",
    pageSplit: "NONE",
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (
    field: keyof CreateSurveyForm,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Survey name is required";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Survey name must be at least 3 characters long";
    } else if (formData.name.trim().length > 255) {
      newErrors.name = "Survey name must be less than 255 characters";
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = "Description must be less than 1000 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/surveys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          entityType: formData.entityType,
          pageSplit: formData.pageSplit,
          isActive: formData.isActive,
        }),
      });

      if (response.ok) {
        // Redirect to surveys list after successful creation
        router.push("/surveys");
      } else {
        const errorData = await response.json();
        setErrors({
          submit: errorData.error || "Failed to create survey template",
        });
      }
    } catch {
      setErrors({
        submit: "Network error. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/surveys");
  };

  return (
    <div className="mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 text-gray-600 text-sm">
          <Link href="/surveys" className="hover:text-blue-600">
            Survey Templates
          </Link>
          <span>›</span>
          <span className="text-gray-900">Create New Template</span>
        </div>
        <h1 className="font-bold text-gray-900 text-3xl">
          Create Survey Template
        </h1>
        <p className="mt-2 text-gray-600">
          Create a new survey template that can be used to generate surveys
        </p>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
        <div className="p-6 border-gray-200 border-b">
          <h2 className="font-semibold text-lg">Template Information</h2>
          <p className="mt-1 text-gray-600 text-sm">
            Provide the basic information for your survey template
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Survey Name */}
          <div>
            <label
              htmlFor="name"
              className="block mb-2 font-medium text-gray-700 text-sm"
            >
              Survey Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name
                  ? "border-red-300 focus:border-red-500"
                  : "border-gray-300"
              }`}
              placeholder="Enter survey name"
              maxLength={255}
            />
            {errors.name && (
              <p className="mt-1 text-red-600 text-sm">{errors.name}</p>
            )}
            <p className="mt-1 text-gray-500 text-sm">
              {formData.name.length}/255 characters
            </p>
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
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description
                  ? "border-red-300 focus:border-red-500"
                  : "border-gray-300"
              }`}
              placeholder="Describe the purpose and content of this survey template"
              maxLength={1000}
            />
            {errors.description && (
              <p className="mt-1 text-red-600 text-sm">{errors.description}</p>
            )}
            <p className="mt-1 text-gray-500 text-sm">
              {formData.description.length}/1000 characters
            </p>
          </div>

          {/* Entity Type */}
          <div>
            <label
              htmlFor="entityType"
              className="block mb-2 font-medium text-gray-700 text-sm"
            >
              Entity Type <span className="text-red-500">*</span>
            </label>
            <select
              id="entityType"
              value={formData.entityType}
              onChange={(e) => handleInputChange("entityType", e.target.value)}
              className="shadow-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            >
              {entityTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-gray-500 text-sm">
              Select the type of entity this template represents
            </p>
          </div>

          {/* Page Split */}
          <div>
            <label
              htmlFor="pageSplit"
              className="block mb-2 font-medium text-gray-700 text-sm"
            >
              Page Split <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="pageSplit"
              value={formData.pageSplit}
              onChange={(e) => handleInputChange("pageSplit", e.target.value)}
              className="shadow-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              placeholder="Enter page split configuration"
            />
            <p className="mt-1 text-gray-500 text-sm">
              Specify how the survey pages should be organized (default: NONE)
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block mb-2 font-medium text-gray-700 text-sm">
              Status
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  handleInputChange("isActive", e.target.checked)
                }
                className="border-gray-300 rounded focus:ring-blue-500 w-4 h-4 text-blue-600"
              />
              <label htmlFor="isActive" className="ml-2 text-gray-700 text-sm">
                Active (template can be used to create surveys)
              </label>
            </div>
            <p className="mt-1 text-gray-500 text-sm">
              Inactive templates are hidden from survey creation but preserved
              for existing surveys
            </p>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 p-3 border border-red-200 rounded-md">
              <div className="flex items-center">
                <ErrorIcon className="mr-2 w-5 h-5 text-red-400" />
                <p className="text-red-700 text-sm">{errors.submit}</p>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-gray-200 border-t">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="bg-white hover:bg-gray-50 disabled:opacity-50 px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700 text-sm disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 border border-transparent rounded-md font-medium text-white text-sm disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon />
                  Creating...
                </>
              ) : (
                <>
                  <PlusIcon />
                  Create Survey Template
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 mt-6 p-4 border border-blue-200 rounded-lg">
        <div className="flex">
          <InfoIcon className="mt-0.5 mr-3 w-5 h-5 text-blue-400" />
          <div>
            <h3 className="font-medium text-blue-800 text-sm">
              About Survey Templates
            </h3>
            <div className="mt-2 text-blue-700 text-sm">
              <ul className="space-y-1 list-disc list-inside">
                <li>
                  <strong>Entity Type:</strong> Select the business entity this
                  survey relates to (Asset, Vehicle, Customer, or Tenancy)
                </li>
                <li>
                  <strong>Page Split:</strong> Custom configuration for
                  organizing survey pages (will be used in later processing
                  steps)
                </li>
                <li>
                  <strong>Status:</strong> Only active templates can be used to
                  create new surveys
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
