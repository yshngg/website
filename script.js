document.addEventListener("DOMContentLoaded", function () {
  try {
    // Set current year in footer (consolidated from duplicate code in HTML)
    const currentYear = new Date().getFullYear();
    const yearElements = document.querySelectorAll("#current-year");
    yearElements.forEach((yearElement) => {
      if (yearElement) {
        yearElement.textContent = currentYear;
      }
    });

    // Mobile sidebar toggle functionality
    const sidebarToggle = document.querySelector("[data-sidebar-toggle]");
    const body = document.querySelector("[data-sidebar-layout]");
    
    if (sidebarToggle && body) {
      sidebarToggle.addEventListener("click", () => {
        if (body.hasAttribute("data-sidebar-open")) {
          body.removeAttribute("data-sidebar-open");
        } else {
          body.setAttribute("data-sidebar-open", "");
        }
      });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        try {
          const href = this.getAttribute("href");

          // Skip if it's just "#" or doesn't start with "#"
          if (href === "#" || !href.startsWith("#")) return;

          const targetElement = document.querySelector(href);
          if (targetElement) {
            e.preventDefault();
            targetElement.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });

            // Update URL without page jump
            history.pushState(null, null, href);

            // Close mobile sidebar if open
            if (body && body.hasAttribute("data-sidebar-open")) {
              body.removeAttribute("data-sidebar-open");
            }
          } else {
            console.warn(`Target element with ID "${href}" not found`);
          }
        } catch (error) {
          console.error("Error handling anchor click:", error);
          // Fall back to default behavior
          return true;
        }
      });
    });

      // Make sidebar draggable (desktop only - completely disabled on mobile)
      const sidebar = document.querySelector("[data-sidebar]");

    if (sidebar && body) {
      let dragHandle = null;
      let isDragging = false;
      let startX = 0;
      let startWidth = 0;

      // Calculate default width from CSS (14rem) - cached to avoid DOM manipulation
      let defaultWidth = null;
      const getDefaultWidth = () => {
        if (defaultWidth !== null) return defaultWidth;
        
        // Get computed style to see what 14rem equals in pixels
        const tempDiv = document.createElement("div");
        tempDiv.style.width = "14rem";
        tempDiv.style.position = "absolute";
        tempDiv.style.visibility = "hidden";
        document.body.appendChild(tempDiv);
        const widthInPixels = tempDiv.offsetWidth;
        document.body.removeChild(tempDiv);
        defaultWidth = widthInPixels || 224; // Fallback to 224px (14 * 16)
        return defaultWidth;
      };
      const minWidth = 200; // Minimum sidebar width in pixels
      const maxWidth = 500; // Maximum sidebar width in pixels

      // Function to check if we're on mobile
      function isMobileDevice() {
        return window.matchMedia("(max-width: 768px)").matches;
      }

      // Function to create drag handle (desktop only)
      function createDragHandle() {
        if (isMobileDevice()) return null;

        const handle = document.createElement("div");
        handle.style.position = "absolute";
        handle.style.right = "-4px";
        handle.style.top = "0";
        handle.style.bottom = "0";
        handle.style.width = "8px";
        handle.style.cursor = "col-resize";
        handle.style.zIndex = "10";
        handle.style.backgroundColor = "transparent";
        handle.style.transition = "background-color 0.2s";

        handle.addEventListener("mouseenter", () => {
          handle.style.backgroundColor = "var(--accent)";
        });

        handle.addEventListener("mouseleave", () => {
          if (!isDragging) {
            handle.style.backgroundColor = "transparent";
          }
        });

        // Mouse drag functionality only (no touch on mobile)
        handle.addEventListener("mousedown", startDrag);

        return handle;
      }

      function startDrag(e) {
        // Double-check we're not on mobile
        if (isMobileDevice()) return;

        isDragging = true;
        startX = e.clientX;
        startWidth = parseInt(
          getComputedStyle(body).gridTemplateColumns.split(" ")[0],
        );

        document.addEventListener("mousemove", drag);
        document.addEventListener("mouseup", stopDrag);

        if (dragHandle) {
          dragHandle.style.backgroundColor = "var(--primary)";
        }
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }

      function drag(e) {
        if (!isDragging || isMobileDevice()) return;

        const dx = e.clientX - startX;
        updateWidth(dx);
      }

      function updateWidth(dx) {
        let newWidth = startWidth + dx;

        // Constrain width
        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

        // Update grid template
        body.style.gridTemplateColumns = `${newWidth}px 1fr`;

        // Store width in localStorage for persistence
        localStorage.setItem("sidebarWidth", newWidth);
      }

      function stopDrag() {
        isDragging = false;

        document.removeEventListener("mousemove", drag);
        document.removeEventListener("mouseup", stopDrag);

        if (dragHandle) {
          dragHandle.style.backgroundColor = "transparent";
        }
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }

      // Initialize based on current device
      function initializeDragHandle() {
        const existingHandle = sidebar.querySelector(
          'div[style*="cursor: col-resize"]',
        );

        if (isMobileDevice()) {
          // Mobile: remove any existing drag handle
          if (existingHandle) {
            existingHandle.remove();
            dragHandle = null;
          }
        } else {
          // Desktop: create drag handle if it doesn't exist
          if (!existingHandle) {
            dragHandle = createDragHandle();
            if (dragHandle) {
              sidebar.style.position = "relative";
              sidebar.appendChild(dragHandle);

              // Double-click to reset to default
              dragHandle.addEventListener("dblclick", () => {
                body.style.gridTemplateColumns = `${defaultWidth}px 1fr`;
                localStorage.removeItem("sidebarWidth");
              });
            }
          } else {
            dragHandle = existingHandle;
          }

          // Load saved width from localStorage (desktop only)
          const savedWidth = localStorage.getItem("sidebarWidth");
          if (savedWidth) {
            body.style.gridTemplateColumns = `${savedWidth}px 1fr`;
          }
        }
      }

      // Debounce function for resize events
      function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
          const later = () => {
            clearTimeout(timeout);
            func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      }

      // Initial setup
      initializeDragHandle();

      // Handle window resize with debouncing
      window.addEventListener("resize", debounce(initializeDragHandle, 250));
    }
  } catch (error) {
    console.error("Error initializing page:", error);
  }
});
