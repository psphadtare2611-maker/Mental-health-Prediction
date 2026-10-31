import { FIELDS, STEPS, isNumeric, parseAnswer } from "./schema.js";

const REQUIRED = "This field is required.";

// Client-side validation mirroring the StudentData model
export function validateField(field, raw) {
  const value = parseAnswer(field, raw);

  if (isNumeric(field)) {
    if (Number.isNaN(value)) return field.requiredMessage ?? REQUIRED;
    if (field.integer && !Number.isSafeInteger(value)) return "Must be a whole number.";
    const max = field.max ?? Infinity;
    if (value < field.min || value > max) {
      return max === Infinity ? `Must be ${field.min} or more.` : `Must be between ${field.min} and ${max}.`;
    }
    return null;
  }

  if (value === "") return field.requiredMessage ?? REQUIRED;
  if (field.maxLength && value.length > field.maxLength) return `Must be ${field.maxLength} characters or fewer.`;
  if (field.type !== "combo" && !field.options.includes(value)) return "Choose one of the listed options.";
  return null;
}

export function validateStep(step, answers) {
  const errors = {};
  step.fields.forEach((field) => {
    const message = validateField(field, answers[field.name]);
    if (message) errors[field.name] = message;
  });
  return errors;
}

export const isStepComplete = (step, answers) => Object.keys(validateStep(step, answers)).length === 0;

export const firstIncompleteStep = (answers) => STEPS.findIndex((step) => !isStepComplete(step, answers));

export const countAnswered = (answers, fields = FIELDS) =>
  fields.filter((field) => !validateField(field, answers[field.name])).length;
