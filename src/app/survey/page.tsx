"use client";
import { useEffect, useState } from "react";

import { Survey } from "survey-react-ui";
import { Model, Serializer } from "survey-core";
import "survey-core/survey-core.min.css";
// Register custom properties globally before creating the model
Serializer.addProperty("question", { name: "propertyAttributeID:number" });
Serializer.addProperty("question", { name: "fieldName:string" });

export default function SurveyPage() {
  const [surveyJson, setSurveyJson] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/survey")
      .then((res) => res.json())
      .then((data) => {
        setSurveyJson(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading survey...</div>;
  if (!surveyJson) return <div>Survey not found.</div>;

  // Set up SurveyJS model and blind default for solarOutputRating
  const surveyModel = new Model(surveyJson);
  surveyModel.onComplete.add(function(sender) {
    if (!sender.data.solarOutputRating) {
      sender.setValue("solarOutputRating", 3); // Blind default value
    }
  });

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto" }}>
      <Survey model={surveyModel} />
    </div>
  );
}
