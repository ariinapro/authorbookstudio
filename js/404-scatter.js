// js/404-scatter.js
// Случайно расставляет карточки товаров по полю без пересечений
// и без захода в центральную зону с текстом 404.

(function () {
  const FIELD_ID = "field";
  const SLOT_COUNT = 8; // сколько карточек показать (мокап: ~8)
  const MAX_ATTEMPTS_PER_CARD = 400;
  const GUTTER = 22; // минимальный зазор между карточками (px)
  let renderToken = 0; // защита от устаревших async render() вызовов

  // Карточки принимают РЕАЛЬНЫЕ пропорции каждого изображения
  // (узнаём через Image().naturalWidth/naturalHeight) — никаких
  // предположений о размере картинок заранее. Площадь каждой карточки
  // случайно тянется к одному из "целевых" размеров, но форма
  // (ширина/высота) ВСЕГДА точно сохраняет исходное соотношение фото,
  // независимо от того, насколько вытянутая или панорамная картинка.
  const AREA_TARGETS = [28000, 38000, 48000, 58000]; // px², от компактных до крупных
  const MIN_SIDE = 150;
  const MAX_SIDE = 320;

  function buildDeck(products, count) {
    // Повторяем товары по кругу, чтобы заполнить нужное число слотов.
    const deck = [];
    for (let i = 0; i < count; i++) {
      deck.push(products[i % products.length]);
    }
    return shuffle(deck);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Загружает изображение и возвращает его реальные пропорции.
  // Работает для любого размера картинки — мы не знаем и не должны
  // знать заранее, какая картинка какого размера. Если файл не
  // найден/не загрузился — возвращаем запасное соотношение 4:3,
  // чтобы карточка всё равно встала в раскладку.
  function getImageAspect(src) {
    return new Promise((resolve) => {
      const img = new Image();
      let settled = false;
      const fallback = () => {
        if (settled) return;
        settled = true;
        resolve({ ratio: 4 / 3, loaded: false });
      };
      img.onload = () => {
        if (settled) return;
        settled = true;
        const w = img.naturalWidth || 4;
        const h = img.naturalHeight || 3;
        // Защита от битых/нулевых размеров (некоторые форматы могут
        // вернуть 0 при ошибке декодирования, не вызвав onerror).
        if (!w || !h) {
          resolve({ ratio: 4 / 3, loaded: false });
          return;
        }
        resolve({ ratio: w / h, loaded: true });
      };
      img.onerror = fallback;
      img.src = src;
      // защита: если картинка "висит" слишком долго, не блокируем раскладку
      setTimeout(fallback, 4000);
    });
  }

  // Превращает соотношение сторон (ratio = w/h) и целевую площадь
  // в конкретные { w, h }, ограниченные [MIN_SIDE, MAX_SIDE] по КАЖДОЙ
  // стороне, но при этом точное соотношение w/h всегда равно исходному
  // ratio — без искажений даже для очень панорамных или очень
  // вытянутых фото.
  //
  // Идея: сначала находим масштаб по площади (area = w*h, w = ratio*h),
  // затем, если итоговая сторона выходит за допустимый диапазон,
  // пересчитываем масштаб целиком (а не подгоняем одну сторону отдельно
  // от другой, как было раньше — именно это могло ломать пропорции
  // у экстремальных соотношений сторон).
  function sizeFromRatio(ratio, area) {
    // h * (ratio * h) = area  =>  h = sqrt(area / ratio)
    let h = Math.sqrt(area / ratio);
    let w = h * ratio;

    // Если какая-то сторона вышла за пределы — масштабируем ОБЕ стороны
    // одним и тем же коэффициентом, чтобы ratio остался точным.
    const scaleToFit = (limit, current, biggerIsBad) => {
      if (biggerIsBad && current > limit) return limit / current;
      if (!biggerIsBad && current < limit) return limit / current;
      return 1;
    };

    let scale = 1;
    scale = Math.min(scale, scaleToFit(MAX_SIDE, Math.max(w, h), true));
    w *= scale;
    h *= scale;
    scale = 1;
    scale = Math.max(scale, scaleToFit(MIN_SIDE, Math.min(w, h), false));
    w *= scale;
    h *= scale;

    // Финальный жёсткий клампинг на случай экстремальных ratio
    // (например 10:1), когда даже после масштабирования по площади
    // одна из сторон не может одновременно влезть в [MIN_SIDE, MAX_SIDE].
    // В этом случае зажимаем по более строгому пределу и пересчитываем
    // вторую сторону строго через ratio, чтобы форма не искажалась —
    // картинка просто станет компактнее по площади, чем целевая.
    if (w > MAX_SIDE || h > MAX_SIDE) {
      if (w >= h) {
        w = MAX_SIDE;
        h = w / ratio;
      } else {
        h = MAX_SIDE;
        w = h * ratio;
      }
    }
    if (w < MIN_SIDE || h < MIN_SIDE) {
      if (w <= h) {
        w = MIN_SIDE;
        h = w / ratio;
      } else {
        h = MIN_SIDE;
        w = h * ratio;
      }
    }

    return { w: Math.round(w), h: Math.round(h) };
  }

  function rectsOverlap(a, b, gutter) {
    return !(
      a.x + a.w + gutter <= b.x ||
      b.x + b.w + gutter <= a.x ||
      a.y + a.h + gutter <= b.y ||
      b.y + b.h + gutter <= a.y
    );
  }

  function placeCards(fieldW, fieldH, sizes) {
    const placed = [];

    // Запретная зона в центре — там стоит блок "404".
    // Берём процент от размеров поля, чтобы она масштабировалась адаптивно.
    const centerZone = {
      x: fieldW * 0.5 - Math.min(260, fieldW * 0.27),
      y: fieldH * 0.5 - Math.min(190, fieldH * 0.22),
      w: Math.min(520, fieldW * 0.54),
      h: Math.min(380, fieldH * 0.44),
    };

    const MAX_SHRINK_STEPS = 5;
    const SHRINK_FACTOR = 0.85;
    const MIN_DIMENSION = 56; // не даём карточкам стать слишком крошечными

    for (const size of sizes) {
      let bestRect = null;
      // Сохраняем исходное соотношение сторон карточки на случай сжатия —
      // shrink должен сохранять форму, а не сжимать только одну сторону.
      const ratio = size.w / size.h;
      let w = size.w;
      let h = size.h;

      // На каждом шаге пробуем MAX_ATTEMPTS_PER_CARD случайных позиций
      // для текущего размера. Если ни одна не подошла — уменьшаем
      // карточку (сохраняя её ratio) и повторяем полный случайный поиск
      // заново (а не ставим её "как получится" — это и было источником
      // пересечений).
      for (let step = 0; step < MAX_SHRINK_STEPS; step++) {
        const margin = 8;
        const maxX = fieldW - w - margin * 2;
        const maxY = fieldH - h - margin * 2;
        if (maxX < 0 || maxY < 0 || w < MIN_DIMENSION || h < MIN_DIMENSION)
          break;

        for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_CARD; attempt++) {
          const x = margin + Math.random() * maxX;
          const y = margin + Math.random() * maxY;
          const rect = { x, y, w, h };

          const hitsCenter = rectsOverlap(rect, centerZone, GUTTER);
          const hitsCard = placed.some((p) => rectsOverlap(rect, p, GUTTER));

          if (!hitsCenter && !hitsCard) {
            bestRect = rect;
            break;
          }
        }

        if (bestRect) break;
        w *= SHRINK_FACTOR;
        h = w / ratio; // держим форму точной при уменьшении
      }

      // Если совсем не нашлось места даже для уменьшенной карточки —
      // пропускаем её. Лучше показать на одну карточку меньше, чем
      // допустить визуальное пересечение.
      if (bestRect) placed.push(bestRect);
      else placed.push(null);
    }

    return placed;
  }

  async function render(token) {
    const field = document.getElementById(FIELD_ID);
    if (!field || typeof products === "undefined") return;

    const fieldW = field.clientWidth;
    const fieldH = field.clientHeight;

    const deck = buildDeck(products, SLOT_COUNT);

    // Узнаём реальные пропорции каждой картинки в колоде — заранее мы
    // НЕ знаем и не предполагаем размеры файлов, только запрашиваем их
    // у браузера. Затем комбинируем с случайной целевой площадью — так
    // разные по соотношению сторон фото дают разные по форме карточки,
    // как в мокапе, но без обрезки и искажения исходного кадра.
    const aspects = await Promise.all(deck.map((p) => getImageAspect(p.thumb)));

    // Пока мы ждали загрузку картинок, мог запуститься более новый
    // render() (например, из-за ресайза). Если это так — этот вызов
    // устарел и не должен трогать DOM.
    if (token !== renderToken) return;

    const sizes = aspects.map(({ ratio }) => {
      const area =
        AREA_TARGETS[Math.floor(Math.random() * AREA_TARGETS.length)];
      return sizeFromRatio(ratio, area);
    });

    const rects = placeCards(fieldW, fieldH, sizes);

    field.innerHTML = "";

    deck.forEach((product, i) => {
      const rect = rects[i];
      if (!rect) return; // не нашлось места без пересечений — пропускаем карточку

      const card = document.createElement("a");
      card.className = "card";
      card.href = `./product.html?id=${encodeURIComponent(product.id)}`;
      card.style.left = `${rect.x}px`;
      card.style.top = `${rect.y}px`;
      card.style.width = `${rect.w}px`;
      card.style.height = `${rect.h}px`;
      card.style.animationDelay = `${i * 60}ms`;

      const frame = document.createElement("div");
      frame.className = "card__frame";

      const img = document.createElement("img");
      img.className = "card__img";
      img.alt = product.name;
      img.loading = "lazy";
      img.src = product.thumb;
      img.addEventListener("load", () => card.classList.add("card--loaded"));
      img.addEventListener("error", () => {
        // если картинки нет на диске — оставляем плейсхолдер-крест
        img.style.display = "none";
      });

      frame.appendChild(img);

      const tag = document.createElement("div");
      tag.className = "card__tag";
      tag.innerHTML = `<span class="product-label">${product.name}<br> ${product.price} ₽</span>`;

      card.appendChild(frame);
      card.appendChild(tag);
      field.appendChild(card);
    });
  }

  // Перерисовываем при загрузке и при изменении размера окна
  // (с задержкой, чтобы не пересчитывать на каждый пиксель).
  // renderToken защищает от состояния, когда быстрый ресайз запускает
  // новый render() пока предыдущий ещё ждёт загрузки картинок —
  // тогда более старый результат просто отбрасывается без касания DOM.
  function safeRender() {
    const myToken = ++renderToken;
    render(myToken);
  }

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(safeRender, 250);
  });

  document.addEventListener("DOMContentLoaded", safeRender);
})();
