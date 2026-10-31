import { answerList } from "../components/summary.js";
import { h, icon } from "../dom.js";
import { REVIEW_STEP, STEPS } from "../schema.js";
import { store } from "../store.js";
import { stepHeader } from "./assessment.js";

function errorBanner(error, onPredict) {
  return h(
    "div",
    { class: "banner banner-error", role: "alert" },
    icon("alert"),
    h(
      "div",
      {},
      h("p", { class: "banner-title" }, error.title),
      h("p", {}, error.message),
      h("button", { type: "button", class: "button button-ghost button-small", onClick: onPredict }, icon("refresh"), "Try again")
    )
  );
}

export function reviewView({ onPredict }) {
  return h(
    "div",
    { class: "view" },
    stepHeader(REVIEW_STEP),
    store.submitError && errorBanner(store.submitError, onPredict),
    h(
      "div",
      { class: "review" },
      STEPS.map((step) =>
        h(
          "section",
          { class: "card", "aria-label": step.title },
          h(
            "div",
            { class: "review-head" },
            h("h2", { class: "card-title" }, step.title),
            h("a", { class: "text-link", href: `#/assessment/${step.id}`, "aria-label": `Edit ${step.title}` }, "Edit")
          ),
          answerList(step, store.answers)
        )
      )
    ),
    h(
      "div",
      { class: "form-nav" },
      h("a", { class: "button button-ghost", href: `#/assessment/${STEPS[STEPS.length - 1].id}` }, icon("arrowLeft"), "Previous"),
      h("button", { type: "button", class: "button button-primary", onClick: onPredict }, "Run prediction", icon("arrowRight"))
    )
  );
}

export function loadingView({ onCancel }) {
  const note = h("p", { class: "loading-note", hidden: true }, "This is taking a little longer. A hosted server can need up to a minute to wake up.");
  const el = h(
    "div",
    { class: "view view-center", role: "status" },
    h("div", { class: "spinner", "aria-hidden": "true" }),
    h("h1", { tabindex: "-1" }, "Running your prediction"),
    h("p", { class: "lede" }, "Sending your answers to the model."),
    note,
    h("button", { type: "button", class: "button button-ghost", onClick: onCancel }, "Cancel")
  );
  return { el, markSlow: () => (note.hidden = false) };
}
