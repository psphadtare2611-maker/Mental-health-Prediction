import { h, icon } from "../dom.js";
import { ALL_STEPS, FIELDS, REVIEW_STEP } from "../schema.js";
import { store } from "../store.js";
import { countAnswered, firstIncompleteStep, isStepComplete } from "../validation.js";

const SERVICE_LABELS = { checking: "Connecting to model", online: "Model service online", offline: "Model service offline" };

export function isStepUnlocked(index) {
  const firstIncomplete = firstIncompleteStep(store.answers);
  return firstIncomplete === -1 || index <= firstIncomplete;
}

function stepLink(step, index, currentStepId) {
  const isReview = step === REVIEW_STEP;
  const done = !isReview && isStepComplete(step, store.answers);
  const current = step.id === currentStepId;
  const locked = !isStepUnlocked(index);
  const badge = h("span", { class: "rail-badge" }, done ? icon("check") : index + 1);
  const className = `rail-link${current ? " is-current" : ""}${done ? " is-done" : ""}`;

  if (locked) {
    return h("span", { class: `${className} is-locked`, "aria-disabled": "true" }, badge, step.short);
  }
  return h("a", { class: className, href: `#/assessment/${step.id}`, "aria-current": current ? "step" : null }, badge, step.short);
}

export function brand() {
  return h(
    "a",
    { class: "brand", href: "#/", "aria-label": "Mental Health Predictor, dashboard" },
    h("span", { class: "brand-mark", "aria-hidden": "true" }, h("i"), h("i"), h("i")),
    h("span", { class: "brand-name" }, "Mental Health Predictor")
  );
}

export function renderRail(container, route, onToggleTheme) {
  const answered = countAnswered(store.answers);
  const percent = Math.round((answered / FIELDS.length) * 100);
  const isDashboard = route.name === "dashboard";

  const progress = h(
    "div",
    { class: "rail-progress" },
    h("div", { class: "rail-progress-label" }, h("span", {}, "Progress"), h("span", {}, `${answered} of ${FIELDS.length}`)),
    h(
      "div",
      {
        class: "bar",
        role: "progressbar",
        "aria-label": "Questions answered",
        "aria-valuemin": 0,
        "aria-valuemax": FIELDS.length,
        "aria-valuenow": answered,
      },
      h("span", { style: `width:${percent}%` })
    )
  );

  const isDark = document.documentElement.dataset.resolvedTheme === "dark";

  container.replaceChildren(
    h(
      "div",
      { class: "rail-top" },
      brand(),
      h(
        "button",
        {
          type: "button",
          class: "icon-button rail-theme",
          "aria-label": isDark ? "Switch to light theme" : "Switch to dark theme",
          onClick: onToggleTheme,
        },
        icon(isDark ? "sun" : "moon")
      )
    ),
    h(
      "nav",
      { class: "rail-nav", "aria-label": "Assessment" },
      h(
        "a",
        { class: `rail-link${isDashboard ? " is-current" : ""}`, href: "#/", "aria-current": isDashboard ? "page" : null },
        h("span", { class: "rail-badge rail-badge-plain" }, icon("grid")),
        "Dashboard"
      ),
      h("p", { class: "rail-heading" }, "Assessment"),
      h("ol", {}, ALL_STEPS.map((step, index) => h("li", {}, stepLink(step, index, route.step))))
    ),
    h(
      "div",
      { class: "rail-foot" },
      progress,
      h("p", { class: `service service-${store.service}`, role: "status" }, h("span", { class: "service-dot" }), SERVICE_LABELS[store.service])
    )
  );
}
