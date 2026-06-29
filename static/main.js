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

  document.querySelectorAll("pre code").forEach((code) => {
    var lines = code.innerHTML.split("\n");
    if (lines.length > 0 && lines[lines.length - 1].trim() === "") {
      lines.pop();
    }
    var html = "";
    for (var i = 0; i < lines.length; i++) {
      html +=
        '<span class="giallo-l"><span class="giallo-ln">' +
        (i + 1) +
        "</span>" +
        lines[i] +
        "</span>";
      if (i < lines.length - 1) html += "\n";
    }
    code.innerHTML = html;
  });
});
