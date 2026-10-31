import { h } from "../dom.js";

const paintSlider = (slider) => {
  const percent = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.setProperty("--fill", `${percent}%`);
};

const textInput = (field, value, handlers, describedBy, extra = {}) =>
  h("input", {
    id: field.name,
    name: field.name,
    class: "input",
    value,
    placeholder: field.placeholder,
    required: true,
    autocomplete: "off",
    "aria-describedby": describedBy,
    onInput: (e) => handlers.onInput(e.target.value),
    onBlur: handlers.onBlur,
    ...extra,
  });

const numberInput = (field, value, handlers, describedBy) =>
  textInput(field, value, handlers, describedBy, {
    type: "number",
    inputmode: field.integer ? "numeric" : "decimal",
    min: field.min,
    max: field.max,
    step: field.step,
  });

const withUnit = (input, unit) => h("div", { class: "input-unit" }, input, h("span", { class: "unit" }, unit));

function numberControl(field, value, handlers, describedBy) {
  const input = numberInput(field, value, handlers, describedBy);
  return { node: withUnit(input, field.unit), focusTarget: input, invalidTarget: input };
}

function comboControl(field, value, handlers, describedBy) {
  const listId = `${field.name}-list`;
  const input = textInput(field, value, handlers, describedBy, { type: "text", list: listId, maxlength: field.maxLength });
  const list = h("datalist", { id: listId }, field.options.map((option) => h("option", { value: option })));
  return { node: h("div", {}, input, list), focusTarget: input, invalidTarget: input };
}

function selectControl(field, value, handlers, describedBy) {
  const select = h(
    "select",
    {
      id: field.name,
      name: field.name,
      class: "input select",
      required: true,
      "aria-describedby": describedBy,
      onChange: (e) => handlers.onInput(e.target.value),
      onBlur: handlers.onBlur,
    },
    h("option", { value: "", disabled: true, hidden: true, selected: !value }, "Select an option"),
    field.options.map((option) => h("option", { value: option, selected: option === value }, option))
  );
  return { node: select, focusTarget: select, invalidTarget: select };
}

// A slider paired with an exact number box. The number box holds the answer, so a slider can
// stay visibly unset (the form has no default values) until the user touches it.
function rangeControl(field, value, handlers, describedBy) {
  const slider = h("input", {
    type: "range",
    class: "slider",
    min: field.min,
    max: field.max,
    step: field.step,
    value: value === "" ? field.min : value,
    "aria-label": `${field.label}, ${field.unit}`,
  });
  const number = numberInput(field, value, handlers, describedBy);
  const wrap = h(
    "div",
    { class: "range" },
    h("div", { class: "range-track" }, slider, h("div", { class: "range-ends", "aria-hidden": "true" }, h("span", {}, field.min), h("span", {}, field.max))),
    withUnit(number, field.unit)
  );

  const sync = () => {
    wrap.classList.toggle("is-unset", number.value === "");
    paintSlider(slider);
  };
  const commit = () => {
    number.value = slider.value;
    handlers.onInput(slider.value);
    sync();
  };
  slider.addEventListener("input", commit);
  // Clicking the slider's starting position fires no input event, but it is still an answer
  slider.addEventListener("click", () => number.value === "" && commit());
  number.addEventListener("input", () => {
    slider.value = number.value === "" ? field.min : number.value;
    sync();
  });
  sync();

  return { node: wrap, focusTarget: number, invalidTarget: number };
}

function radioControl(field, value, handlers, tileContent) {
  const radios = field.options.map((option) =>
    h("input", {
      type: "radio",
      name: field.name,
      value: option,
      checked: option === value,
      onChange: () => handlers.onInput(option),
    })
  );
  const node = h(
    "div",
    { class: `choices choices-${field.type} choices-${field.options.length}` },
    radios.map((radio, index) => h("label", { class: "choice" }, radio, tileContent(field.options[index], index)))
  );
  return {
    node,
    focusTarget: { focus: () => (radios.find((radio) => radio.checked) ?? radios[0]).focus() },
  };
}

const choiceControl = (field, value, handlers) =>
  radioControl(field, value, handlers, (option) => h("span", { class: "choice-tile" }, option));

// Stress levels are ordered, so each tile shows its position on the scale
const scaleControl = (field, value, handlers) =>
  radioControl(field, value, handlers, (option, index) =>
    h(
      "span",
      { class: "choice-tile" },
      h("span", { class: "level", "aria-hidden": "true" }, field.options.map((_, bar) => h("i", { class: bar <= index ? "on" : null }))),
      option
    )
  );

const CONTROLS = {
  number: numberControl,
  combo: comboControl,
  select: selectControl,
  range: rangeControl,
  choice: choiceControl,
  scale: scaleControl,
};

// Returns { el, name, setError(message | null), focus() } for one schema field
export function createField(field, value, handlers) {
  const isGroup = field.type === "choice" || field.type === "scale";
  const hintId = field.hint ? `${field.name}-hint` : null;
  const errorId = `${field.name}-error`;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ");

  const control = CONTROLS[field.type](field, value, handlers, describedBy);
  const label = isGroup
    ? h("legend", { class: "field-label" }, field.label)
    : h("label", { class: "field-label", for: field.name }, field.label);
  const hint = field.hint ? h("p", { id: hintId, class: "field-hint" }, field.hint) : null;
  const error = h("p", { id: errorId, class: "field-error", hidden: true });

  const el = h(
    isGroup ? "fieldset" : "div",
    { class: "field", "aria-describedby": isGroup ? describedBy : null },
    label,
    control.node,
    hint,
    error
  );

  return {
    el,
    name: field.name,
    setError(message) {
      el.classList.toggle("has-error", Boolean(message));
      error.textContent = message ?? "";
      error.hidden = !message;
      if (message) control.invalidTarget?.setAttribute("aria-invalid", "true");
      else control.invalidTarget?.removeAttribute("aria-invalid");
    },
    focus: () => control.focusTarget.focus(),
  };
}
