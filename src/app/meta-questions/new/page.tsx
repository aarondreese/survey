"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewMetaQuestionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/meta-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create meta-question");
      }

      const result = await response.json();
      router.push(`/meta-questions/${result.id}`);
    } catch (error) {
      console.error("Error creating meta-question:", error);
      alert("Failed to create meta-question");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto p-6 max-w-4xl">
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
          <span className="text-gray-900">New</span>
        </div>
      </div>

      <h1 className="mb-6 font-bold text-2xl">Create New Meta-Question</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow-md p-6 rounded-lg">
          <h2 className="mb-4 font-semibold text-lg">
            Meta-Question Information
          </h2>

          <div className="mt-4">
            <label className="block mb-2 font-medium text-gray-700 text-sm">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 w-full"
              rows={3}
              placeholder="Describe the purpose of this meta-question..."
            />
            <p className="mt-1 text-gray-500 text-xs">
              Optional description for this meta-question
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Link
            href="/meta-questions"
            className="hover:bg-gray-50 px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 px-6 py-2 rounded-lg font-medium text-white"
          >
            {loading ? "Creating..." : "Create Meta-Question"}
          </button>
        </div>
      </form>
    </div>
  );
}
