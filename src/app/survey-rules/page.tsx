"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import HomeButton from "@/components/HomeButton";
import CreateButton from "@/components/CreateButton";
import type { SurveyRule, DatabaseFunction } from "@/types/surveyRule";

export default function SurveyRulesPage() {
  const [rules, setRules] = useState<SurveyRule[]>([]);
  const [functions, setFunctions] = useState<DatabaseFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SurveyRule | null>(null);
  const [formData, setFormData] = useState({
    ruleName: "",
    functionName: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchRules();
    fetchFunctions();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/survey-rules");
      if (!response.ok) throw new Error("Failed to fetch rules");
      const data = await response.json();
      setRules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchFunctions = async () => {
    try {
      const response = await fetch("/api/database-functions");
      if (!response.ok) throw new Error("Failed to fetch functions");
      const data = await response.json();
      setFunctions(data);
    } catch (err) {
      // Error fetching functions
    }
  };

  const handleOpenModal = (rule?: SurveyRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        ruleName: rule.ruleName,
        functionName: rule.functionName,
      });
    } else {
      setEditingRule(null);
      setFormData({
        ruleName: "",
        functionName: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
    setFormData({
      ruleName: "",
      functionName: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingRule) {
        // Update existing rule
        const response = await fetch(`/api/survey-rules/${editingRule.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error("Failed to update rule");
      } else {
        // Create new rule
        const response = await fetch("/api/survey-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error("Failed to create rule");
      }

      await fetchRules();
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      const response = await fetch(`/api/survey-rules/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete rule");
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const filteredFunctions = functions.filter((fn) =>
    fn.routineName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <HomeButton />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-bold text-3xl">Survey Rules</h1>
          <p className="mt-1 text-gray-600">
            Manage survey validation and business rules
          </p>
        </div>
        <CreateButton onClick={() => handleOpenModal()}>
          Add New Rule
        </CreateButton>
      </div>

      {error && (
        <div className="bg-red-100 mb-4 p-4 border border-red-400 rounded text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="divide-y divide-gray-200 min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                Rule Name
              </th>
              <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                Function Name
              </th>
              <th className="px-6 py-3 font-medium text-gray-500 text-xs text-right uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-900 text-sm whitespace-nowrap">
                  {rule.id}
                </td>
                <td className="px-6 py-4 font-medium text-gray-900 text-sm whitespace-nowrap">
                  {rule.ruleName}
                </td>
                <td className="px-6 py-4 font-mono text-gray-600 text-sm whitespace-nowrap">
                  {rule.functionName}
                </td>
                <td className="space-x-2 px-6 py-4 font-medium text-sm text-right whitespace-nowrap">
                  <button
                    onClick={() => handleOpenModal(rule)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-gray-500 text-center">
                  No survey rules found. Click &quot;Add New Rule&quot; to
                  create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="mb-4 font-bold text-xl">
              {editingRule ? "Edit Survey Rule" : "Add New Survey Rule"}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={formData.ruleName}
                  onChange={(e) =>
                    setFormData({ ...formData, ruleName: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  required
                  placeholder="Enter a descriptive rule name"
                />
              </div>

              <div className="mb-4">
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Function Name
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  placeholder="Search functions..."
                />
                <select
                  value={formData.functionName}
                  onChange={(e) => {
                    setFormData({ ...formData, functionName: e.target.value });
                    setSearchTerm("");
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full font-mono text-sm"
                  required
                  size={Math.min(filteredFunctions.length || 1, 8)}
                >
                  <option value="">-- Select a function --</option>
                  {filteredFunctions.map((fn) => (
                    <option key={fn.routineName} value={fn.routineName}>
                      {fn.routineName}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-gray-500 text-xs">
                  {filteredFunctions.length} function(s) available
                </p>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="hover:bg-gray-50 px-4 py-2 border border-gray-300 rounded-md text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md text-white"
                >
                  {editingRule ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
