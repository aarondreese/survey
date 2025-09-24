"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface QuestionSetFormData {
  name: string;
  description: string;
  sourceViewName: string;
}

interface DatabaseView {
  name: string;
  schema: string;
  fullName: string;
}

export default function NewQuestionSetPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<QuestionSetFormData>({
    name: "",
    description: "",
    sourceViewName: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<QuestionSetFormData>>({});
  
  // State for searchable dropdown
  const [views, setViews] = useState<DatabaseView[]>([]);
  const [filteredViews, setFilteredViews] = useState<DatabaseView[]>([]);
  const [viewsLoading, setViewsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch database views on component mount
  useEffect(() => {
    fetchDatabaseViews();
  }, []);

  // Handle clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter views based on search term
  useEffect(() => {
    const filtered = views.filter(view =>
      view.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      view.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredViews(filtered);
  }, [views, searchTerm]);

  const fetchDatabaseViews = async () => {
    setViewsLoading(true);
    try {
      const response = await fetch('/api/database-views');
      if (response.ok) {
        const data = await response.json();
        setViews(data.views || []);
      } else {
        console.error('Failed to fetch database views');
      }
    } catch (error) {
      console.error('Error fetching database views:', error);
    } finally {
      setViewsLoading(false);
    }
  };

  const handleViewSelect = (view: DatabaseView) => {
    setFormData(prev => ({
      ...prev,
      sourceViewName: view.name
    }));
    setSearchTerm(view.name);
    setShowDropdown(false);
    
    // Clear error if there was one
    if (errors.sourceViewName) {
      setErrors(prev => ({
        ...prev,
        sourceViewName: undefined
      }));
    }
  };

  const handleViewSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setFormData(prev => ({
      ...prev,
      sourceViewName: value
    }));
    setShowDropdown(true);

    // Clear error when user starts typing
    if (errors.sourceViewName) {
      setErrors(prev => ({
        ...prev,
        sourceViewName: undefined
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name as keyof QuestionSetFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
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
      newErrors.sourceViewName = "Source view name must be less than 100 characters";
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
      const requestData = {
        ...formData,
        createdDate: new Date().toISOString(),
      };
      
      console.log('Sending request to create question set:', requestData);
      
      const response = await fetch("/api/questionsets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json(); // Get the created question set data
        console.log('Question set created successfully:', result);
        // Redirect to configuration page to set up questions from the view columns
        router.push(`/questionsets/${result.data.id}/configure`);
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        alert(`Error creating question set: ${errorData.error || "Unknown error"}${errorData.details ? `\nDetails: ${errorData.details}` : ''}`);
      }
    } catch (error) {
      console.error("Error creating question set:", error);
      alert("Error creating question set. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/questionsets");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Link href="/questionsets" className="hover:text-blue-600">
            Question Sets
          </Link>
          <span>/</span>
          <span>New Question Set</span>
        </div>
        <h1 className="text-2xl font-bold">Create New Question Set</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
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
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Description Field */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
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
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Source View Name Field */}
            <div>
              <label htmlFor="sourceViewName" className="block text-sm font-medium text-gray-700 mb-2">
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
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {viewsLoading ? (
                      <div className="px-3 py-2 text-sm text-gray-500">Loading views...</div>
                    ) : filteredViews.length > 0 ? (
                      filteredViews.map((view) => (
                        <div
                          key={view.name}
                          onClick={() => handleViewSelect(view)}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{view.name}</div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        {searchTerm.trim() ? 'No views found matching your search' : 'No views available'}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {errors.sourceViewName && (
                <p className="mt-1 text-sm text-red-600">{errors.sourceViewName}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Select a database view from the dbo schema that contains the question data
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading}
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
              {loading ? "Creating..." : "Create Question Set"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}