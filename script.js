document.addEventListener("DOMContentLoaded", () => {
  // Set current year
  document.querySelectorAll("#current-year").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // Mobile sidebar toggle
  const toggle = document.querySelector("[data-sidebar-toggle]");
  const body = document.querySelector("[data-sidebar-layout]");

  if (toggle && body) {
    toggle.addEventListener("click", () => {
      body.toggleAttribute("data-sidebar-open");
    });
  }

  // Smooth scrolling
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const href = anchor.getAttribute("href");
      if (href === "#" || !href.startsWith("#")) return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.pushState(null, null, href);

        if (body && body.hasAttribute("data-sidebar-open")) {
          body.removeAttribute("data-sidebar-open");
        }
      }
    });
  });

  // Sidebar resize (desktop only)
  const sidebar = document.querySelector("[data-sidebar]");
  if (!sidebar || !body) return;

  const defaultWidth = 224;
  const minWidth = 200;
  const maxWidth = 500;
  let isDragging = false;
  let startX = 0;
  let startWidth = 0;

  // Check if mobile
  const isMobile = () => window.matchMedia("(max-width: 768px)").matches;

  // Create drag handle
  if (!isMobile()) {
    const handle = document.createElement("div");
    handle.style.cssText = `
      position: absolute;
      right: -4px;
      top: 0;
      bottom: 0;
      width: 8px;
      cursor: col-resize;
      z-index: 10;
      background: transparent;
      transition: background-color 0.2s;
    `;

    handle.addEventListener("mouseenter", () => {
      handle.style.backgroundColor = "var(--accent)";
    });

    handle.addEventListener("mouseleave", () => {
      if (!isDragging) handle.style.backgroundColor = "transparent";
    });

    handle.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;
      startWidth =
        parseInt(getComputedStyle(body).gridTemplateColumns.split(" ")[0]) ||
        defaultWidth;

      document.addEventListener("mousemove", drag);
      document.addEventListener("mouseup", stopDrag);

      handle.style.backgroundColor = "var(--primary)";
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    });

    handle.addEventListener("dblclick", () => {
      body.style.gridTemplateColumns = `${defaultWidth}px 1fr`;
    });

    sidebar.style.position = "relative";
    sidebar.appendChild(handle);

    // Reset to default on load
    body.style.gridTemplateColumns = `${defaultWidth}px 1fr`;
  }

  function drag(e) {
    if (!isDragging || isMobile()) return;

    const dx = e.clientX - startX;
    let newWidth = startWidth + dx;
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    body.style.gridTemplateColumns = `${newWidth}px 1fr`;
  }

  function stopDrag() {
    isDragging = false;
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", stopDrag);

    const handle = sidebar.querySelector('div[style*="cursor: col-resize"]');
    if (handle) handle.style.backgroundColor = "transparent";

    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }
});
