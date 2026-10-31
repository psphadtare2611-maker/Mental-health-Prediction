import { MODEL_FACTS } from "../config.js";
import { h } from "../dom.js";

const { trainingMin, trainingMax, typicalError } = MODEL_FACTS;

const position = (value) => {
  const percent = ((value - trainingMin) / (trainingMax - trainingMin)) * 100;
  return Math.max(0, Math.min(100, percent));
};

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Shows where the score sits within the range of scores in the training data. One colour
// throughout: the model produces a number, not a good/bad verdict.
export function scoreScale(score) {
  const low = position(score - typicalError);
  const high = position(score + typicalError);
  const marker = h("div", { class: "scale-marker" });
  const band = h("div", { class: "scale-band" });
  const ticks = [4, 5, 6, 7, 8, 9].map((tick) =>
    h("span", { class: "scale-tick", style: `left:${position(tick)}%` }, tick)
  );
  // One mark per 0.1 points, taller on whole numbers so they line up with the labels
  const marks = Array.from({ length: Math.round((trainingMax - trainingMin) * 10) + 1 }, (_, index) =>
    h("i", { class: (Math.round(trainingMin * 10) + index) % 10 === 0 ? "is-major" : null })
  );

  const el = h(
    "div",
    {
      class: "scale",
      role: "img",
      "aria-label": `Predicted score ${score.toFixed(2)}, on a scale from ${trainingMin} to ${trainingMax}, the lowest and highest scores in the training data.`,
    },
    h("div", { class: "scale-rail" }, h("div", { class: "scale-marks", "aria-hidden": "true" }, marks), band, marker),
    h("div", { class: "scale-ticks" }, ticks),
    h(
      "div",
      { class: "scale-ends" },
      h("span", {}, `${trainingMin} lowest in training data`),
      h("span", {}, `${trainingMax} highest in training data`)
    )
  );

  const place = () => {
    marker.style.left = `${position(score)}%`;
    band.style.left = `${low}%`;
    band.style.width = `${high - low}%`;
    band.style.opacity = "1";
  };
  if (reducedMotion()) place();
  else requestAnimationFrame(() => requestAnimationFrame(place));

  return el;
}
