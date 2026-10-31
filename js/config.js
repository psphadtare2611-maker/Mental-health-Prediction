// Local FastAPI (python -m uvicorn main:app --reload) when the page is served from this machine,
// otherwise the deployed backend.
const LOCAL_API = "http://127.0.0.1:8000";
const DEPLOYED_API = "https://mental-health-prediction-tqei.onrender.com";

export const IS_LOCAL_PAGE = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
export const API_BASE = IS_LOCAL_PAGE ? LOCAL_API : DEPLOYED_API;

// A hosted backend can take close to a minute to wake from idle
export const REQUEST_TIMEOUT_MS = 90000;
export const SLOW_REQUEST_MS = 6000;

// Context for the score. The model is a regressor with no output categories, so results are
// described with these facts rather than invented bands.
export const MODEL_FACTS = {
  trainingMin: 3.6, // lowest Mental_Health_Score in the training data
  trainingMax: 9.4, // highest Mental_Health_Score in the training data
  typicalError: 0.35, // test MAE of the saved RandomForest pipeline (notebook: 0.3465)
};
