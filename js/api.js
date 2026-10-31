import { API_BASE, IS_LOCAL_PAGE, REQUEST_TIMEOUT_MS } from "./config.js";

export class ApiError extends Error {
  constructor(kind, title, message, fieldErrors = {}) {
    super(message);
    this.kind = kind;
    this.title = title;
    this.fieldErrors = fieldErrors;
  }
}

// Parse FastAPI / Pydantic 422 details into { field: message }
function parseFieldErrors(detail) {
  if (!Array.isArray(detail)) return {};
  const errors = {};
  detail.forEach((err) => {
    const field = Array.isArray(err.loc) ? err.loc[err.loc.length - 1] : null;
    if (typeof field === "string" && field !== "body") errors[field] = err.msg || "Invalid value.";
  });
  return errors;
}

function connectionError() {
  const help = IS_LOCAL_PAGE
    ? "Make sure the backend is running (python -m uvicorn main:app --reload) and that this page is served from port 5500."
    : "The service may be temporarily unavailable. Please try again in a moment.";
  return new ApiError("network", "Can't reach the prediction server", `Couldn't connect to ${API_BASE}. ${help}`);
}

export async function requestPrediction(payload, signal) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel);

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await res.json().catch(() => null);

    if (res.status === 422) {
      throw new ApiError(
        "validation",
        "Check your inputs",
        body?.message ?? "The API rejected this submission.",
        parseFieldErrors(body?.detail)
      );
    }
    if (!res.ok) {
      const message = typeof body?.message === "string" ? body.message : `The API responded with status ${res.status}.`;
      throw new ApiError("server", "Prediction failed", message);
    }
    if (body?.success !== true || !Number.isFinite(body.predicted_mental_health_score)) {
      throw new ApiError("malformed", "Unexpected response", "The API responded, but the score was missing or malformed.");
    }

    return {
      score: body.predicted_mental_health_score,
      message: body.message,
      disclaimer: body.disclaimer,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (timedOut) {
      throw new ApiError("timeout", "The request timed out", "The server took too long to respond. Please try again.");
    }
    if (controller.signal.aborted) throw new ApiError("cancelled", "Cancelled", "The request was cancelled.");
    throw connectionError();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}

// Reaches the API's root route; this also wakes a sleeping hosted backend before anyone submits
export async function isServiceReachable() {
  try {
    const res = await fetch(`${API_BASE}/`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    return res.ok;
  } catch {
    return false;
  }
}
