(() => {
  const body = document.body;
  if (!body || body.querySelector(".palm-layer")) return;

  const onInnerPage = /(?:^|\/)(about|games|contact)(?:\.html|\/|$)/.test(
    location.pathname
  );
  if (!onInnerPage) return;

  const scripts = document.getElementsByTagName("script");
  let base = "./";
  for (let i = scripts.length - 1; i >= 0; i--) {
    const src = scripts[i].src || "";
    if (src.includes("script.js")) {
      base = src.replace(/[^/]+$/, "");
      break;
    }
  }

  const palms = [
    ["palm--left palm--large", "palm-left.png"],
    ["palm--left palm--small", "palm-left-small.png"],
    ["palm--right palm--large", "palm-right.png"],
    ["palm--right palm--small", "palm-right-small.png"],
  ];

  const layer = document.createElement("div");
  layer.className = "palm-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = palms
    .map(
      ([cls, file]) =>
        `<div class="palm ${cls}"><img class="palm__tree" src="${base}assets/palm/${file}" alt="" decoding="async"></div>`
    )
    .join("");
  body.appendChild(layer);
})();

(() => {
  const body = document.body;
  if (!body) return;

  const isFinePointer = window.matchMedia?.("(pointer: fine)")?.matches ?? false;
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  if (!isFinePointer) return;

  body.classList.add("has-custom-cursor");

  const cursor = document.createElement("div");
  cursor.className = "cursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML = `
    <svg class="cursor-bolt" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" focusable="false">
      <defs>
        <linearGradient id="cursor-bolt-holo" x1="18" y1="2" x2="46" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#7adfff" stop-opacity="0.35"/>
          <stop offset="45%" stop-color="#1a8fff" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#3de0ff" stop-opacity="0.28"/>
        </linearGradient>
      </defs>
      <path
        d="M34 2 16 34h14L18 62l30-36H34L46 2Z"
        fill="url(#cursor-bolt-holo)"
        stroke="#1568d4"
        stroke-width="3.2"
        stroke-linejoin="round"
      />
      <path
        d="M34 2 16 34h14L18 62l30-36H34L46 2Z"
        fill="none"
        stroke="#3aa0ff"
        stroke-width="1.4"
        stroke-linejoin="round"
        opacity="0.85"
      />
    </svg>
  `;
  body.appendChild(cursor);

  const getInitialCursorPos = () => {
    try {
      const raw = sessionStorage.getItem("od_cursor_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          return {
            x: Math.max(0, Math.min(window.innerWidth, parsed.x)),
            y: Math.max(0, Math.min(window.innerHeight, parsed.y)),
          };
        }
      }
    } catch {
      // ignore storage errors
    }

    const currentNav = document.querySelector('.nav a[aria-current="page"]');
    if (currentNav instanceof HTMLElement) {
      const r = currentNav.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    return { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
  };

  const initial = getInitialCursorPos();
  let x = initial.x;
  let y = initial.y;
  let tx = x;
  let ty = y;

  cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  cursor.classList.add("cursor--active");

  const speed = prefersReducedMotion ? 1 : 0.35;

  const onMove = (e) => {
    tx = e.clientX;
    ty = e.clientY;
    cursor.classList.add("cursor--active");
    try {
      sessionStorage.setItem("od_cursor_v1", JSON.stringify({ x: tx, y: ty }));
    } catch {
      // ignore storage errors
    }
  };

  const onDown = () => cursor.classList.add("cursor--down");
  const onUp = () => cursor.classList.remove("cursor--down");

  window.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("mousedown", onDown, { passive: true });
  window.addEventListener("mouseup", onUp, { passive: true });

  const tick = () => {
    x += (tx - x) * speed;
    y += (ty - y) * speed;
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const hoverables = "a, button, .btn, .card, .home-logo-wrap";
  const setHover = (isHover) => cursor.classList.toggle("cursor--hover", isHover);

  body.addEventListener(
    "mouseover",
    (e) => {
      if (!(e.target instanceof Element)) return;
      if (e.target.closest(hoverables)) setHover(true);
    },
    { passive: true }
  );

  body.addEventListener(
    "mouseout",
    (e) => {
      if (!(e.target instanceof Element)) return;
      if (e.target.closest(hoverables)) setHover(false);
    },
    { passive: true }
  );
})();

(() => {
  const wrap = document.querySelector(".home-logo-wrap");
  const layer = document.querySelector(".home-logo-bolts");
  if (!(wrap instanceof HTMLElement) || !(layer instanceof HTMLElement)) return;

  const prefersReducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  if (prefersReducedMotion) return;

  // Put bolt PNGs in assets/lightning/ - each should have its base at the TOP.
  // Edit these three filenames to match your assets.
  const LIGHTNING_TYPES = [
    "type-1.png",
    "type-2.png",
    "type-3.png",
  ];

  const scripts = document.getElementsByTagName("script");
  let base = "./";
  for (let i = scripts.length - 1; i >= 0; i--) {
    const src = scripts[i].src || "";
    if (src.includes("script.js")) {
      base = src.replace(/[^/]+$/, "");
      break;
    }
  }
  const lightningDir = `${base}assets/lightning/`;

  let active = false;
  let spawnTimer = 0;
  let clearTimer = 0;

  const clearBolts = () => {
    layer.replaceChildren();
  };

  const spawnBolt = () => {
    const file = LIGHTNING_TYPES[Math.floor(Math.random() * LIGHTNING_TYPES.length)];
    if (!file) return;

    const bolt = document.createElement("img");
    bolt.className = "home-logo-bolt";
    bolt.src = `${lightningDir}${file}`;
    bolt.alt = "";
    bolt.decoding = "async";
    bolt.draggable = false;

    const angle = Math.random() * 360;
    const scale = 0.55 + Math.random() * 0.4;
    const size = `${14 + Math.random() * 12}%`;
    const life = `${0.22 + Math.random() * 0.28}s`;

    bolt.style.setProperty("--bolt-angle", `${angle}deg`);
    bolt.style.setProperty("--bolt-scale", String(scale));
    bolt.style.setProperty("--bolt-size", size);
    bolt.style.setProperty("--bolt-life", life);

    const onDone = () => bolt.remove();
    bolt.addEventListener("animationend", onDone);
    layer.appendChild(bolt);
  };

  const tickSpawn = () => {
    if (!active) {
      spawnTimer = 0;
      return;
    }
    const burst = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < burst; i++) spawnBolt();
    spawnTimer = window.setTimeout(tickSpawn, 40 + Math.random() * 70);
  };

  const start = () => {
    if (active) return;
    active = true;
    if (clearTimer) {
      window.clearTimeout(clearTimer);
      clearTimer = 0;
    }
    wrap.classList.add("is-charged");
    document.body.classList.add("logo-charged");
    tickSpawn();
  };

  const stop = () => {
    active = false;
    wrap.classList.remove("is-charged");
    document.body.classList.remove("logo-charged");
    if (spawnTimer) {
      window.clearTimeout(spawnTimer);
      spawnTimer = 0;
    }
    if (clearTimer) window.clearTimeout(clearTimer);
    clearTimer = window.setTimeout(clearBolts, 560);
  };

  wrap.addEventListener("pointerenter", start);
  wrap.addEventListener("pointerleave", stop);
})();
