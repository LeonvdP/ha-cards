// Shared simulation for the dishwasher / washer / dryer previews: Home Connect-style entities, a fake hass with
// callService, and sim(k) to force a state: off | ready | run | alt (spin / drying / cooling) | pause | finished | door | error | alert.
const S = (state, attributes = {}) => ({ state, attributes });
let hass;
function appliancePreview({ tag, p, programs, runPower, phases, extra = {}, extraCfg = {}, alert }) {
  const id = (d, s) => `${d}.${p}_${s}`;
  const states = window.states = {
    [id("sensor", "operation_state")]: S("ready", { device_class: "enum" }),
    [id("switch", "power")]: S("on"),
    [id("select", "selected_program")]: S(programs[1], { options: programs }),
    [id("select", "active_program")]: S("unknown", { options: programs }),
    [id("sensor", "program_progress")]: S("unknown", { unit_of_measurement: "%" }),
    [id("sensor", "program_finish_time")]: S("unknown", { device_class: "timestamp" }),
    [id("sensor", "program_phase")]: S("unknown"),
    [id("binary_sensor", "door")]: S("off", { device_class: "door" }),
    [id("button", "pause_program")]: S("unknown"), [id("button", "resume_program")]: S("unknown"), [id("button", "stop_program")]: S("unknown"),
    [id("sensor", "power")]: S("0.4", { unit_of_measurement: "W", device_class: "power" }),
    ...extra,
  };
  const set = (k, st, attr) => { const e = states[k] || S("unknown"); states[k] = S(st ?? e.state, { ...e.attributes, ...(attr || {}) }); };
  const push = window.push = () => {
    hass = { language: "nl", locale: { language: "nl" }, states: { ...states }, callService };
    document.querySelectorAll(tag).forEach((c) => (c.hass = hass));
  };
  const run = (pct, mins, phase) => {
    set(id("sensor", "operation_state"), "run"); set(id("switch", "power"), "on"); set(id("binary_sensor", "door"), "off");
    set(id("sensor", "program_progress"), String(pct));
    set(id("sensor", "program_finish_time"), new Date(Date.now() + mins * 60000).toISOString());
    set(id("sensor", "program_phase"), phase); set(id("sensor", "power"), String(runPower));
  };
  const clear = (op) => {
    set(id("sensor", "operation_state"), op); set(id("sensor", "program_progress"), "unknown");
    set(id("sensor", "program_finish_time"), "unknown"); set(id("sensor", "program_phase"), "unknown"); set(id("sensor", "power"), "0.4");
  };
  window.sim = (k) => {
    if (k === "off") { clear("inactive"); set(id("switch", "power"), "off"); set(id("binary_sensor", "door"), "off"); }
    if (k === "ready") { clear("ready"); set(id("switch", "power"), "on"); set(id("binary_sensor", "door"), "off"); }
    if (k === "run") run(38, 72, phases.run);
    if (k === "alt") run(phases.altPct, phases.altMin, phases.alt);
    if (k === "pause") { set(id("sensor", "operation_state"), "pause"); set(id("sensor", "power"), "2.1"); }
    if (k === "finished") { clear("finished"); set(id("sensor", "program_progress"), "100"); }
    if (k === "door") set(id("binary_sensor", "door"), states[id("binary_sensor", "door")].state === "on" ? "off" : "on");
    if (k === "error") { set(id("sensor", "operation_state"), "error"); set(id("sensor", "power"), "0.4"); }
    if (k === "alert") set(alert, states[alert].state === "off" ? "present" : "off");
    push();
  };
  function callService(d, s, data) {
    const e = data.entity_id;
    setTimeout(() => {
      if (d === "switch") { set(e, s === "turn_on" ? "on" : "off"); if (s === "turn_off") clear("inactive"); else if (states[id("sensor", "operation_state")].state === "inactive") clear("ready"); }
      if (d === "select" && e === id("select", "selected_program")) set(e, data.option);
      if (d === "select" && e === id("select", "active_program")) run(0, 95, phases.run);
      if (d === "button" && e.endsWith("pause_program")) set(id("sensor", "operation_state"), "pause");
      if (d === "button" && e.endsWith("resume_program")) set(id("sensor", "operation_state"), "run");
      if (d === "button" && e.endsWith("stop_program")) clear("ready");
      push();
    }, 500);
    return Promise.resolve();
  }
  const cfg = {
    name: extraCfg.name, state_entity: id("sensor", "operation_state"), power_switch: id("switch", "power"),
    program: id("select", "selected_program"), phase: id("sensor", "program_phase"),
    remaining: id("sensor", "program_finish_time"), progress: id("sensor", "program_progress"), door: id("binary_sensor", "door"),
    start: id("select", "active_program"), pause: id("button", "pause_program"), resume: id("button", "resume_program"), stop: id("button", "stop_program"),
    power: id("sensor", "power"), ...extraCfg,
  };
  const el = document.createElement(tag);
  el.setConfig(cfg);
  document.getElementById("grid").appendChild(el);
  // a second card fed only by a smart plug's power sensor
  const plug = document.createElement(tag);
  plug.setConfig({ name: `${extraCfg.name} (stekker)`, power: id("sensor", "power"), show_power: true });
  document.getElementById("grid").appendChild(plug);
  push();
  document.getElementById("theme").onclick = () => document.body.classList.toggle("light");
  document.querySelectorAll("[data-sim]").forEach((b) => (b.onclick = () => sim(b.dataset.sim)));
}
