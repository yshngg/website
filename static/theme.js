const Theme = (() => {
  const STORAGE_KEY = "color-scheme";
  const ATTR = "data-color-scheme";
  const BUTTON_ID = "theme-toggle";

  const Storage = {
    get: () => localStorage.getItem(STORAGE_KEY),
    set: (scheme) => localStorage.setItem(STORAGE_KEY, scheme),
    clear: () => localStorage.removeItem(STORAGE_KEY),
  };

  const DOM = {
    getScheme: () => document.documentElement.getAttribute(ATTR),
    applyScheme: (scheme) =>
      document.documentElement.setAttribute(ATTR, scheme),
    removeScheme: () => document.documentElement.removeAttribute(ATTR),
  };

  const CYCLE_ORDER = ["light", "dark", "auto"];
  const StateMachine = {
    getNext: (current) => {
      const idx = CYCLE_ORDER.indexOf(current);
      return idx === -1 ? CYCLE_ORDER[0] : CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
    },
  };

  const LABELS = {
    light: "Switch to dark theme",
    dark: "Switch to system theme",
    auto: "Switch to light theme",
  };
  const ToggleUI = {
    getElement: () => document.getElementById(BUTTON_ID),
    update: (scheme) => {
      const btn = ToggleUI.getElement();
      if (btn) btn.setAttribute("aria-label", LABELS[scheme] || LABELS.auto);
    },
  };

  return {
    init: () => {
      const btn = ToggleUI.getElement();
      if (!btn) return;

      btn.addEventListener("click", () => {
        const current = DOM.getScheme();
        const next = StateMachine.getNext(current);

        if (next === "auto") {
          DOM.removeScheme();
          Storage.clear();
        } else {
          DOM.applyScheme(next);
          Storage.set(next);
        }

        ToggleUI.update(DOM.getScheme());
      });

      ToggleUI.update(DOM.getScheme());
    },
  };
})();
