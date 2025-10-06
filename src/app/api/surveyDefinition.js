// surveyDefinition.js
// Edit this file to change the survey definition returned by the API

import { read } from "fs";

const survey = {
  title: "Customer Feedback Survey",
  pages: [
    {
      name: "page1",
      elements: [
        {
          type: "text",
          name: "customerName",
          title: "What is your name?",
        },
        {
          type: "rating",
          name: "satisfaction",
          title: "How satisfied are you with our service?",
          readOnly: false,
          minRateDescription: "Not Satisfied",
          maxRateDescription: "Completely satisfied",
        },
      ],
    },
    {
      name: "solarPage",
      elements: [
        {
          type: "panel",
          name: "solarSection",
          title: "Solar",
          elements: [
            {
              type: "radiogroup",
              name: "solarType",
              title: "Solar Typexx",
              isRequired: false,
              visible: true,
              propertyAttributeID: 123456,
              fieldName: "Lookup01",
              choices: [
                { value: 29, text: "Hybrid" },
                { value: 28, text: "Photovoltaic" },
                { value: 27, text: "Thermal" },
                { value: 30, text: "PIV" },
              ],
              hideNumber: true,
              defaultValue: 30,
              readOnly: false,
            },
            {
              type: "text",
              inputType: "number",
              name: "solarOutputRating",
              title: "Output Rating",
              isRequired: false,
              visible: true,
              propertyAttributeID: 123456,
              fieldName: "Int01",
              hideNumber: true,
              defaultValue: 7,
              readOnly: false,
            },
            {
              type: "text",
              inputType: "date",
              name: "solarFittedDate",
              title: "Fitted Date",
              isRequired: false,
              visible: true,
              propertyAttributeID: 123456,
              fieldName: "Date01",
              hideNumber: true,
              defaultValue: "2025-08-31",
              readOnly: true,
            },
            {
              type: "text",
              inputType: "date",
              name: "solarLastServiceDate",
              title: "Last Service Date",
              isRequired: false,
              visible: true,
              propertyAttributeID: 123456,
              fieldName: "Date02",
              hideNumber: true,
              defaultValue: "2025-08-31",
            },
            {
              type: "dropdown",
              name: "solarCondition",
              title: "Condition",
              isRequired: true,
              visible: true,
              readOnly: false,
              fieldName: "Lookup02",
              choices: [
                { value: 23, text: "Broken" },
                { value: 26, text: "Damaged" },
                { value: 24, text: "Failed" },
                { value: 21, text: "Fair" },
                { value: 20, text: "Good" },
                { value: 25, text: "Missing" },
                { value: 19, text: "New" },
                { value: 22, text: "Poor" },
              ],
              hideNumber: true,
              defaultValue: 20,
            },
          ],
        },
      ],
    },
  ],
};

export default survey;
