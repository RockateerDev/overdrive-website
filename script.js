(() => {
  const body = document.body;
  if (!body) return;

  const isFinePointer = window.matchMedia?.("(pointer: fine)")?.matches ?? false;
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  if (!isFinePointer) return;

  body.classList.add("has-custom-cursor");

  const trailCanvas = document.createElement("canvas");
  trailCanvas.className = "cursor-trail";
  trailCanvas.setAttribute("aria-hidden", "true");
  body.appendChild(trailCanvas);

  const ctx = trailCanvas.getContext("2d", { alpha: true });
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  const cursor = document.createElement("div");
  cursor.className = "cursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML = '<div class="cursor-dot"></div><div class="cursor-ring"></div>';
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

  const speed = prefersReducedMotion ? 1 : 0.22;
  const drawTrail = !prefersReducedMotion && !!ctx;

  const points = [];
  const maxPoints = 26;

  const resize = () => {
    if (!ctx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    trailCanvas.width = Math.floor(w * dpr);
    trailCanvas.height = Math.floor(h * dpr);
    trailCanvas.style.width = `${w}px`;
    trailCanvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize, { passive: true });

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

    if (drawTrail && ctx) {
      points.unshift({ x, y });
      if (points.length > maxPoints) points.pop();

      ctx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);

      if (points.length > 2) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const tail = points[points.length - 1];
        const head = points[0];
        const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
        grad.addColorStop(0, "rgba(255,56,210,0.0)");
        grad.addColorStop(0.12, "rgba(255,56,210,0.65)");
        grad.addColorStop(0.55, "rgba(255,140,66,0.65)");
        grad.addColorStop(1, "rgba(255,140,66,0.0)");

        ctx.strokeStyle = grad;
        ctx.shadowColor = "rgba(255,56,210,0.45)";
        ctx.shadowBlur = 18;

        for (let pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          ctx.lineWidth = pass === 0 ? 6 : 2.5;
          ctx.globalAlpha = pass === 0 ? 0.55 : 0.9;
          ctx.stroke();
        }

        ctx.restore();
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const hoverables = "a, button, .btn, .card";
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
