"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import HomeButton from "@/components/HomeButton";
import { Survey } from "survey-react-ui";
import { Model } from "survey-core";
import { LayeredLight } from "survey-core/themes";
import "survey-core/survey-core.min.css";

interface SurveyInstanceDetail {
  ID: number;
  SurveyTemplateHeaderID: number;
  EntityReference: string;
  InstanceCreatedDate: string;
  SurveyJSON?: string;
  CompletedJSON?: string;
  CompletedDate?: string;
  TemplateName?: string;
  AddressLine1?: string;
  AddressLine2?: string;
  Town?: string;
  County?: string;
  PostCode?: string;
}

// Helper function to convert image type elements to file type with camera support
function convertImageToFile(element: any) {
  if (element.type === 'image') {
    const isReadOnly = element.readOnly === true;
    
    if (!isReadOnly) {
      // Convert to file type with camera capture
      element.type = 'file';
      element.sourceType = 'file-camera';
      element.acceptedTypes = 'image/*';
      element.storeDataAsText = true;
      element.allowImagesPreview = true;
      element.maxSize = 10485760; // 10MB
      element.needConfirmRemoveFile = false;
      element.waitForUpload = true;
      element.allowMultiple = false;
      
      // Clean up image-specific properties
      delete element.imageLink;
      delete element.contentMode;
    }
  }
}

export default function SurveyInstanceDetailPage() {
  const params = useParams();
  const instanceId = params.id as string;
  
  const [instance, setInstance] = useState<SurveyInstanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);

  const handleSurveyComplete = useCallback(async (sender: Model) => {
    try {
      const response = await fetch("/api/survey-instance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: instanceId,
          completedJson: sender.data,
          completedDate: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save survey");
      }

      alert("Survey completed and saved successfully!");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save survey");
      alert("Error saving survey: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  }, [instanceId]);

  const fetchInstance = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/survey-instance?id=${instanceId}`);
      if (!response.ok) throw new Error("Failed to fetch survey instance");
      
      const result = await response.json();
      const instanceData = result.data;
      setInstance(instanceData);

      // Parse and create survey model
      if (instanceData.SurveyJSON) {
        const surveyJson = JSON.parse(instanceData.SurveyJSON);
        
        // Convert image fields to file type with camera support
        if (surveyJson.pages) {
          surveyJson.pages.forEach((page: any) => {
            if (page.elements) {
              page.elements.forEach((element: any) => {
                // Handle panels (which contain elements)
                if (element.type === 'panel' && element.elements) {
                  element.elements.forEach((subElement: any) => {
                    convertImageToFile(subElement);
                  });
                } else {
                  convertImageToFile(element);
                }
              });
            }
          });
        }
        
        const model = new Model(surveyJson);
        model.applyTheme(LayeredLight);
        
        // Progress bar configuration
        model.showProgressBar = true;
        model.progressBarLocation = "top";
        model.progressBarType = "pages";
        model.progressBarShowPageNumbers = false;
        model.progressBarShowPageTitles = true;

        // Load completed data if exists, otherwise use data from surveyJson
        if (instanceData.CompletedJSON) {
          const completedData = JSON.parse(instanceData.CompletedJSON);
          model.data = completedData;
        } else if (surveyJson.data) {
          model.data = surveyJson.data;
        }

        // Handle completion
        model.onComplete.add(handleSurveyComplete);

        setSurveyModel(model);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [instanceId, handleSurveyComplete]);

  useEffect(() => {
    if (instanceId) {
      fetchInstance();
    }
  }, [instanceId, fetchInstance]);

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <HomeButton />

      {instance && (
        <div style={{ marginBottom: "20px" }}>
          <h1>{instance.TemplateName || 'Survey Instance'}</h1>
          {instance.AddressLine1 && (
            <p>
              {[
                instance.AddressLine1,
                instance.AddressLine2,
                instance.Town,
                instance.PostCode
              ].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      )}

      {error && (
        <div style={{ padding: "10px", backgroundColor: "#fee", border: "1px solid #f00", color: "#c00", marginBottom: "20px", borderRadius: "4px" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>Loading survey...</p>
        </div>
      ) : surveyModel ? (
        <Survey model={surveyModel} />
      ) : (
        <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
          <p>No survey data available</p>
        </div>
      )}
    </div>
  );
}
