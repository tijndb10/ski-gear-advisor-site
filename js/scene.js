/* Decorative scene: falling snow + gentle parallax. Purely visual; respects reduced motion. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('snow');
  var ridges = [].slice.call(document.querySelectorAll('.scene .ridge, .scene .mist, .scene .sun'));
  if (!canvas || reduce) return; // static scene only

  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  var w = 0, h = 0, flakes = [], dpr = Math.min(window.devicePixelRatio || 1, 2), running = true;

  function resize() {
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var count = Math.round(Math.min(140, Math.max(40, w / 11)));
    flakes = [];
    for (var i = 0; i < count; i++) flakes.push(make(true));
  }
  function make(anywhere) {
    var depth = Math.random();            // 0 far, 1 near
    return { x: Math.random() * w, y: anywhere ? Math.random() * h : -10,
      r: 0.8 + depth * 2.2, vy: 0.25 + depth * 1.1, vx: (Math.random() - 0.5) * 0.3,
      a: 0.35 + depth * 0.55, ph: Math.random() * 6.28, d: depth };
  }
  var t = 0;
  function frame() {
    if (!running) return;
    t += 0.01;
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      f.y += f.vy; f.x += f.vx + Math.sin(t + f.ph) * 0.25 * (0.4 + f.d);
      if (f.y > h + 10) flakes[i] = make(false);
      if (f.x < -10) f.x = w + 10; else if (f.x > w + 10) f.x = -10;
      ctx.globalAlpha = f.a;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.2832); ctx.fill();
    }
    requestAnimationFrame(frame);
  }

  // Parallax: mouse (desktop) + scroll, applied with transforms on a few layers.
  var mx = 0, sy = 0, queued = false;
  var depthOf = { r1: 6, r2: 14, r3: 26, m1: 10, m2: 20, sun: 3 };
  function paint() {
    queued = false;
    ridges.forEach(function (el) {
      var k = 0;
      for (var c in depthOf) if (el.classList.contains(c)) k = depthOf[c];
      el.style.setProperty('--px', (mx * k).toFixed(1) + 'px');
      // Ridges sink slowly as you scroll (never lift, which would expose the sky under them).
      el.style.setProperty('--py', (Math.min(sy, 600) * k / 160).toFixed(1) + 'px');
    });
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(paint); } }
  window.addEventListener('mousemove', function (e) { mx = (e.clientX / window.innerWidth - 0.5) * -1; queue(); }, { passive: true });
  window.addEventListener('scroll', function () { sy = window.scrollY; queue(); }, { passive: true });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) requestAnimationFrame(frame);
  });

  resize();
  requestAnimationFrame(frame);
})();
