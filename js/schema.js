// The assessment definition. Every `name`, option and limit mirrors StudentData in main.py,
// so this is the one file to change if the API contract ever does.

const hours = (name, label) => ({
  name,
  label,
  type: "range",
  min: 0,
  max: 24,
  step: 0.1,
  unit: "hrs",
  placeholder: "0.0",
});

export const STEPS = [
  {
    id: "personal",
    title: "Personal Information",
    short: "Personal",
    description: "A few details about you.",
    fields: [
      {
        name: "age",
        label: "Age",
        type: "number",
        min: 10,
        max: 100,
        step: 1,
        integer: true,
        unit: "years",
        placeholder: "e.g. 21",
        hint: "10–100",
      },
      {
        name: "gender",
        label: "Gender",
        type: "choice",
        options: ["Male", "Female"],
      },
      {
        name: "country",
        label: "Country",
        type: "combo",
        maxLength: 60,
        placeholder: "e.g. India",
        hint: "Not listed? Type it anyway.",
        options: ["India", "USA", "Canada", "Australia", "UK", "Germany", "Mexico", "Turkey", "France"],
      },
    ],
  },
  {
    id: "habits",
    title: "Academic & Digital Habits",
    short: "Academic & digital",
    description: "Your studies and how you use your phone and social media.",
    fields: [
      {
        name: "academic_level",
        label: "Academic level",
        type: "choice",
        options: ["High School", "Undergraduate", "Graduate"],
      },
      {
        name: "most_used_platform",
        label: "Most-used platform",
        type: "select",
        options: [
          "Facebook",
          "Instagram",
          "Snapchat",
          "Twitter",
          "YouTube",
          "TikTok",
          "LinkedIn",
          "LINE",
          "KakaoTalk",
          "VKontakte",
          "WhatsApp",
          "WeChat",
        ],
      },
      {
        name: "purpose_of_use",
        label: "Primary purpose",
        type: "choice",
        options: ["Networking", "Education", "Entertainment", "News"],
      },
      hours("avg_daily_usage_hours", "Average daily screen time"),
      {
        name: "daily_unlocks",
        label: "Daily phone unlocks",
        type: "number",
        min: 0,
        step: 1,
        integer: true,
        unit: "per day",
        placeholder: "e.g. 60",
      },
    ],
  },
  {
    id: "lifestyle",
    title: "Lifestyle & Stress",
    short: "Lifestyle & stress",
    description: "Your typical day, and how stressed you feel.",
    fields: [
      hours("study_hours", "Study hours per day"),
      hours("physical_activity_hours", "Physical activity per day"),
      hours("sleep_hours_per_night", "Sleep per night"),
      {
        name: "stress_level",
        label: "Perceived stress level",
        type: "scale",
        options: ["Low", "Medium", "High", "Very High"],
        requiredMessage: "Pick a stress level.",
      },
    ],
  },
];

export const REVIEW_STEP = {
  id: "review",
  title: "Review & Predict",
  short: "Review",
  description: "Check your answers, then run the prediction.",
};

export const ALL_STEPS = [...STEPS, REVIEW_STEP];
export const FIELDS = STEPS.flatMap((step) => step.fields);

const NUMERIC_TYPES = new Set(["number", "range"]);

export const isNumeric = (field) => NUMERIC_TYPES.has(field.type);

// Number() (not parseInt) so "21.5" stays 21.5 and is rejected instead of silently truncated
export function parseAnswer(field, raw) {
  const value = String(raw ?? "").trim();
  if (!isNumeric(field)) return value;
  return value === "" ? NaN : Number(value);
}

// Gather answers into the exact StudentData shape
export function buildPayload(answers) {
  return Object.fromEntries(FIELDS.map((field) => [field.name, parseAnswer(field, answers[field.name])]));
}

export function formatAnswer(field, raw) {
  const value = String(raw ?? "").trim();
  return field.unit ? `${value} ${field.unit}` : value;
}
