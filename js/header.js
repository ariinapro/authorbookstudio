document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".site-nav");
  let scrollTimeout;
  let isHovering = false;
  let isScrolling = false;
  let isVisible = false;

  // Elements that should be fully removed from the DOM when hidden,
  // instead of just being visually hidden (to avoid overlap issues).
  const glassEls = [
    nav.querySelector(".site-nav__backdrop"),
    nav.querySelector(".site-nav__backdrop-edge"),
  ].filter(Boolean);
  const linksEl = nav.querySelector(".site-nav__links");

  // Anchor (comment) nodes mark each element's original position in the DOM
  // so we know exactly where to re-insert it later.
  const glassAnchors = glassEls.map((el) => {
    const anchor = document.createComment("glass-anchor");
    el.before(anchor);
    return anchor;
  });
  const linksAnchor = linksEl
    ? (() => {
        const anchor = document.createComment("links-anchor");
        linksEl.before(anchor);
        return anchor;
      })()
    : null;

  // Track current DOM-attachment state so we don't do redundant work.
  let glassAttached = true;
  let linksAttached = true;

  function setAttached(els, anchors, attached, currentlyAttached) {
    if (attached === currentlyAttached) return currentlyAttached;
    if (attached) {
      els.forEach((el, i) => {
        anchors[i].after(el);
      });
    } else {
      els.forEach((el) => {
        el.remove();
      });
    }
    return attached;
  }

  // If an element has a CSS transition, wait for it to finish before
  // removing it from the DOM, so the fade-out (etc.) can actually play.
  // If there's no transition, remove on the next frame.
  function removeAfterTransition(el, onDone) {
    const styles = getComputedStyle(el);
    const hasTransition =
      styles.transitionDuration &&
      styles.transitionDuration.split(",").some((d) => parseFloat(d) > 0);

    if (!hasTransition) {
      requestAnimationFrame(onDone);
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener("transitionend", finish);
      clearTimeout(fallback);
      onDone();
    };
    el.addEventListener("transitionend", finish);
    // Fallback in case transitionend doesn't fire for some reason.
    const fallback = setTimeout(
      finish,
      Math.max(
        ...styles.transitionDuration
          .split(",")
          .map((d) => parseFloat(d) * 1000 || 0),
      ) + 50,
    );
  }

  function atTop() {
    return window.scrollY === 0;
  }

  function refresh() {
    const top = atTop();
    const hoverExtends = isHovering && isVisible;
    const active = isScrolling || hoverExtends;
    const glassVisible = !top && active;
    const linksVisible = top || active;
    isVisible = glassVisible || linksVisible;

    nav.classList.toggle("is-glass-visible", glassVisible);
    nav.classList.toggle("is-links-visible", linksVisible);
    nav.classList.toggle("is-away-from-top", !top);

    // Glass elements: attach immediately when becoming visible;
    // detach from DOM only after the hide transition finishes.
    if (glassVisible && !glassAttached) {
      glassAttached = setAttached(glassEls, glassAnchors, true, glassAttached);
    } else if (!glassVisible && glassAttached) {
      glassAttached = false;
      let remaining = glassEls.length;
      glassEls.forEach((el) => {
        removeAfterTransition(el, () => {
          // Re-check current state in case visibility changed again
          // while we were waiting for the transition.
          if (!nav.classList.contains("is-glass-visible") && el.isConnected) {
            el.remove();
          }
          remaining -= 1;
        });
      });
    }

    // Links element: same pattern.
    if (linksEl) {
      if (linksVisible && !linksAttached) {
        linksAttached = setAttached(
          [linksEl],
          [linksAnchor],
          true,
          linksAttached,
        );
      } else if (!linksVisible && linksAttached) {
        linksAttached = false;
        removeAfterTransition(linksEl, () => {
          if (
            !nav.classList.contains("is-links-visible") &&
            linksEl.isConnected
          ) {
            linksEl.remove();
          }
        });
      }
    }
  }

  nav.addEventListener("mouseenter", () => {
    isHovering = true;
    refresh();
  });
  nav.addEventListener("mouseleave", () => {
    isHovering = false;
    refresh();
  });
  window.addEventListener(
    "scroll",
    () => {
      isScrolling = true;
      refresh();
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
        refresh();
      }, 220);
    },
    { passive: true },
  );

  refresh();
});
