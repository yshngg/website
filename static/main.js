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

  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const id = link.getAttribute("href").slice(1);
    if (!id) return;

    const target = document.getElementById(id);
    if (!target) return;

    e.preventDefault();

    const nav = document.querySelector("nav[data-topnav]");
    const navHeight = nav ? nav.getBoundingClientRect().height : 0;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight;

    window.scrollTo({ top: targetTop, behavior: "smooth" });
  });
});
