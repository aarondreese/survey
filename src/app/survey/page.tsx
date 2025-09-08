"use client";
import { useEffect, useState } from "react";

import { Survey } from "survey-react-ui";
import { Model } from "survey-core";
import "survey-core/survey-core.min.css";

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

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto" }}>
      <Survey model={new Model(surveyJson)} />
    </div>
  );
}
