// Set current year and initialize sidebar functionality
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("#current-year").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  const body = document.querySelector("[data-sidebar-layout]");

  // Close mobile sidebar when clicking anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", () => {
      if (body && body.hasAttribute("data-sidebar-open")) {
        body.removeAttribute("data-sidebar-open");
      }
    });
  });

  initSidebarResize();

  var backToTop = document.getElementById("back-to-top");
  if (backToTop) {
    window.addEventListener("scroll", function () {
      if (window.scrollY > window.innerHeight * 1.5) {
        backToTop.classList.add("visible");
      } else {
        backToTop.classList.remove("visible");
      }
    });
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  var tocToggle = document.getElementById("toc-toggle");
  var tocPanel = document.getElementById("toc-panel");
  if (tocToggle && tocPanel) {
    tocToggle.addEventListener("click", function () {
      var parent = tocPanel.parentElement;
      if (parent.classList.contains("post-toc")) {
        parent.classList.toggle("open");
      }
    });
  }
});

// Initialize sidebar resize functionality
function initSidebarResize() {
  const sidebar = document.querySelector("[data-sidebar]");
  const body = document.querySelector("[data-sidebar-layout]");

  if (!sidebar || !body) return;

  // Get the default sidebar width from computed styles
  const getDefaultWidth = () => {
    const gridTemplate = getComputedStyle(body).gridTemplateColumns;
    if (gridTemplate) {
      const widthValue = parseInt(gridTemplate.split(" ")[0]);
      if (!isNaN(widthValue) && widthValue > 0) {
        return widthValue;
      }
    }
    return null;
  };

  const defaultWidth = getDefaultWidth();

  // Skip initialization if default width cannot be determined
  if (defaultWidth === null) {
    console.warn(
      "Could not determine sidebar width, skipping resize functionality",
    );
    return;
  }

  // Calculate min/max width as ratios of default width
  const minWidth = Math.floor(defaultWidth * 0.8);
  const maxWidth = Math.ceil(defaultWidth * 1.8);
  let isDragging = false;
  let startX = 0;
  let startWidth = 0;

  // Check if mobile using screen width
  const isMobile = () => window.matchMedia("(max-width: 768px)").matches;

  // Create and setup the drag handle for resizing
  function setupDragHandle() {
    if (isMobile()) return;

    const handle = document.createElement("div");
    handle.className = "sidebar-drag-handle";

    handle.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;

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
      requestAnimationFrame(() => {
        body.style.gridTemplateColumns = `${defaultWidth}px 1fr`;
      });
    });

    sidebar.style.position = "relative";
    sidebar.appendChild(handle);
  }

  // Handle mouse drag movement
  function drag(e) {
    if (!isDragging || isMobile()) return;

    const dx = e.clientX - startX;
    let newWidth = startWidth + dx;
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    body.style.gridTemplateColumns = `${newWidth}px 1fr`;
  }

  // Clean up after dragging ends
  function stopDrag() {
    isDragging = false;
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", stopDrag);

    const handle = sidebar.querySelector(".sidebar-drag-handle");
    if (handle) handle.classList.remove("dragging");

    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  if (document.readyState === "complete") {
    queueMicrotask(setupDragHandle);
  } else {
    window.addEventListener("load", () => {
      queueMicrotask(setupDragHandle);
    });
  }
}
