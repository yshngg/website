document.addEventListener("DOMContentLoaded", function () {
  try {
    // Set current year in footer
    const currentYear = new Date().getFullYear();
    const yearElement = document.getElementById("current-year");
    if (yearElement) {
      yearElement.textContent = currentYear;
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        try {
          const href = this.getAttribute("href");

          // Skip if it's just "#"
          if (href === "#") return;

          const targetElement = document.querySelector(href);
          if (targetElement) {
            e.preventDefault();
            targetElement.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });

            // Update URL without page jump
            history.pushState(null, null, href);
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
