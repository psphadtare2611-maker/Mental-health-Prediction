import { createField } from "../components/fields.js";
import { h, icon } from "../dom.js";
import { ALL_STEPS, REVIEW_STEP, STEPS } from "../schema.js";
import { store } from "../store.js";
import { validateField, validateStep } from "../validation.js";

export function stepHeader(step) {
  const index = ALL_STEPS.indexOf(step);
  return h(
    "header",
    { class: "page-head" },
    h(
      "div",
      { class: "pips", "aria-hidden": "true" },
      ALL_STEPS.map((_, pip) => h("span", { class: pip <= index ? "is-on" : null }))
    ),
    h("p", { class: "eyebrow" }, `Step ${index + 1} of ${ALL_STEPS.length}`),
    h("h1", { tabindex: "-1" }, step.title),
    h("p", { class: "lede" }, step.description)
  );
}

export function assessmentView(index, { navigate, onAnswer }) {
  const step = STEPS[index];
  const next = ALL_STEPS[index + 1];
  const summary = h("p", { class: "form-summary", role: "alert", hidden: true });

  const controls = step.fields.map((field) => {
    const control = createField(field, store.answers[field.name] ?? "", {
      onInput(value) {
        store.answers[field.name] = value;
        control.setError(null);
        summary.hidden = true;
        onAnswer();
      },
      // Only flag a field once something is in it, so tabbing past doesn't nag
      onBlur() {
        if (String(store.answers[field.name] ?? "").trim()) {
          control.setError(validateField(field, store.answers[field.name]));
        }
      },
    });
    return control;
  });

  const showErrors = (errors) => {
    controls.forEach((control) => control.setError(errors[control.name] ?? null));
    const invalid = controls.filter((control) => errors[control.name]);
    if (invalid.length) {
      summary.textContent = `${invalid.length === 1 ? "1 field needs" : `${invalid.length} fields need`} your attention.`;
      summary.hidden = false;
    }
    return invalid;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const invalid = showErrors(validateStep(step, store.answers));
    if (invalid.length) {
      invalid[0].focus();
      return;
    }
    navigate(`#/assessment/${next.id}`);
  };

  // Server-side rejections arrive here after the app routes back to the affected step
  const serverErrors = Object.fromEntries(
    step.fields.filter((field) => store.fieldErrors[field.name]).map((field) => [field.name, store.fieldErrors[field.name]])
  );
  showErrors(serverErrors);
  Object.keys(serverErrors).forEach((name) => delete store.fieldErrors[name]);

  const back =
    index === 0
      ? h("a", { class: "button button-ghost", href: "#/" }, icon("arrowLeft"), "Dashboard")
      : h("a", { class: "button button-ghost", href: `#/assessment/${STEPS[index - 1].id}` }, icon("arrowLeft"), "Previous");

  return h(
    "div",
    { class: "view" },
    stepHeader(step),
    h(
      "form",
      { class: "form", novalidate: true, onSubmit: handleSubmit },
      h("div", { class: "form-fields" }, controls.map((control) => control.el)),
      summary,
      h(
        "div",
        { class: "form-nav" },
        back,
        h("button", { type: "submit", class: "button button-primary" }, next === REVIEW_STEP ? "Review & Predict" : "Next", icon("arrowRight"))
      )
    )
  );
}
