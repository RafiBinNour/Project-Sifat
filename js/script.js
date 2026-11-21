/* ============================================================================
   LOVE IN BLOOM — script.js
   Vanilla JavaScript, no dependencies.

   Contents
   01. Helpers & state
   02. Ambient background (Canvas): bubbles, hearts, sparkles
   03. Celebration FX (Canvas): confetti, fireworks, hearts, rings
   04. Proposal view: the playful NO button & the YES moment
   05. Celebration: love meter, reveal-on-scroll, 3D tilt
   06. Love letter: envelope + five notes
   07. Ripple effect, misc wiring, teardown
   ========================================================================== */

(() => {
  'use strict';

  /* ════════════════════════════════════════════════════════════════════════
     01. HELPERS & STATE
     ════════════════════════════════════════════════════════════════════════ */

  /** Shorthand for a single element. */
  const $ = (selector, scope = document) => scope.querySelector(selector);
  /** Shorthand for a NodeList turned into an array. */
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  /** Global switch for decorative motion. */
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionAllowed = !reduceMotionQuery.matches;

  /** Palette shared by every particle system (kept in sync with the CSS tokens). */
  const PALETTE = [
    '#FF4F87', '#FFB7D5', '#B69CFF', '#8B5CF6',
    '#FFB38A', '#FFDFA6', '#FFFFFF', '#FF8FB6',
  ];

  /**
   * A single, crisp heart path drawn inside a 24 x 24 box.
   * Used by both canvas engines so every heart matches the SVG mascot.
   */
  const HEART_PATH = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
  const heartPath2D = typeof Path2D === 'function' ? new Path2D(HEART_PATH) : null;

  /** Draws a heart centred on (x, y) with the given width, honouring rotation. */
  const paintHeart = (ctx, x, y, size, color, rotation = 0) => {
    ctx.save();
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation);
    const scale = size / 24;
    ctx.scale(scale, scale);
    ctx.fillStyle = color;

    if (heartPath2D) {
      ctx.fill(heartPath2D);
    } else {
      // Fallback for engines without Path2D support.
      ctx.beginPath();
      ctx.moveTo(12, 21.35);
      ctx.bezierCurveTo(5.4, 15.36, 2, 12.28, 2, 8.5);
      ctx.bezierCurveTo(2, 5.42, 4.42, 3, 7.5, 3);
      ctx.bezierCurveTo(9.24, 3, 10.91, 3.81, 12, 5.09);
      ctx.bezierCurveTo(13.09, 3.81, 14.76, 3, 16.5, 3);
      ctx.bezierCurveTo(19.58, 3, 22, 5.42, 22, 8.5);
      ctx.bezierCurveTo(22, 12.28, 18.6, 15.36, 13.45, 20.04);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  };

  const TEXT = {
    noMessages: [
      'Are you sure? 🥺',
      'Think again! 💭',
      'Pretty please? 🌸',
      'Give me one more chance! 💗',
      'My heart is waiting! 💔',
    ],
    noMessagesExtra: [
      'Just one tiny yes? 🌷',
      'You are breaking my little heart… 💘',
      'I made a whole website for this! 🥹',
      'Okay but… please? ✨',
      'The bear is crying now 🐻💧',
    ],
    hints: [
      'psst… one of these buttons is a little shy 😌',
      'the “no” button seems to be getting smaller… 👀',
      'the “yes” button is growing. suspicious. 💗',
      'this is your sign, you know 🌷',
      'scientifically proven: yes feels better 💫',
      'the bear believes in you 🐻✨',
    ],
    loveNotes: [
      {
        greeting: 'My dearest,',
        body: 'Some feelings are too big for a text message, so I wrote them down instead. You are my favourite hello and my hardest goodbye.',
        sign: 'always yours,',
      },
      {
        greeting: 'Hello, you,',
        body: 'I like the way ordinary days turn into memories when you are in them. Tea tastes better, songs sound warmer, time moves kinder.',
        sign: 'with all my heart,',
      },
      {
        greeting: 'A tiny confession,',
        body: 'I keep a mental list of your small habits: the way you laugh a second before the joke lands. I hope I never lose that list.',
        sign: 'softly,',
      },
      {
        greeting: 'If you ever wonder,',
        body: 'On the days you feel unremarkable, remember that somebody thought you were the whole sky. That somebody is still here.',
        sign: 'looking at you,',
      },
      {
        greeting: 'One last thing,',
        body: 'Wherever this goes, thank you for making my world a warmer place to live in. I would choose this again. Every single time.',
        sign: 'forever your fool,',
      },
    ],
    loveMessages: [
      'Our love meter is at maximum — it cannot be measured.',
      'Yes! My answer is yes, and every answer after it.',
      'You are the best thing that happened to my timeline 💫',
      'Note added to the wall. My heart is officially full.',
    ],
  };

  /** Tracks whether the celebration view has already played its show. */
  const state = {
    celebrationStarted: false,
    noPresses: 0,
    letterOpen: false,
    noteIndex: 0,
    messageCount: 0,
  };


  /* ════════════════════════════════════════════════════════════════════════
     02. AMBIENT BACKGROUND — Canvas
     Multi-layer: glowing stars, rising hearts, floating glass bubbles.
     ════════════════════════════════════════════════════════════════════════ */
  const ambient = {
    canvas: null,
    ctx: null,
    particles: [],
    sprites: null,
    spriteSize: 96,
    rafId: 0,
    lastFrame: 0,
    frameInterval: 1000 / 20,   // 20 fps is plenty for slow drift
    width: 0,
    height: 0,
    dpr: 1,
    running: false,

    init() {
      this.canvas = $('#ambient-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) return;

      this.resize();
      this.buildSprites();
      this.seed();

      if (!motionAllowed) {
        this.drawStaticFrame();
        return;
      }

      window.addEventListener('resize', () => this.onResize(), { passive: true });
      this.start();
    },

    resize() {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = this.canvas.clientWidth || window.innerWidth;
      this.height = this.canvas.clientHeight || window.innerHeight;
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    },

    seed() {
      // Scale particle count with the viewport so phones stay smooth.
      const area = this.width * this.height;
      const density = clamp(Math.round(area / 34000), 14, 40);

      this.particles = Array.from({ length: density }, () => this.createParticle(true));
    },

    /**
     * Pre-render each visual once into a small offscreen canvas.
     * Blitting an image is much cheaper than rebuilding gradients per frame.
     */
    buildSprites() {
      const SPRITE = 96;
      const make = (draw) => {
        const c = document.createElement('canvas');
        c.width = SPRITE;
        c.height = SPRITE;
        draw(c.getContext('2d'), SPRITE / 2);
        return c;
      };

      this.sprites = {
        star: PALETTE.map((color) => make((ctx, r) => {
          const g = ctx.createRadialGradient(r, r, 0, r, r, r);
          g.addColorStop(0, color);
          g.addColorStop(0.35, color);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(r, r, r, 0, Math.PI * 2);
          ctx.fill();
        })),
        heart: PALETTE.map((color) => make((ctx, r) => {
          paintHeart(ctx, r, r, SPRITE * 0.82, color, 0);
        })),
        bubble: make((ctx, r) => {
          const g = ctx.createRadialGradient(r * 0.7, r * 0.68, r * 0.06, r, r, r * 0.92);
          g.addColorStop(0, 'rgba(255,255,255,0.44)');
          g.addColorStop(0.62, 'rgba(255,255,255,0.06)');
          g.addColorStop(1, 'rgba(255,255,255,0.02)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(r, r, r * 0.92, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.34)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }),
      };
      this.spriteSize = SPRITE;
    },

    createParticle(initial = false) {
      const type = pick(['star', 'heart', 'bubble', 'bubble', 'star', 'heart']);
      const size =
        type === 'heart' ? rand(9, 20) :
        type === 'bubble' ? rand(14, 54) :
        rand(1.2, 3.4);

      const color = pick(PALETTE);
      return {
        type,
        tint: PALETTE.indexOf(color),
        x: rand(0, this.width),
        y: initial ? rand(0, this.height) : this.height + rand(20, 120),
        size,
        speed: type === 'bubble' ? rand(0.08, 0.26) : rand(0.12, 0.45),
        drift: rand(-0.28, 0.28),
        sway: rand(0.4, 1.4),
        phase: rand(0, Math.PI * 2),
        alpha: type === 'bubble' ? rand(0.16, 0.4) : rand(0.3, 0.9),
        color,
        tint: 0,
        spin: rand(-0.01, 0.01),
        rotation: rand(0, Math.PI * 2),
      };
    },

    start() {
      if (this.running) return;
      this.running = true;
      this.lastFrame = 0;
      this.rafId = requestAnimationFrame((t) => this.tick(t));
    },

    stop() {
      this.running = false;
      cancelAnimationFrame(this.rafId);
    },

    tick(now = 0) {
      if (!this.running) return;

      // Cap at ~20 fps. These particles move a fifth of a pixel per frame at
      // 60fps, so the lower rate is indistinguishable — and it frees the main
      // thread for scroll and click handling.
      if (now - this.lastFrame < this.frameInterval) {
        this.rafId = requestAnimationFrame((t) => this.tick(t));
        return;
      }
      this.lastFrame = now;

      const { ctx, width, height } = this;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      for (const p of this.particles) {
        p.phase += 0.01 * p.sway;
        p.y -= p.speed;
        p.x += p.drift + Math.sin(p.phase) * 0.35;
        p.rotation += p.spin;

        // Recycle particles that leave the top of the screen.
        if (p.y < -80 || p.x < -120 || p.x > width + 120) {
          Object.assign(p, this.createParticle(false));
          continue;
        }

        const twinkle = 0.72 + 0.28 * Math.sin(p.phase * 2.1);
        ctx.globalAlpha = clamp(p.alpha * twinkle, 0, 1);

        if (p.type === 'star') {
          this.drawStar(p);
        } else if (p.type === 'heart') {
          this.drawHeart(ctx, p.x, p.y, p.size, p.color, p.rotation, p.tint);
        } else {
          this.drawBubble(ctx, p);
        }
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      this.rafId = requestAnimationFrame((t) => this.tick(t));
    },

    drawStar(p) {
      const sprite = this.sprites.star[p.tint];
      const d = p.size * 7;                 // sprite already contains the glow
      this.ctx.drawImage(sprite, p.x - d / 2, p.y - d / 2, d, d);
    },

    drawHeart(ctx, x, y, size, color, rotation, tint = 0) {
      const sprite = this.sprites.heart[tint];
      ctx.save();
      ctx.translate(x, y);
      if (rotation) ctx.rotate(rotation);
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
      ctx.restore();
    },

    drawBubble(ctx, p) {
      const d = p.size * 2.2;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.sprites.bubble, p.x - d / 2, p.y - d / 2, d, d);
      ctx.globalCompositeOperation = 'lighter';
    },

    drawStaticFrame() {
      const { ctx, width, height } = this;
      ctx.clearRect(0, 0, width, height);
      for (const p of this.particles) {
        ctx.globalAlpha = p.alpha * 0.7;
        if (p.type === 'star') this.drawStar(p);
        else if (p.type === 'heart') this.drawHeart(ctx, p.x, p.y, p.size, p.color, p.rotation, p.tint);
        else this.drawBubble(ctx, p);
      }
      ctx.globalAlpha = 1;
    },

    onResize() {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.resize();
        this.seed();
        if (!motionAllowed) this.drawStaticFrame();
      }, 180);
    },
  };


  /* ════════════════════════════════════════════════════════════════════════
     03. CELEBRATION FX — Canvas
     One shared particle array and a single rAF loop that stops itself when
     the last particle dies, so we never burn cycles on an idle page.
     ════════════════════════════════════════════════════════════════════════ */
  const fx = {
    canvas: null,
    ctx: null,
    particles: [],
    sprites: null,
    spriteSize: 96,
    rafId: 0,
    lastFrame: 0,
    frameInterval: 1000 / 20,   // 20 fps is plenty for slow drift
    width: 0,
    height: 0,
    dpr: 1,
    running: false,
    maxParticles: 1200,

    init() {
      this.canvas = $('#fx-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) return;
      this.resize();
      window.addEventListener('resize', () => this.resize(), { passive: true });
    },

    resize() {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    },

    add(particle) {
      if (!motionAllowed) return;
      if (this.particles.length >= this.maxParticles) return;
      this.particles.push(particle);
      this.start();
    },

    start() {
      if (this.running) return;
      this.running = true;
      this.lastFrame = 0;
      this.rafId = requestAnimationFrame((t) => this.tick(t));
    },

    stop() {
      this.running = false;
      cancelAnimationFrame(this.rafId);
    },

    tick() {
      if (!this.running) return;
      const { ctx, width, height } = this;
      ctx.clearRect(0, 0, width, height);

      for (let i = this.particles.length - 1; i >= 0; i -= 1) {
        const p = this.particles[i];

        p.life -= 1;
        p.vy += p.gravity;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;

        const progress = 1 - p.life / p.maxLife;
        let alpha = p.alpha;

        if (p.type === 'ring') {
          alpha = p.alpha * (1 - progress);
        } else if (p.fadeIn) {
          alpha = p.alpha * Math.min(1, progress * 6) * (p.life < 40 ? p.life / 40 : 1);
        } else {
          alpha = p.alpha * (p.life < 30 ? Math.max(0, p.life / 30) : 1);
        }

        // Remove dead or off-screen particles
        if (p.life <= 0 || p.y > height + 90 || p.x < -120 || p.x > width + 120) {
          this.particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = clamp(alpha, 0, 1);

        switch (p.type) {
          case 'confetti': this.drawConfetti(ctx, p); break;
          case 'heart':    this.drawHeartParticle(ctx, p); break;
          case 'spark':    this.drawSpark(ctx, p); break;
          case 'ring':     this.drawRing(ctx, p, progress); break;
          default: break;
        }

        ctx.restore();
      }

      if (this.particles.length === 0) {
        ctx.clearRect(0, 0, width, height);
        this.stop();
        return;
      }

      this.rafId = requestAnimationFrame(() => this.tick());
    },

    drawConfetti(ctx, p) {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Faux 3D flutter by squashing the rectangle over time
        const squash = Math.abs(Math.cos(p.rotation * 0.9));
        ctx.fillRect(-p.size * 0.5, -p.size * 0.25 * squash, p.size, p.size * 0.5 * squash + 1);
      }
    },

    drawHeartParticle(ctx, p) {
      paintHeart(ctx, p.x, p.y, p.size, p.color, p.rotation);
    },

    drawSpark(ctx, p) {
      // A spark is drawn as a short tapered streak along its own velocity,
      // which reads as a real firework trail rather than a floating dot.
      const trail = 3.2;
      const tailX = p.x - p.vx * trail;
      const tailY = p.y - p.vy * trail;

      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      // bright head
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha *= 0.85;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.62, 0, Math.PI * 2);
      ctx.fill();
    },

    drawRing(ctx, p, progress) {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1, 2.6 * (1 - progress));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size + progress * p.growth, 0, Math.PI * 2);
      ctx.stroke();
    },

    /* ---- Composed effects ------------------------------------------------ */

    /** How many particles this viewport can comfortably handle (phones get fewer). */
    get densityScale() {
      if (this.width < 480) return 0.45;
      if (this.width < 820) return 0.7;
      return 1;
    },

    /** Falling confetti from the top of the viewport. */
    confetti(count = 72, originY = -20) {
      const total = Math.round(count * this.densityScale);
      for (let i = 0; i < total; i += 1) {
        const life = randInt(150, 260);
        this.add({
          type: 'confetti',
          x: rand(0, this.width),
          y: originY + rand(-40, 40),
          vx: rand(-1.4, 1.4),
          vy: rand(1.2, 4.6),
          gravity: 0.045,
          drag: 0.995,
          size: rand(6, 13),
          color: pick(PALETTE),
          rotation: rand(0, Math.PI * 2),
          spin: rand(-0.16, 0.16),
          alpha: rand(0.75, 1),
          life,
          maxLife: life,
          shape: Math.random() < 0.35 ? 'circle' : 'rect',
        });
      }
    },

    /** Burst of hearts + sparks from a point — used for the YES moment. */
    heartBurst(x, y, count = 22) {
      const total = Math.round(count * this.densityScale);
      for (let i = 0; i < total; i += 1) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(2, 9);
        const life = randInt(80, 150);
        this.add({
          type: 'heart',
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.2,
          gravity: 0.07,
          drag: 0.982,
          size: rand(12, 30),
          color: pick(['#FF4F87', '#FF8FB6', '#FFB7D5', '#B69CFF', '#FFDFA6']),
          rotation: rand(-0.4, 0.4),
          spin: rand(-0.04, 0.04),
          alpha: 1,
          life,
          maxLife: life,
        });
      }
    },

    /** A firework: bright core sparks, a coloured ring and a few drifting hearts. */
    firework(x = rand(this.width * 0.15, this.width * 0.85), y = rand(this.height * 0.15, this.height * 0.55)) {
      const color = pick(PALETTE);
      const ringCount = 2;

      // expanding glow rings
      for (let r = 0; r < ringCount; r += 1) {
        const life = randInt(60, 90);
        this.add({
          type: 'ring',
          x, y,
          vx: 0, vy: 0,
          gravity: 0, drag: 1,
          size: 6 + r * 14,
          growth: 110 + r * 55,
          color: r === 0 ? '#FFFFFF' : color,
          rotation: 0, spin: 0,
          alpha: r === 0 ? 0.42 : 0.3,
          life,
          maxLife: life,
        });
      }

      // sparks
      const sparks = Math.round(randInt(46, 70) * this.densityScale);
      for (let i = 0; i < sparks; i += 1) {
        const angle = (i / sparks) * Math.PI * 2 + rand(-0.08, 0.08);
        const speed = rand(2.6, 8.4);
        const life = randInt(55, 105);
        this.add({
          type: 'spark',
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: 0.075,
          drag: 0.972,
          size: rand(1.6, 3.6),
          color: Math.random() < 0.4 ? '#FFFFFF' : color,
          rotation: 0, spin: 0,
          alpha: 1,
          life,
          maxLife: life,
        });
      }
    },

    /**
     * Floating emoji.
     * Emoji are rendered as DOM spans (not on canvas) because colour emoji fonts
     * are not guaranteed inside a <canvas> on every platform. Each span removes
     * itself on animationend, so nothing accumulates in the DOM.
     */
    emoji(amount = 8) {
      if (!motionAllowed) return;
      const chars = ['\u{1F497}', '\u2728', '\u{1F338}', '\u{1F4AB}', '\u{1F337}', '\u{1F49E}', '\u{1F389}'];
      const layer = document.getElementById('fx-canvas');
      if (!layer) return;

      for (let i = 0; i < amount; i += 1) {
        const span = document.createElement('span');
        span.className = 'fx-emoji';
        span.textContent = pick(chars);
        span.setAttribute('aria-hidden', 'true');
        span.style.left = `${rand(6, 92)}vw`;
        span.style.bottom = `${rand(-4, 10)}vh`;
        span.style.fontSize = `${rand(18, 34)}px`;
        span.style.setProperty('--drift', `${rand(-60, 60)}px`);
        span.style.animationDelay = `${(i * 130 + rand(0, 180)).toFixed(0)}ms`;
        document.body.appendChild(span);
        span.addEventListener('animationend', () => span.remove(), { once: true });
      }
    },
  };


  /* ════════════════════════════════════════════════════════════════════════
     04. PROPOSAL VIEW — playful NO, magical YES
     ════════════════════════════════════════════════════════════════════════ */
  const proposal = {
    view: null,
    card: null,
    yesBtn: null,
    noBtn: null,
    noLabel: null,
    hint: null,
    status: null,
    noMessages: [...TEXT.noMessages, ...TEXT.noMessagesExtra],

    init() {
      this.view = $('#proposal-view');
      this.card = $('#proposal-card');
      this.yesBtn = $('#yes-btn');
      this.noBtn = $('#no-btn');
      this.hint = $('#proposal-hint');
      this.status = $('#playful-status');
      if (!this.yesBtn || !this.noBtn) return;

      this.noLabel = $('.btn__label', this.noBtn);

      // Keep the card from ever animating with a stale tilt.
      this.yesBtn.addEventListener('click', () => this.onYes());
      this.noBtn.addEventListener('click', () => this.onNo());
    },

    /** The NO button: playful, escalating, and never a dead end. */
    onNo() {
      state.noPresses += 1;
      const press = state.noPresses;

      // 1. Change the label (cycles through all the cute messages)
      const message = this.noMessages[(press - 1) % this.noMessages.length];
      this.noLabel.innerHTML = message;

      // 2. Grow the YES button, shrink the NO button.
      //    The cap is tighter on small screens so the pill never spills out of the card.
      const maxScale = window.innerWidth < 620 ? 1.24 : 1.72;
      const yesScale = clamp(1 + press * 0.085, 1, maxScale);
      const noScale = clamp(1 - press * 0.055, 0.66, 1);
      this.yesBtn.style.setProperty('--btn-scale', yesScale.toFixed(3));
      this.noBtn.style.setProperty('--no-scale', noScale.toFixed(3));

      // 3. Playful feedback
      this.restartClass(this.noBtn, 'is-wobbling');
      this.restartClass(this.yesBtn, 'is-teasing');
      this.restartClass(this.hint, 'is-bumped');

      // 4. Update the whisper line below the buttons
      this.hint.textContent = TEXT.hints[Math.min(press, TEXT.hints.length - 1)];

      // 5. Little hearts float up from the NO button
      this.spawnPetals(this.noBtn, press);

      // 6. Announce for screen readers
      if (this.status) this.status.textContent = `You pressed no. The button now says: ${message.replace(/[^\w\s,.?!'’]/g, '')}`;
    },

    /** Restart a CSS animation class so it can replay on every click. */
    restartClass(el, className) {
      if (!el) return;
      el.classList.remove(className);
      // Force reflow so the animation is re-triggered.
      void el.offsetWidth;
      el.classList.add(className);
    },

    /** DOM based floating hearts (cheap and auto-removed). */
    spawnPetals(sourceEl, count) {
      if (!motionAllowed) return;
      const rect = sourceEl.getBoundingClientRect();
      const total = Math.min(2 + Math.floor(count / 2), 6);

      for (let i = 0; i < total; i += 1) {
        const petal = document.createElement('span');
        petal.className = 'petal';
        petal.textContent = pick(['💗', '💕', '🌸', '💖', '✨']);
        petal.style.left = `${rect.left + rand(10, rect.width - 10)}px`;
        petal.style.top = `${rect.top + rand(4, rect.height - 4)}px`;
        petal.style.setProperty('--dx', `${rand(-46, 46)}px`);
        petal.style.setProperty('--rot', `${rand(-40, 40)}deg`);
        petal.style.animationDelay = `${i * 55}ms`;
        document.body.appendChild(petal);
        petal.addEventListener('animationend', () => petal.remove(), { once: true });
      }
    },

    /** The YES moment: burst, transition, celebration. */
    onYes() {
      if (state.celebrationStarted) return;
      state.celebrationStarted = true;

      const rect = this.yesBtn.getBoundingClientRect();
      const originX = rect.left + rect.width / 2;
      const originY = rect.top + rect.height / 2;

      // Celebration burst right where the button was pressed
      fx.heartBurst(originX, originY, 26);
      fx.confetti(54, -30);
      fx.firework(originX, Math.max(120, originY - 160));
      fx.emoji(6);

      // Smooth cross-fade between views
      this.view.classList.add('is-leaving');

      const wait = motionAllowed ? 520 : 0;
      window.setTimeout(() => this.showCelebration(), wait);
    },

    showCelebration() {
      const celebrationView = $('#celebration-view');
      if (!celebrationView) return;

      this.view.hidden = true;
      this.view.classList.remove('is-active');
      celebrationView.hidden = false;
      celebrationView.classList.add('is-active', 'is-entering');

      window.scrollTo({ top: 0, behavior: motionAllowed ? 'smooth' : 'auto' });

      // Hand focus to the new heading for screen reader & keyboard users
      const heading = $('#celebration-title');
      if (heading) window.setTimeout(() => heading.focus({ preventScroll: true }), 60);

      window.setTimeout(() => celebrationView.classList.remove('is-entering'), 1400);

      celebration.startShow();
      reveal.refresh();
    },
  };


  /* ════════════════════════════════════════════════════════════════════════
     05. CELEBRATION — love meter, scroll reveals, 3D tilt
     ════════════════════════════════════════════════════════════════════════ */
  const celebration = {
    fill: null,
    value: null,
    accessible: null,
    timers: [],

    init() {
      this.fill = $('#meter-fill');
      this.value = $('#meter-value');
      this.accessible = $('#meter-accessible');
    },

    startShow() {
      // A short, escalating firework show — then a gentle confetti encore.
      const beats = [0, 420, 900, 1500];
      beats.forEach((delay, i) => {
        this.timers.push(window.setTimeout(() => {
          fx.firework();
          if (i === 1) fx.confetti(60, -40);
        }, delay));
      });

      this.timers.push(window.setTimeout(() => {
        fx.confetti(80, -40);
        fx.emoji(10);
      }, 2200));

      this.animateMeter();
    },

    /** Animate the meter to 100% with a little counting flourish. */
    animateMeter() {
      if (!this.fill) return;

      window.setTimeout(() => {
        this.fill.style.width = '100%';

        if (this.value) {
          if (!motionAllowed) {
            this.value.textContent = '∞';
          } else {
            // Count 0 → 100 over ~700 ms (time based, so it always finishes),
            // then land on the real answer.
            const duration = 700;
            const startedAt = performance.now();
            const step = (now) => {
              const progress = clamp((now - startedAt) / duration, 0, 1);
              if (progress < 1) {
                this.value.textContent = `${Math.round(progress * 100)}%`;
                requestAnimationFrame(step);
              } else {
                this.value.textContent = '∞';
                if (this.accessible) this.accessible.textContent = TEXT.loveMessages[0];
              }
            };
            requestAnimationFrame(step);
          }
        }
      }, 380);

      if (this.accessible) this.accessible.textContent = 'Our love meter is filling up…';
    },
  };

  /** Reveal panels as they enter the viewport. */
  const reveal = {
    observer: null,

    init() {
      const targets = $$('.reveal');
      if (!targets.length) return;

      if (!('IntersectionObserver' in window) || !motionAllowed) {
        targets.forEach((el) => el.classList.add('is-visible'));
        return;
      }

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

      targets.forEach((el) => this.observer.observe(el));
    },

    /** Re-check elements that were hidden while the celebration view was hidden. */
    refresh() {
      if (!this.observer) {
        $$('.reveal').forEach((el) => el.classList.add('is-visible'));
        return;
      }
      $$('.reveal').forEach((el) => {
        if (!el.classList.contains('is-visible')) this.observer.observe(el);
      });
    },
  };

  /** Subtle pointer-driven 3D tilt on the glass cards. */
  const tilt = {
    cards: [],
    finePointer: window.matchMedia('(hover: hover) and (pointer: fine)'),

    init() {
      this.cards = $$('[data-tilt]');
      if (!this.cards.length || !this.finePointer.matches) return;

      this.cards.forEach((card) => {
        card.addEventListener('pointermove', (event) => this.onMove(event, card));
        card.addEventListener('pointerleave', () => this.reset(card));
        card.addEventListener('blur', () => this.reset(card), true);
      });
    },

    onMove(event, card) {
      if (!motionAllowed || event.pointerType === 'touch') return;
      const rect = card.getBoundingClientRect();
      const relX = (event.clientX - rect.left) / rect.width - 0.5;
      const relY = (event.clientY - rect.top) / rect.height - 0.5;

      card.style.setProperty('--tilt-x', `${(-relY * 5).toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${(relX * 6).toFixed(2)}deg`);
      card.style.setProperty('--lift', '-4px');
    },

    reset(card) {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
      card.style.setProperty('--lift', '0px');
    },
  };


  /* ════════════════════════════════════════════════════════════════════════
     06. LOVE LETTER — envelope + five notes
     ════════════════════════════════════════════════════════════════════════ */
  const letter = {
    envelope: null,
    toggleBtn: null,
    anotherBtn: null,
    content: null,
    progress: null,
    dotsWrap: null,
    progressText: null,
    toggleLabel: null,
    bloom: null,
    notes: TEXT.loveNotes,

    init() {
      this.envelope = $('#envelope');
      this.toggleBtn = $('#letter-toggle');
      this.anotherBtn = $('#another-note');
      this.content = $('#letter-content');
      this.progress = $('#letter-progress');
      this.bloom = $('#letter-bloom');
      if (!this.envelope || !this.toggleBtn || !this.content) return;

      this.toggleLabel = $('.btn__label', this.toggleBtn);
      this.dotsWrap = $('.letter-progress__dots', this.progress);
      this.progressText = $('.letter-progress__text', this.progress);

      this.buildDots();
      this.renderNote(0, false);

      this.toggleBtn.addEventListener('click', () => this.toggle());

      if (this.anotherBtn) {
        this.anotherBtn.addEventListener('click', () => this.nextNote());
      }

      this.watchBloom();
    },

    watchBloom() {
      if (!this.bloom) return;

      if (!('IntersectionObserver' in window)) {
        const revealWhenVisible = () => {
          const rect = this.bloom.getBoundingClientRect();
          if (rect.top > window.innerHeight * 0.85 || rect.bottom < window.innerHeight * 0.15) return;
          this.bloom.classList.add('is-blooming');
          this.bloom.setAttribute('aria-hidden', 'false');
          window.removeEventListener('scroll', revealWhenVisible);
          window.removeEventListener('resize', revealWhenVisible);
        };
        window.addEventListener('scroll', revealWhenVisible, { passive: true });
        window.addEventListener('resize', revealWhenVisible);
        revealWhenVisible();
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        this.bloom.classList.add('is-blooming');
        this.bloom.setAttribute('aria-hidden', 'false');
        observer.disconnect();
      }, { threshold: 0.35 });

      observer.observe(this.bloom);
    },

    buildDots() {
      if (!this.dotsWrap) return;
      const fragment = document.createDocumentFragment();
      this.notes.forEach(() => fragment.appendChild(document.createElement('i')));
      this.dotsWrap.appendChild(fragment);
    },

    toggle() {
      state.letterOpen ? this.close() : this.open();
    },

    open() {
      state.letterOpen = true;
      this.envelope.dataset.open = 'true';
      this.toggleBtn.setAttribute('aria-expanded', 'true');
      this.toggleLabel.textContent = 'Close the letter ✉️';

      if (this.anotherBtn) this.anotherBtn.hidden = false;
      if (this.progress) this.progress.classList.add('is-visible');

      // A tiny puff of hearts as the seal breaks
      const rect = this.envelope.getBoundingClientRect();
      fx.heartBurst(rect.left + rect.width / 2, rect.top + rect.height * 0.45, 12);

      window.setTimeout(() => {
        if (this.anotherBtn) this.anotherBtn.focus({ preventScroll: true });
      }, motionAllowed ? 700 : 0);
    },

    close() {
      state.letterOpen = false;
      this.envelope.dataset.open = 'false';
      this.toggleBtn.setAttribute('aria-expanded', 'false');
      this.toggleLabel.textContent = 'Open your little surprise 💌';
      if (this.anotherBtn) this.anotherBtn.hidden = true;
    },

    nextNote() {
      const next = (state.noteIndex + 1) % this.notes.length;
      this.renderNote(next, true);
    },

    /** Swap the letter content with a soft fade. */
    renderNote(index, animate) {
      const note = this.notes[index];
      if (!note) return;
      state.noteIndex = index;

      const applyContent = () => {
        const greeting = $('.letter-paper__greeting', this.content);
        const body = $('.letter-paper__body', this.content);
        if (greeting) greeting.textContent = note.greeting;
        if (body) body.textContent = note.body;
      };

      if (animate && motionAllowed) {
        this.content.classList.remove('is-swapping');
        void this.content.offsetWidth;
        this.content.classList.add('is-swapping');
        window.setTimeout(applyContent, 300);
      } else {
        applyContent();
      }

      this.updateProgress(index);
    },

    updateProgress(index) {
      if (!this.progress) return;
      if (this.dotsWrap) {
        $$('i', this.dotsWrap).forEach((dot, i) => {
          dot.classList.toggle('is-current', i === index % this.notes.length);
        });
      }
      if (this.progressText) {
        this.progressText.textContent = `Note ${index + 1} of ${this.notes.length}`;
      }
    },
  };


  /* ════════════════════════════════════════════════════════════════════════
     07. RIPPLE, MISC WIRING, TEARDOWN
     ════════════════════════════════════════════════════════════════════════ */

  /** Material-style ripple on every button, injected at the click point. */
  const initRipples = () => {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('.btn');
      if (!button || button.disabled || !motionAllowed) return;

      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 0.9;

      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;

      button.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    });
  };

  /** Remove the entrance animation class once it has finished. */
  const initCardEntrance = () => {
    const card = $('#proposal-card');
    if (!card) return;
    card.classList.add('is-entering');
    card.addEventListener('animationend', () => card.classList.remove('is-entering'), { once: true });
  };

  /**
   * Stop drawing when nobody is looking.
   * Two separate reasons to pause:
   *   1. the tab is hidden
   *   2. the ambient scene has scrolled out of view (it is position:fixed, so
   *      it is only visible on the proposal screen)
   * This is the single biggest win for phones: no rAF work while reading the
   * letter, and none while the browser is in the background.
   */
  const initVisibilityHandling = () => {
    let ambientWanted = true;

    const sync = () => {
      const shouldRun = motionAllowed && ambientWanted && !document.hidden;
      if (shouldRun) ambient.start();
      else ambient.stop();

      if (document.hidden) fx.stop();
      else if (fx.particles.length) fx.start();
    };

    document.addEventListener('visibilitychange', sync);

    // Watch the proposal view directly instead of measuring on scroll.
    const proposalView = document.getElementById('proposal-view');
    if (proposalView && 'IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        ambientWanted = entries.some((entry) => entry.isIntersecting);
        sync();
      }, { threshold: 0.02 }).observe(proposalView);
    }
  };

  /** React live to the OS reduced-motion setting. */
  const initMotionPreference = () => {
    const handler = (event) => {
      motionAllowed = !event.matches;
      if (motionAllowed) {
        ambient.start();
      } else {
        ambient.stop();
        ambient.drawStaticFrame();
        fx.stop();
        fx.particles.length = 0;
        fx.ctx?.clearRect(0, 0, fx.width, fx.height);
      }
    };

    if (typeof reduceMotionQuery.addEventListener === 'function') {
      reduceMotionQuery.addEventListener('change', handler);
    } else if (typeof reduceMotionQuery.addListener === 'function') {
      reduceMotionQuery.addListener(handler);
    }
  };

  /** Escape closes the open letter — a small nicety for keyboard users. */
  const initKeyboardShortcuts = () => {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.letterOpen) {
        letter.close();
        letter.toggleBtn?.focus({ preventScroll: true });
      }
    });
  };

  /** Small helpers for the footer. */
  const initFooter = () => {
    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
  };

  /* ---- Boot ------------------------------------------------------------- */
  const init = () => {
    ambient.init();
    fx.init();
    proposal.init();
    celebration.init();
    reveal.init();
    tilt.init();
    letter.init();

    initRipples();
    initCardEntrance();
    initVisibilityHandling();
    initMotionPreference();
    initKeyboardShortcuts();
    initFooter();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
