import { scoreScale } from "../components/scale.js";
import { answerList } from "../components/summary.js";
import { MODEL_FACTS } from "../config.js";
import { h, icon } from "../dom.js";
import { FIELDS, STEPS } from "../schema.js";
import { store } from "../store.js";

const FALLBACK_DISCLAIMER =
  "This score is an informational estimate from a machine learning model. It is not a clinical diagnosis or a substitute for a qualified mental health professional.";

export function resultView({ onNewAssessment }) {
  const { score, disclaimer, answers } = store.result;
  const { trainingMin, trainingMax, typicalError } = MODEL_FACTS;

  return h(
    "div",
    { class: "view" },
    h(
      "header",
      { class: "page-head" },
      h("p", { class: "eyebrow" }, "Your result"),
      h("h1", { tabindex: "-1" }, "Predicted mental health score")
    ),
    h(
      "section",
      { class: "card score-card", "aria-label": "Prediction" },
      h("p", { class: "score" }, score.toFixed(2)),
      scoreScale(score),
      h(
        "p",
        { class: "scale-legend" },
        h("span", { class: "scale-legend-swatch", "aria-hidden": "true" }),
        `Shaded area: the model's typical error of about ±${typicalError} points`
      )
    ),
    h(
      "section",
      { class: "card", "aria-labelledby": "meaning-title" },
      h("h2", { id: "meaning-title", class: "card-title" }, "What this means"),
      h(
        "ul",
        { class: "meaning" },
        h("li", {}, `${score.toFixed(2)} is the score the trained model predicts from your ${FIELDS.length} answers.`),
        h("li", {}, `In the data the model learned from, higher scores mean better mental health. Those scores ranged from ${trainingMin} to ${trainingMax}.`),
        h("li", {}, `On test data, the model's predictions were off by about ${typicalError} points on average, so treat the score as an estimate rather than an exact value.`)
      )
    ),
    h(
      "aside",
      { class: "banner" },
      icon("info"),
      h(
        "div",
        {},
        h("p", { class: "banner-title" }, "Not a clinical diagnosis"),
        h("p", {}, disclaimer || FALLBACK_DISCLAIMER),
        h("p", {}, "If you're struggling, please talk to someone you trust.")
      )
    ),
    h(
      "details",
      { class: "card used-answers" },
      h("summary", {}, "Answers used for this prediction"),
      STEPS.map((step) => h("div", {}, h("h3", {}, step.title), answerList(step, answers)))
    ),
    h(
      "div",
      { class: "form-nav form-nav-result" },
      h("a", { class: "button button-ghost", href: "#/" }, icon("arrowLeft"), "Back to dashboard"),
      h("button", { type: "button", class: "button button-primary", onClick: onNewAssessment }, "Start another assessment")
    )
  );
}
