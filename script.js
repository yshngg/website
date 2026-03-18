// Initialize non-layout-dependent functionality immediately
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

  // Close mobile sidebar when clicking anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", () => {
      if (body && body.hasAttribute("data-sidebar-open")) {
        body.removeAttribute("data-sidebar-open");
      }
    });
  });

  // Initialize sidebar resize after CSS is loaded
  initSidebarResize();
});

// Initialize sidebar resize functionality after CSS loads
function initSidebarResize() {
  const sidebar = document.querySelector("[data-sidebar]");
  const body = document.querySelector("[data-sidebar-layout]");

  if (!sidebar || !body) return;

  const defaultWidth = 224;
  const minWidth = 200;
  const maxWidth = 500;
  let isDragging = false;
  let startX = 0;
  let startWidth = 0;

  // Check if mobile
  const isMobile = () => window.matchMedia("(max-width: 768px)").matches;

  // Create drag handle (delayed to ensure CSS is loaded)
  function setupDragHandle() {
    if (isMobile()) return;

    const handle = document.createElement("div");
    handle.className = "sidebar-drag-handle";

    handle.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;

      // Use requestAnimationFrame to avoid layout thrashing
      requestAnimationFrame(() => {
        startWidth =
          parseInt(getComputedStyle(body).gridTemplateColumns.split(" ")[0]) ||
          defaultWidth;

        document.addEventListener("mousemove", drag);
        document.addEventListener("mouseup", stopDrag);

        handle.classList.add("dragging");
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      });
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

    const handle = sidebar.querySelector(".sidebar-drag-handle");
    if (handle) handle.classList.remove("dragging");

    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  // Wait for CSS to load before setting up drag handle
  if (document.readyState === "complete") {
    setupDragHandle();
  } else {
    window.addEventListener("load", setupDragHandle);
  }
}
