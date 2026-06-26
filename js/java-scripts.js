document.addEventListener("DOMContentLoaded", () => {
  const formButton = document.querySelector(".bk-avocado-button");
  if (formButton) {
    let count = 2;
    formButton.addEventListener("click", () => {
      const nameInput = document.querySelector("input[name='bk_name_off']");
      const dateInput = document.querySelector("input[name='bk_date']");
      const diskSelect = document.querySelector("select[name='bk_disk']");
      const typeSelect = document.querySelector("select[name='bk_type']");
      const tbody = document.querySelector(".bk-table tbody");
      if (!nameInput || !dateInput || !diskSelect || !typeSelect || !tbody)
        return;
      const newRow = document.createElement("tr");
      newRow.innerHTML = `
        <td>${count++}</td>
        <td>${nameInput.value}</td>
        <td>${dateInput.value}</td>
        <td><span class="bk-sp-red">${diskSelect.value}</span></td>
        <td><span class="bk-sp-green">${typeSelect.value}</span></td>
      `;
      tbody.appendChild(newRow);
      nameInput.value = "";
      dateInput.value = "";
    });
  }
  const sliderWrapper = document.querySelector(".bk-slider-wrapper");
  const slides = document.querySelectorAll(".bk-slide");
  if (!sliderWrapper || slides.length === 0 || typeof gsap === "undefined")
    return;
  let target = 0;
  let current = 0;
  const ease = 0.075;
  let maxScroll = Math.max(0, sliderWrapper.offsetWidth - window.innerWidth);
  function lerp(start, end, factor) {
    return start + (end - start) * factor;
  }
  function updateScaleAndPosition() {
    slides.forEach((slide) => {
      const rect = slide.getBoundingClientRect();
      const centerPosition = (rect.left + rect.right) / 2;
      const distanceFromCenter = centerPosition - window.innerWidth / 2;
      let scale;
      let offsetX;
      if (distanceFromCenter > 0) {
        scale = Math.min(1.75, 1 + distanceFromCenter / window.innerWidth);
        offsetX = (scale - 1) * 300;
      } else {
        scale = Math.max(
          0.5,
          1 - Math.abs(distanceFromCenter) / window.innerWidth,
        );
        offsetX = 0;
      }
      gsap.set(slide, { scale, x: offsetX });
    });
  }
  function update() {
    current = lerp(current, target, ease);
    gsap.set(sliderWrapper, { x: -current });
    updateScaleAndPosition();
    requestAnimationFrame(update);
  }
  window.addEventListener("resize", () => {
    maxScroll = Math.max(0, sliderWrapper.offsetWidth - window.innerWidth);
    target = Math.min(target, maxScroll);
  });
  window.addEventListener("wheel", (event) => {
    target += event.deltaY;
    target = Math.max(0, Math.min(maxScroll, target));
  });
  update();
});
