"use client";

import { useState } from "react";
import HomeButton from "@/components/HomeButton";
import { Survey } from "survey-react-ui";
import { Model } from "survey-core";
import { LayeredLight } from "survey-core/themes";
import "survey-core/survey-core.min.css";

export default function Scratch2Page() {
  const [surveyData, setSurveyData] = useState<any>(null);

  // Simple survey JSON with an image question
  const surveyJson = {"pages":[{"name":"page_34_1","title":"Select From Dropdown","elements":[]},{"name":"page_34_instance_2","title":"Ground Source Heat Pump (Instance: 2)","elements":[{"type":"text","name":"instance_2_String01","title":"Make (CV: cx)","isRequired":0,"readOnly":0,"placeholder":"Enter make","currentValue":"cx","assetId":34,"instanceId":2,"attributeId":4},{"type":"text","name":"instance_2_String02","title":"Model (CV: fgdsdfg)","isRequired":0,"readOnly":0,"placeholder":"Enter model","currentValue":"fgdsdfg","assetId":34,"instanceId":2,"attributeId":4},{"type":"text","name":"instance_2_Int01","title":"Power Consuption Kw (CV: 3)","isRequired":0,"readOnly":0,"placeholder":"Enter power consuption kw","currentValue":"3","assetId":34,"instanceId":2,"attributeId":4},{"type":"text","name":"instance_2_Int02","title":"Energy output KwH (CV: 18)","isRequired":0,"readOnly":0,"placeholder":"Enter energy output kwh","currentValue":"18","assetId":34,"instanceId":2,"attributeId":4},{"type":"date","name":"instance_2_Date02","title":"Warranty Exp Date (CV: 2027-08-30)","isRequired":0,"readOnly":0,"placeholder":"Enter warranty exp date","currentValue":"2027-08-30","assetId":34,"instanceId":2,"attributeId":4},{"type":"date","name":"instance_2_Date03","title":"Last Service Date (CV: 2024-08-31)","isRequired":0,"readOnly":0,"placeholder":"Enter last service date","currentValue":"2024-08-31","assetId":34,"instanceId":2,"attributeId":4}],"description":"Instance ID: 2"},{"name":"page_34_instance_1","title":"Baseline details for capture of Natural Gas (Instance: 1)","elements":[{"type":"date","name":"instance_1_Date01","title":"Install Date (CV: 2020-01-01)","isRequired":0,"readOnly":1,"currentValue":"2020-01-01","assetId":34,"instanceId":1,"attributeId":1},{"type":"date","name":"instance_1_Date02","title":"Last Service Date (CV: 2024-12-31)","isRequired":1,"readOnly":0,"currentValue":"2024-12-31","assetId":34,"instanceId":1,"attributeId":1},{"type":"number","name":"instance_1_Int01","title":"Kw Output (CV: 1)","isRequired":0,"readOnly":1,"currentValue":"1","assetId":34,"instanceId":1,"attributeId":1},{"type":"number","name":"instance_1_Int02","title":"Current Reading (CV: 2)","isRequired":0,"readOnly":0,"placeholder":"Enter meter reading","currentValue":"2","assetId":34,"instanceId":1,"attributeId":1},{"type":"date","name":"instance_1_Date03","title":"Meter Read Date (CV: 2027-08-15)","isRequired":0,"readOnly":0,"placeholder":"Enter read date","currentValue":"2027-08-15","assetId":34,"instanceId":1,"attributeId":1},{"type":"dropdown","name":"instance_1_Lookup01","title":"Boiler Condition (CV: 100 => NO MATCH)","isRequired":1,"readOnly":0,"choices":[{"value":19,"text":"New"},{"value":20,"text":"Good"},{"value":21,"text":"Fair"},{"value":22,"text":"Poor"},{"value":23,"text":"Broken"},{"value":24,"text":"Failed"},{"value":25,"text":"Missing"},{"value":26,"text":"Damaged"}],"currentValue":"100","assetId":34,"instanceId":1,"attributeId":1},{"type":"text","name":"instance_1_String01","title":"Serial Number (CV: Test)","isRequired":1,"readOnly":0,"placeholder":"ABC123/456XYZ","currentValue":"Test","assetId":34,"instanceId":1,"attributeId":1},{"type":"file","name":"instance_1_Image01","title":"Pic One","isRequired":0,"readOnly":0,"placeholder":"Description for Pic One","sourceType":"file-camera","storeDataAsText":true,"assetId":34,"instanceId":1,"attributeId":1,"acceptedTypes":"image/*","allowImagesPreview":true,"photoPlaceholder":"Tap to capture photo","filePlaceholder":"Choose file or take photo","imageWidth":"600px","imageHeight":"400px"}],"description":"Instance ID: 1"},{"name":"page_34_instance_15","title":"Baseline details for capture of Natural Gas (Instance: 15)","elements":[{"type":"date","name":"instance_15_Date01","title":"Install Date (CV: 2026-01-01)","isRequired":0,"readOnly":1,"currentValue":"2026-01-01","assetId":34,"instanceId":15,"attributeId":1},{"type":"date","name":"instance_15_Date02","title":"Last Service Date (CV: 2026-01-01)","isRequired":1,"readOnly":0,"currentValue":"2026-01-01","assetId":34,"instanceId":15,"attributeId":1},{"type":"number","name":"instance_15_Int01","title":"Kw Output (CV: 5)","isRequired":0,"readOnly":1,"currentValue":"5","assetId":34,"instanceId":15,"attributeId":1},{"type":"number","name":"instance_15_Int02","title":"Current Reading (CV: 2314)","isRequired":0,"readOnly":0,"placeholder":"Enter meter reading","currentValue":"2314","assetId":34,"instanceId":15,"attributeId":1},{"type":"date","name":"instance_15_Date03","title":"Meter Read Date (CV: 2026-01-01)","isRequired":0,"readOnly":0,"placeholder":"Enter read date","currentValue":"2026-01-01","assetId":34,"instanceId":15,"attributeId":1},{"type":"dropdown","name":"instance_15_Lookup01","title":"Boiler Condition (CV: 24 => \"Failed\")","isRequired":1,"readOnly":0,"choices":[{"value":19,"text":"New"},{"value":20,"text":"Good"},{"value":21,"text":"Fair"},{"value":22,"text":"Poor"},{"value":23,"text":"Broken"},{"value":24,"text":"Failed"},{"value":25,"text":"Missing"},{"value":26,"text":"Damaged"}],"currentValue":"24","assetId":34,"instanceId":15,"attributeId":1},{"type":"text","name":"instance_15_String01","title":"Serial Number (CV: cz)","isRequired":1,"readOnly":0,"placeholder":"ABC123/456XYZ","currentValue":"cz","assetId":34,"instanceId":15,"attributeId":1},{"type":"file","name":"instance_15_Image01","title":"Pic One","isRequired":0,"readOnly":0,"placeholder":"Description for Pic One","sourceType":"file-camera","storeDataAsText":true,"assetId":34,"instanceId":15,"attributeId":1,"acceptedTypes":"image/*","allowImagesPreview":true,"photoPlaceholder":"Tap to capture photo","filePlaceholder":"Choose file or take photo","imageWidth":"600px","imageHeight":"400px"}],"description":"Instance ID: 15"}]};

  const survey = new Model(surveyJson);
  survey.applyTheme(LayeredLight);
  
  survey.onComplete.add((sender) => {
    setSurveyData(sender.data);
  });

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <HomeButton />

      <h1>SurveyJS Image Test</h1>
      <p>Testing image/camera functionality without custom CSS</p>

      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <Survey model={survey} />
      </div>

      {surveyData && (
        <div style={{ marginTop: "40px", padding: "20px", backgroundColor: "#f0f0f0", borderRadius: "8px" }}>
          <h2>Survey Results:</h2>
          <pre style={{ overflow: "auto", maxHeight: "400px" }}>
            {JSON.stringify(surveyData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
