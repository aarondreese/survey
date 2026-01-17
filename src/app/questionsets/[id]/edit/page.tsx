"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { QuestionSetHeader } from "@/types/questionsets";
import HomeButton from "@/components/HomeButton";

interface QuestionSetFormData {
  name: string;
  description: string;
  sourceViewName: string;
  subscript: string;
}

interface DatabaseView {
  name: string;
  schema: string;
  fullName: string;
}

export default function EditQuestionSetPage() {
  const router = useRouter();
  const params = useParams();
  const questionSetId = params?.id as string;

  const [formData, setFormData] = useState<QuestionSetFormData>({
    name: "",
    description: "",
    sourceViewName: "",
    subscript: "",
  });
  const [originalData, setOriginalData] = useState<QuestionSetHeader | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errors, setErrors] = useState<Partial<QuestionSetFormData>>({});

  // State for searchable dropdown
  const [views, setViews] = useState<DatabaseView[]>([]);
  const [filteredViews, setFilteredViews] = useState<DatabaseView[]>([]);
  const [viewsLoading, setViewsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch question set data and database views on component mount
  useEffect(() => {
    const fetchQuestionSetData = async () => {
      try {
        setInitialLoading(true);
        const response = await fetch(`/api/questionsets/${questionSetId}`);
        if (response.ok) {
          const result = await response.json();
          const questionSet = result.data;
          setOriginalData(questionSet);
          setFormData({
            name: questionSet.name || "",
            description: questionSet.description || "",
            sourceViewName: questionSet.sourceViewName || "",
            subscript: questionSet.subscript || "",
          });
          setSearchTerm(questionSet.sourceViewName || "");
        } else {
          console.error("Failed to fetch question set data");
          alert("Failed to load question set data");
          router.push("/questionsets");
        }
      } catch (error) {
        console.error("Error fetching question set:", error);
        alert("Error loading question set data");
        router.push("/questionsets");
      } finally {
        setInitialLoading(false);
      }
    };

    const fetchDatabaseViews = async () => {
      setViewsLoading(true);
      try {
        const response = await fetch("/api/database-views");
        if (response.ok) {
          const data = await response.json();
          setViews(data.views || []);
        } else {
          console.error("Failed to fetch database views");
        }
      } catch (error) {
        console.error("Error fetching database views:", error);
      } finally {
        setViewsLoading(false);
      }
    };

    if (questionSetId) {
      fetchQuestionSetData();
      fetchDatabaseViews();
    }
  }, [questionSetId, router]);

  // Handle clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter views based on search term
  useEffect(() => {
    const filtered = views.filter(
      (view) =>
        view.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        view.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredViews(filtered);
  }, [views, searchTerm]);

  const handleViewSelect = (view: DatabaseView) => {
    setFormData((prev) => ({
      ...prev,
      sourceViewName: view.name,
    }));
    setSearchTerm(view.name);
    setShowDropdown(false);

    // Clear error if there was one
    if (errors.sourceViewName) {
      setErrors((prev) => ({
        ...prev,
        sourceViewName: undefined,
      }));
    }
  };

  const handleViewSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setFormData((prev) => ({
      ...prev,
      sourceViewName: value,
    }));
    setShowDropdown(true);

    // Clear error when user starts typing
    if (errors.sourceViewName) {
      setErrors((prev) => ({
        ...prev,
        sourceViewName: undefined,
      }));
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof QuestionSetFormData]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<QuestionSetFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters long";
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = "Description must be less than 500 characters";
    }

    if (formData.sourceViewName && formData.sourceViewName.length > 100) {
      newErrors.sourceViewName =
        "Source view name must be less than 100 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      console.log("Sending request to update question set:", formData);

      const response = await fetch(`/api/questionsets/${questionSetId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        // Redirect back to question sets list
        router.push("/questionsets");
      } else {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        alert(
          `Error updating question set: ${errorData.error || "Unknown error"}${
            errorData.details ? `\nDetails: ${errorData.details}` : ""
          }`
        );
      }
    } catch (error) {
      console.error("Error updating question set:", error);
      alert("Error updating question set. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/questionsets");
  };

  if (initialLoading) {
    return (
      <div className="mx-auto p-6 max-w-2xl">
        <div className="text-center">Loading question set data...</div>
      </div>
    );
  }

  if (!originalData) {
    return (
      <div className="mx-auto p-6 max-w-2xl">
        <div className="text-red-600 text-center">Question set not found</div>
      </div>
    );
  }

  return (
    <div className="mx-auto p-6 max-w-2xl">
      <HomeButton />

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 text-gray-600 text-sm">
          <Link href="/questionsets" className="hover:text-blue-600">
            Question Sets
          </Link>
          <span>/</span>
          <span>Edit Question Set</span>
        </div>
        <h1 className="font-bold text-2xl">Edit Question Set</h1>
        <p className="mt-1 text-gray-600">ID: {questionSetId}</p>
      </div>

      <div className="bg-white shadow-md p-6 rounded-lg">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* ID Field (Read-only) */}
            <div>
              <label
                htmlFor="id"
                className="block mb-2 font-medium text-gray-700 text-sm"
              >
                Question Set ID
              </label>
              <input
                type="text"
                id="id"
                value={questionSetId}
                readOnly
                className="bg-gray-100 px-3 py-2 border border-gray-300 rounded-lg w-full text-gray-600"
              />
              <p className="mt-1 text-gray-500 text-sm">
                This field cannot be changed
              </p>
            </div>

            {/* Name Field */}
            <div>
              <label
                htmlFor="name"
                className="block mb-2 font-medium text-gray-700 text-sm"
              >
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter question set name"
                disabled={loading}
              />
              {errors.name && (
                <p className="mt-1 text-red-600 text-sm">{errors.name}</p>
              )}
            </div>

            {/* Description Field */}
            <div>
              <label
                htmlFor="description"
                className="block mb-2 font-medium text-gray-700 text-sm"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter a description for this question set (optional)"
                disabled={loading}
              />
              {errors.description && (
                <p className="mt-1 text-red-600 text-sm">
                  {errors.description}
                </p>
              )}
              <p className="mt-1 text-gray-500 text-sm">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Source View Name Field */}
            <div>
              <label
                htmlFor="sourceViewName"
                className="block mb-2 font-medium text-gray-700 text-sm"
              >
                Source View Name
              </label>
              <div className="relative" ref={dropdownRef}>
                <input
                  type="text"
                  id="sourceViewName"
                  name="sourceViewName"
                  value={searchTerm}
                  onChange={handleViewSearchChange}
                  onFocus={() => setShowDropdown(true)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.sourceViewName ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="Search for database views..."
                  disabled={loading}
                  autoComplete="off"
                />

                {showDropdown && (
                  <div className="z-10 absolute bg-white shadow-lg mt-1 border border-gray-300 rounded-lg w-full max-h-60 overflow-auto">
                    {viewsLoading ? (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        Loading views...
                      </div>
                    ) : filteredViews.length > 0 ? (
                      filteredViews.map((view) => (
                        <div
                          key={view.name}
                          onClick={() => handleViewSelect(view)}
                          className="hover:bg-gray-100 px-3 py-2 border-gray-100 border-b last:border-b-0 text-sm cursor-pointer"
                        >
                          <div className="font-medium text-gray-900">
                            {view.name}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        {searchTerm.trim()
                          ? "No views found matching your search"
                          : "No views available"}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {errors.sourceViewName && (
                <p className="mt-1 text-red-600 text-sm">
                  {errors.sourceViewName}
                </p>
              )}
              <p className="mt-1 text-gray-500 text-sm">
                Select a database view from the dbo schema that contains the
                question data
              </p>
            </div>

            {/* Subscript Field */}
            <div>
              <label
                htmlFor="subscript"
                className="block mb-2 font-medium text-gray-700 text-sm"
              >
                Subscript
              </label>
              <input
                type="text"
                id="subscript"
                name="subscript"
                value={formData.subscript}
                onChange={handleInputChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                placeholder="Enter subscript (e.g., Standard, Premium, etc.)"
                disabled={loading}
              />
              <p className="mt-1 text-gray-500 text-sm">
                Enter a type/category identifier for this question set
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-gray-200 border-t">
            <button
              type="button"
              onClick={handleCancel}
              className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium text-gray-700 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading && (
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {loading ? "Updating..." : "Update Question Set"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
