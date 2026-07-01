document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("current-year").textContent =
    new Date().getFullYear();

  const goHome = document.getElementById("go-home");
  if (goHome) {
    goHome.href = window.location.pathname.indexOf("/zh") === 0 ? "/zh/" : "/";
  }

  document.querySelectorAll("pre code").forEach((block) => {
    block.querySelectorAll(".giallo-l").forEach((line, i) => {
      const ln = document.createElement("span");
      ln.className = "giallo-ln";
      ln.textContent = i + 1;
      line.prepend(ln);
    });
  });
});
