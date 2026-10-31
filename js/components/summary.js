import { h } from "../dom.js";
import { formatAnswer } from "../schema.js";

// Answers for one step as a definition list; used by the review step and the results page
export const answerList = (step, answers) =>
  h(
    "dl",
    { class: "answers" },
    step.fields.map((field) =>
      h("div", { class: "answer" }, h("dt", {}, field.label), h("dd", {}, formatAnswer(field, answers[field.name])))
    )
  );
