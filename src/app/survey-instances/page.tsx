"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import HomeButton from "@/components/HomeButton";

interface SurveyInstanceListItem {
  ID: number;
  SurveyTemplateHeaderID: number;
  EntityReference: string;
  InstanceCreatedDate: string;
  CompletedDate?: string;
  ReviewedDate?: string;
  ApprovedDate?: string;
  TemplateName: string;
  AddressLine1?: string;
  AddressLine2?: string;
  Town?: string;
  PostCode?: string;
}

export default function SurveyInstancesPage() {
  const [instances, setInstances] = useState<SurveyInstanceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInstances();
  }, []);

  const fetchInstances = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/survey-instance");
      if (!response.ok) throw new Error("Failed to fetch survey instances");
      
      const result = await response.json();
      setInstances(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (instance: SurveyInstanceListItem) => {
    if (instance.ApprovedDate) {
      return <span className="inline-block px-2 py-1 text-xs font-semibold text-white bg-green-600 rounded">Approved</span>;
    }
    if (instance.ReviewedDate) {
      return <span className="inline-block px-2 py-1 text-xs font-semibold text-white bg-blue-600 rounded">Reviewed</span>;
    }
    if (instance.CompletedDate) {
      return <span className="inline-block px-2 py-1 text-xs font-semibold text-white bg-yellow-600 rounded">Completed</span>;
    }
    return <span className="inline-block px-2 py-1 text-xs font-semibold text-white bg-gray-600 rounded">Not Started</span>;
  };

  const formatAddress = (instance: SurveyInstanceListItem) => {
    if (!instance.AddressLine1) return instance.EntityReference;
    
    const parts = [
      instance.AddressLine1,
      instance.AddressLine2,
      instance.Town,
      instance.PostCode
    ].filter(Boolean);
    
    return parts.join(", ");
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString();
    const timePart = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${datePart} ${timePart}`;
  };

  return (
    <div className="p-8">
      <HomeButton />

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Survey Instances</h1>
        <p className="mt-1 text-gray-600">
          View and complete saved survey instances
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading survey instances...</p>
        </div>
      ) : instances.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg p-12 text-center text-gray-500">
          <svg
            className="mx-auto w-16 h-16 text-gray-300 mb-4"
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
          <p>No survey instances found</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {instances.map((instance) => (
                  <tr key={instance.ID} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/survey-instances/${instance.ID}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {instance.ID}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {instance.TemplateName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatAddress(instance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(instance.InstanceCreatedDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(instance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {instances.map((instance) => (
              <Link
                key={instance.ID}
                href={`/survey-instances/${instance.ID}`}
                className="block bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-gray-900">ID: {instance.ID}</div>
                  {getStatusBadge(instance)}
                </div>
                <div className="text-sm text-gray-900 font-medium mb-1">
                  {instance.TemplateName}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {formatAddress(instance)}
                </div>
                <div className="text-xs text-gray-500">
                  Created: {formatDateTime(instance.InstanceCreatedDate)}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
