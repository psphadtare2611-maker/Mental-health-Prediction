import { isServiceReachable, requestPrediction } from "./api.js";
import { isStepUnlocked, renderRail } from "./components/rail.js";
import { SLOW_REQUEST_MS } from "./config.js";
import { ALL_STEPS, REVIEW_STEP, STEPS, buildPayload } from "./schema.js";
import { resetAnswers, store } from "./store.js";
import { firstIncompleteStep } from "./validation.js";
import { assessmentView } from "./views/assessment.js";
import { dashboardView } from "./views/dashboard.js";
import { loadingView, reviewView } from "./views/review.js";
import { resultView } from "./views/result.js";

const rail = document.getElementById("rail");
const main = document.getElementById("main");
const MIN_LOADING_MS = 500; // keeps a fast local response from flashing the loading screen

let route = { name: "dashboard" };

const navigate = (hash) => {
  if (window.location.hash === hash) render();
  else window.location.hash = hash;
};

function parseRoute() {
  const [, section, stepId] = window.location.hash.split("/");
  if (section === "result") return { name: "result" };
  if (section === "assessment") return { name: "assessment", step: stepId };
  return { name: "dashboard" };
}

function toggleTheme() {
  const theme = document.documentElement.dataset.resolvedTheme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.resolvedTheme = theme;
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // Storage can be blocked; the theme still applies to this page
  }
  refreshRail();
}

const refreshRail = () => renderRail(rail, route, toggleTheme);

// isNavigation is false for in-place refreshes, which must leave scroll and focus alone
function show(view, title, { isNavigation = true } = {}) {
  document.title = `${title} · Mental Health Predictor`;
  main.replaceChildren(view);
  refreshRail();
  if (!isNavigation) return;
  window.scrollTo(0, 0);
  view.querySelector("h1")?.focus({ preventScroll: true });
}

async function checkService() {
  store.service = "checking";
  refresh();
  store.service = (await isServiceReachable()) ? "online" : "offline";
  refresh();
}

// Service status only appears in the rail and on the dashboard, so other views keep their state
function refresh() {
  if (route.name === "dashboard") render({ isNavigation: false });
  else refreshRail();
}

function startOver() {
  resetAnswers();
  navigate(`#/assessment/${STEPS[0].id}`);
}

const dashboardActions = {
  onStartOver: () => {
    resetAnswers();
    render();
  },
  onCheckService: checkService,
};

function render({ isNavigation = true } = {}) {
  route = parseRoute();

  if (route.name === "result") {
    if (!store.result) return navigate("#/");
    return show(resultView({ onNewAssessment: startOver }), "Your result", { isNavigation });
  }

  if (route.name === "assessment") {
    const index = ALL_STEPS.findIndex((step) => step.id === route.step);
    if (index === -1 || !isStepUnlocked(index)) {
      const firstIncomplete = firstIncompleteStep(store.answers);
      return navigate(`#/assessment/${firstIncomplete === -1 ? REVIEW_STEP.id : STEPS[firstIncomplete].id}`);
    }
    const step = ALL_STEPS[index];
    const view =
      step === REVIEW_STEP
        ? reviewView({ onPredict: predict })
        : assessmentView(index, { navigate, onAnswer: refreshRail });
    return show(view, step.title, { isNavigation });
  }

  return show(dashboardView(dashboardActions), "Dashboard", { isNavigation });
}

async function predict() {
  if (store.request) return;

  const firstIncomplete = firstIncompleteStep(store.answers);
  if (firstIncomplete !== -1) return navigate(`#/assessment/${STEPS[firstIncomplete].id}`);

  const controller = new AbortController();
  const answers = { ...store.answers };
  const loading = loadingView({ onCancel: () => controller.abort() });
  const slowTimer = setTimeout(loading.markSlow, SLOW_REQUEST_MS);

  store.request = controller;
  store.submitError = null;
  show(loading.el, "Running your prediction");

  try {
    const [response] = await Promise.all([
      requestPrediction(buildPayload(answers), controller.signal),
      new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS)),
    ]);
    store.result = { ...response, answers };
    store.service = "online";
    store.request = null;
    navigate("#/result");
  } catch (error) {
    store.request = null;
    if (error.kind === "validation") {
      const failedStep = STEPS.find((step) => step.fields.some((field) => error.fieldErrors[field.name]));
      if (failedStep) {
        store.fieldErrors = error.fieldErrors;
        navigate(`#/assessment/${failedStep.id}`);
        return;
      }
    }
    if (error.kind === "network") store.service = "offline";
    if (error.kind !== "cancelled") store.submitError = error;
    // A cancelled request already left the page if Back triggered it
    if (parseRoute().step === REVIEW_STEP.id) render();
  } finally {
    clearTimeout(slowTimer);
  }
}

window.addEventListener("hashchange", () => {
  store.request?.abort(); // leaving the loading screen cancels the request
  render();
});

render({ isNavigation: false });
checkService();
