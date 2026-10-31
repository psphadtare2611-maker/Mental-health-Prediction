// In-memory only: answers and results are never written to browser storage
export const store = {
  answers: {},
  result: null,
  service: "checking", // "checking" | "online" | "offline"
  request: null, // AbortController while a prediction is in flight
  submitError: null, // ApiError shown on the review step
  fieldErrors: {}, // server-side validation messages waiting to be shown on their step
};

export function resetAnswers() {
  store.answers = {};
  store.submitError = null;
  store.fieldErrors = {};
}
