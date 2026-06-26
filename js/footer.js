/* ============================================================
   footer.js
   Reusable site footer. Works when pages are opened directly
   from disk (file://) — no fetch, no server required.

   Usage: put <div id="footer-placeholder"></div> where the
   footer should appear, then load this file with:
     <script src="./js/footer.js"></script>
   ============================================================ */

(function () {
  var FOOTER_HTML = `
    <footer class="collection-footer-wrap" id="footer">
      <div class="site-footer">
        <div class="footer__row footer__row--top">
          <span class="footer__founder"
            >Логунова Екатерина — основатель студии</span
          >
          <a class="footer__link" href="./collection.html">коллекция</a>
          <a class="footer__link" href="./process.html">заказать</a>
          <a class="footer__link" href="./index.html#footer">регистрация</a>
        </div>
        <div class="footer__row footer__row--bottom">
          <span class="footer__contact"
            >Контакты: hello@theartofnotperfect.com</span
          >
          <span class="footer__copyright">© 2026 Искусство неидеального</span>
        </div>
      </div>
    </footer>
  `;

  function mountFooter() {
    var mount = document.getElementById("footer-placeholder");
    if (!mount) return;
    mount.innerHTML = FOOTER_HTML;
    document.dispatchEvent(new CustomEvent("footer:loaded"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountFooter);
  } else {
    mountFooter();
  }
})();
