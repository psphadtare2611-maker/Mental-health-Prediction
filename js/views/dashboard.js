import { API_BASE, IS_LOCAL_PAGE } from "../config.js";
import { h, icon } from "../dom.js";
import { FIELDS, STEPS } from "../schema.js";
import { store } from "../store.js";
import { countAnswered, firstIncompleteStep } from "../validation.js";

const HOW_IT_WORKS = [
  ["Answer 12 questions", "About you, your digital habits and your daily routine."],
  ["The model scores them", "Your answers go to a random forest model trained on survey data from about 5,000 students."],
  ["See your prediction", "You get the score the model predicts, with context on how to read it."],
];

function assessmentCard({ onStartOver }) {
  const answered = countAnswered(store.answers);
  const firstIncomplete = firstIncompleteStep(store.answers);
  const allDone = firstIncomplete === -1;
  const target = allDone ? "review" : STEPS[firstIncomplete].id;
  const action = allDone ? "Review answers" : answered ? "Resume assessment" : "Start assessment";

  return h(
    "section",
    { class: "card card-primary", "aria-labelledby": "assessment-title" },
    h("h2", { id: "assessment-title", class: "card-title" }, "Your assessment"),
    h(
      "ul",
      { class: "section-list" },
      STEPS.map((step) => {
        const done = countAnswered(store.answers, step.fields);
        const complete = done === step.fields.length;
        return h(
          "li",
          { class: complete ? "is-complete" : null },
          h("span", { class: "section-check", "aria-hidden": "true" }, complete ? icon("check") : null),
          h("span", { class: "section-name" }, step.title),
          h("span", { class: "section-count" }, `${done} of ${step.fields.length}`)
        );
      })
    ),
    h(
      "div",
      { class: "card-actions" },
      h("a", { class: "button button-primary", href: `#/assessment/${target}` }, action, icon("arrowRight")),
      answered > 0 && h("button", { type: "button", class: "button button-ghost", onClick: onStartOver }, "Start over")
    )
  );
}

function resultCard() {
  const { result } = store;
  return h(
    "section",
    { class: "card", "aria-labelledby": "latest-title" },
    h("h2", { id: "latest-title", class: "card-title" }, "Latest result"),
    result
      ? [
          h("p", { class: "stat" }, result.score.toFixed(2)),
          h("p", { class: "card-copy" }, "Predicted mental health score"),
          h("a", { class: "text-link", href: "#/result" }, "View result"),
        ]
      : h("p", { class: "card-copy" }, "No result yet. Your prediction will appear here after you finish the assessment.")
  );
}

const SERVICE_COPY = {
  checking: ["Connecting…", "Checking the prediction API. A hosted server can take up to a minute to wake."],
  online: ["Online", "The prediction API is reachable."],
  offline: [
    "Offline",
    IS_LOCAL_PAGE
      ? `Couldn't reach ${API_BASE}. Start it with: python -m uvicorn main:app --reload`
      : "The prediction API isn't responding right now. Please try again shortly.",
  ],
};

function serviceCard({ onCheckService }) {
  const [label, copy] = SERVICE_COPY[store.service];
  return h(
    "section",
    { class: "card", "aria-labelledby": "service-title" },
    h("h2", { id: "service-title", class: "card-title" }, "Prediction service"),
    h("p", { class: `service service-${store.service} service-large` }, h("span", { class: "service-dot" }), label),
    h("p", { class: "card-copy" }, copy),
    store.service === "offline" &&
      h("button", { type: "button", class: "button button-ghost button-small", onClick: onCheckService }, icon("refresh"), "Check again")
  );
}

export function dashboardView(actions) {
  return h(
    "div",
    { class: "view view-wide" },
    h(
      "header",
      { class: "page-head" },
      h("p", { class: "eyebrow" }, "Dashboard"),
      h("h1", { tabindex: "-1" }, "See how your daily habits add up"),
      h(
        "p",
        { class: "lede" },
        `Answer ${FIELDS.length} questions and a trained machine learning model will predict a mental health score. It's an estimate, not a diagnosis.`
      )
    ),
    h(
      "div",
      { class: "dash-grid" },
      assessmentCard(actions),
      h("div", { class: "dash-side" }, resultCard(), serviceCard(actions))
    ),
    h(
      "section",
      { class: "how", "aria-labelledby": "how-title" },
      h("h2", { id: "how-title", class: "card-title" }, "How it works"),
      h(
        "ol",
        {},
        HOW_IT_WORKS.map(([title, copy], index) =>
          h("li", {}, h("span", { class: "how-index" }, index + 1), h("div", {}, h("h3", {}, title), h("p", {}, copy)))
        )
      )
    ),
    h("p", { class: "fine-print" }, "Your answers stay in this tab. They're sent to the prediction API only when you run a prediction, and this page doesn't save them.")
  );
}
