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
  } catch (error) {
    console.error("Error initializing page:", error);
  }
});
