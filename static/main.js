document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("current-year").textContent =
    new Date().getFullYear();

  const backToTop = document.getElementById("back-to-top");
  if (backToTop) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > window.innerHeight * 1.5) {
        backToTop.classList.add("visible");
      } else {
        backToTop.classList.remove("visible");
      }
    });
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const tocToggle = document.getElementById("toc-toggle");
  const tocPanel = document.getElementById("toc-panel");
  if (tocToggle && tocPanel) {
    tocToggle.addEventListener("click", () => {
      tocPanel.parentElement.classList.toggle("open");
    });
  }

  document.querySelectorAll("pre code").forEach((block) => {
    const lines = block.innerHTML.split("\n");
    if (lines.at(-1).trim() === "") lines.pop();
    block.innerHTML = lines
      .map(
        (line, i) =>
          `<span class="giallo-l"><span class="giallo-ln">${i + 1}</span>${line}</span>`,
      )
      .join("\n");
  });
});
