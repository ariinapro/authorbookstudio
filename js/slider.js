document.addEventListener("DOMContentLoaded", () => {
  const slider = document.querySelector(".slider");
  if (!slider) return;

  const viewport = slider.querySelector(".slider-viewport");
  const track = slider.querySelector(".slider-track");
  const slides = slider.querySelectorAll(".slide");
  // const prevBtn = slider.querySelector("[data-prev]");
  // const nextBtn = slider.querySelector("[data-next]");
  const prevBtn = document.querySelector("[data-prev]");
  const nextBtn = document.querySelector("[data-next]");
  if (!track || slides.length === 0) return;

  const slideCount = slides.length;
  let index = 0;
  function updateUI() {
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === slideCount - 1;
  }

  function goTo(newIndex) {
    index = Math.max(0, Math.min(slideCount - 1, newIndex));

    const offset = -index * viewport.offsetWidth;

    track.style.transform = `translateX(${offset}px)`;

    updateUI();
  }

  prevBtn.addEventListener("click", () => goTo(index - 1));
  nextBtn.addEventListener("click", () => goTo(index + 1));

  window.addEventListener("resize", () => goTo(index));

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") goTo(index - 1);
    if (e.key === "ArrowRight") goTo(index + 1);
  });

  updateUI();
});

document.addEventListener("DOMContentLoaded", () => {
  const items = document.querySelectorAll(".collection-items .collection-item");
  const mainPhoto = document.querySelector(".photo-frame--collection img");
  if (!items.length || !mainPhoto || typeof gsap === "undefined") return;

  const srcs = Array.from(items).map((img) => img.src);
  let current = 0;

  function goTo(index) {
    current = index;

    items.forEach((item, i) => {
      gsap.to(item, {
        opacity: i === current ? 1 : 0.3,
        scale: i === current ? 1 : 0.85,
        duration: 0.4,
        ease: "power2.out",
      });
    });

    gsap.to(mainPhoto, {
      opacity: 0,
      duration: 0.25,
      ease: "power2.out",
      onComplete: () => {
        mainPhoto.src = srcs[current];
        gsap.to(mainPhoto, { opacity: 1, duration: 0.35, ease: "power2.in" });
      },
    });
  }

  // initial state
  items.forEach((item, i) => {
    gsap.set(item, { opacity: i === 0 ? 1 : 0.3, scale: i === 0 ? 1 : 0.85 });
    item.style.cursor = "pointer";
    item.addEventListener("click", () => goTo(i));
  });
});
