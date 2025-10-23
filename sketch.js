let hourPercentage = 0;
let minutePercentage = 0;
let secondPercentage = 0;

let hour = 0;
let minute = 0;
let second = 0;
let miliseconds = 0;

let hourChanged = false;
let minuteChanged = false;
let secondChanged = false;

let hourFont = null;
let hourFontLoaded = false;

const _pointCache = new Map();

let blob;
let bubbles = [];

let numbers = [];

const NUMBERS_PER_GROUP = 20;
const FUTURE_MINUTES = 5; // only show 5 upcoming minutes
const TRAVEL_TIME_PER_MINUTE = 60; // seconds each minute travels

const W = 1920;
const H = 1080;
const SAFE_PAD = 24; // kleiner Sicherheitsrand
// --- Farben & Stil ---
const ORANGE = "#FF3A01";
const MAGENTA = "#FF007B"; // cyberpunkiges Magenta
const BG = "#000429";
// --- Farb-Helfer ---
function osc01(t, hz = 0.05, phase = 0) {
  // Sinus-Oszillator 0..1 (hz = Schwingungen pro Sekunde; 0.05 ≈ 20 s für hin & zurück)
  return (sin(TAU * hz * t + phase) + 1) * 0.5;
}
function rgbaFromP5Color(c, a = 1.0) {
  return rgba(red(c), green(c), blue(c), a);
}
function mixColor01(u) {
  // Interpoliert zwischen ORANGE und MAGENTA
  const c1 = color(ORANGE);
  const c2 = color(MAGENTA);
  return lerpColor(c1, c2, constrain(u, 0, 1));
}
function lighten(c, amt = 0.35) {
  // mischt Richtung Weiß
  return lerpColor(c, color(255), amt);
}
function darken(c, amt = 0.35) {
  // mischt Richtung Schwarz
  return lerpColor(c, color(0), amt);
}

function rgba(r, g, b, a = 1) {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

class BlobLiquid {
  constructor(cx, cy, baseR) {
    this.cx = cx;
    this.cy = cy;
    this.baseR = baseR;
    this.noiseScale = 0.8;
    this.jitter = 100;
    this.points = 200;
  }
  edgeAtAngle(a, t) {
    const n = noise(
      cos(a) * this.noiseScale + 10 + t * 0.15,
      sin(a) * this.noiseScale + 20 + t * 0.15
    );
    const r = this.baseR + map(n, 0, 1, -this.jitter, this.jitter);
    return createVector(this.cx + cos(a) * r, this.cy + sin(a) * r);
  }
  draw(t) {
    noStroke();
    fill(ORANGE);
    beginShape();
    for (let i = 0; i < this.points; i++) {
      const a = map(i, 0, this.points, PI * 0.75, TAU + PI * 0.15);
      const p = this.edgeAtAngle(a, t);
      vertex(p.x - 100, p.y + 200);
    }
    vertex(-100, H);
    vertex(0, 0.9 * H);
    endShape(CLOSE);
  }
  spawnPoint(t) {
    const a = random(PI * 1.1, PI * 1.45);
    const edge = this.edgeAtAngle(a, t);
    const inward = p5.Vector.sub(createVector(this.cx, this.cy), edge).setMag(24);
    edge.add(inward);
    return edge;
  }
}
// --- BLASENKLASSE ---
class Bubble {
  constructor(x, y, r, label) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.label = label;
    this.popping = false;
    this.popProgress = 0;
    this.done = false;
    this.particles = [];
    // etwas schnellerer Auftrieb mit leichter Varianz
    this.vy = random(-0.8, -1.8);
    this.vx = random(-0.1, 0.3);
  }
  startPop() {
    if (this.popping) return;
    this.popping = true;
    for (let i = 0; i < 18; i++) {
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: cos(random(TWO_PI)) * random(1, 3),
        vy: sin(random(TWO_PI)) * random(1, 3),
        alpha: 255,
        size: random(3, 6),
      });
    }
  }
  update() {
    if (!this.popping) {
      this.x += this.vx;
      this.y += this.vy; // schnellerer Aufstieg
    } else {
      this.popProgress += 0.05;
      if (this.popProgress > 1) this.done = true;
    }
    // Partikel updaten
    for (let p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 4;
    }
    this.particles = this.particles.filter((p) => p.alpha > 0);
  }
  show() {
    if (!this.popping) {
      const grad = drawingContext.createRadialGradient(
        this.x - this.r * 0.3,
        this.y - this.r * 0.3,
        this.r * 0.1,
        this.x,
        this.y,
        this.r
      );
      grad.addColorStop(0, "rgba(255,60,0,0.35)");
      grad.addColorStop(0.5, "rgba(255,106,0,0.53)");
      grad.addColorStop(1, "rgba(255,89,0,0.48)");
      drawingContext.fillStyle = grad;
      circle(this.x, this.y, this.r * 2);
      fill(255);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(this.r * 0.85);
      text(this.label, this.x, this.y + 1);
    } else {
      const scale = 1 + this.popProgress * 0.5;
      const fade = 1 - this.popProgress;
      fill(255, 150, 0, 200 * fade);
      noStroke();
      circle(this.x, this.y, this.r * 2 * scale);
    }

    for (let p of this.particles) {
      fill(255, 160, 0, p.alpha);
      noStroke();
      circle(p.x, p.y, p.size);
    }
  }
}

function preload() {
  try {
    hourFont = loadFont(
      "fonts/Zain-Regular.ttf",
      (font) => {
        hourFontLoaded = true;
        hourFont = font;
      },
      () => {
        console.warn("Konnte benutzerdefinierte Schrift nicht laden, Standard wird verwendet.");
        hourFont = null;
        hourFontLoaded = false;
      }
    );
  } catch (err) {
    console.warn("Schrift konnte nicht geladen werden, Standard wird verwendet.", err);
    hourFont = null;
    hourFontLoaded = false;
  }
}

function setup() {
  createCanvas(W, H);
  textAlign(CENTER, CENTER);
  noStroke();
  frameRate(60);
  blob = new BlobLiquid(width * 0.25, height * 0.9, 500);
  if (hourFontLoaded && hourFont) {
    textFont(hourFont);
  }
}

function updateTime() {
  // get precise current time from Date (includes milliseconds)
  const now = new Date();

  const newHour = now.getHours();
  const newMinute = now.getMinutes();
  const newSecond = now.getSeconds();

  hourChanged = false;
  minuteChanged = false;
  secondChanged = false;

  if (newSecond !== second) {
    second = newSecond;
    secondChanged = true;
    onSecondChange();
  }

  if (newMinute !== minute) {
    minute = newMinute;
    minuteChanged = true;
    onMinuteChange();
  }

  if (newHour !== hour) {
    hour = newHour;
    hourChanged = true;
    onHourChange();
  }

  const ms = now.getMilliseconds();
  miliseconds = ms;

  // fraction of the current hour: 0 <= hourPercentage < 1
  hourPercentage = (minute * 60 + second + ms / 1000) / 3600;

  // fraction of the current minute: 0 <= minutePercentage < 1
  minutePercentage = (second + ms / 1000) / 60;

  // fraction of the current second: 0 <= secondPercentage < 1
  secondPercentage = ms / 1000;
}

function debugTimeDisplay() {
  // display for debugging/verification
  fill(255, 220);
  textSize(min(width, height) * 0.08);
  const formattedTime = `${nf(hour, 2)}:${nf(minute, 2)}:${nf(second, 2)}`;
  text(formattedTime, width / 2, height / 2 - 30);

  textSize(18);
  text("hourPercentage: " + hourPercentage.toFixed(8), width / 2, height / 2 + 20);
  text("minutePercentage: " + minutePercentage.toFixed(8), width / 2, height / 2 + 50);
  text("secondPercentage: " + secondPercentage.toFixed(8), width / 2, height / 2 + 80);
}

function draw() {
  background(BG);

  updateTime();

  debugTimeDisplay();

  const hourString = nf(hour, 2);
  const hour1 = hourString.charAt(0);
  const hour2 = hourString.charAt(1);

  fill(255, 0, 0);
  drawColorBlindCircle(width / 2 - 200, height / 2 - 250, 400);

  fill(255);
  drawNumberPoints(width / 2 - 200, height / 2 - 250, 300, hour1);
  drawNumberPoints(width / 2 + 200, height / 2 - 250, 300, hour2);

  drawBlobAndBubbles();

  drawSpiral();
}

function onSecondChange() {
  // Platzhalter für Animationseffekte
}

function onMinuteChange() {
  // Platzhalter für Animationseffekte
}

function onHourChange() {
  // Platzhalter für Animationseffekte
}

function drawBlobAndBubbles() {
  blob.draw(secondPercentage);

  if (secondChanged) {
    if (bubbles.length > 0) {
      bubbles[bubbles.length - 1].startPop();
    }
    const p = blob.spawnPoint(secondPercentage);
    const r = random(40, 60);
    bubbles.push(new Bubble(p.x, p.y, r, nf(second, 2)));
  }

  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.update();
    b.show();
    if (b.done) bubbles.splice(i, 1);
  }
}

function drawNumberPoints(x, y, size, numberStr, opts = {}) {
  const sampleFactor = opts.sampleFactor ?? 0.05; // density of points
  const basePointSize = opts.pointSize ?? max(2, size * 0.05);

  if (!hourFontLoaded || !hourFont) {
    push();
    textAlign(CENTER, CENTER);
    textSize(size);
    textFont("monospace");
    textStyle(BOLD);
    text(numberStr, x, y);
    pop();
    return;
  }

  const cacheKey = `${numberStr}|${size}|${sampleFactor}`;
  let cached = _pointCache.get(cacheKey);
  if (!cached) {
    cached = hourFont.textToPoints(numberStr, 0, 0, size, {
      sampleFactor,
      simplifyThreshold: 0,
    });
    _pointCache.set(cacheKey, cached);
  }

  if (!cached || cached.length === 0) return;

  const b = hourFont.textBounds(numberStr, 0, 0, size);
  const offsetX = x - (b.x + b.w / 2);
  const offsetY = y - (b.y + b.h / 2);

  noStroke();

  for (let i = 0; i < cached.length; i++) {
    const p = cached[i];
    // optional subtle jitter per-point
    const jitter =
      (noise(p.x * 0.01, p.y * 0.01, frameCount * 0.01) - 0.5) * (basePointSize * 1.6);
    const px = p.x + offsetX + jitter;
    const py = p.y + offsetY + jitter;

    // size varies by animation and small per-point noise
    const s = basePointSize;
    fill(255, 220);
    ellipse(px, py, s, s);
  }
}

function drawColorBlindCircle(x, y, size, opts = {}) {
  // options
  const variants = opts.variants ?? 6;
  const hueStep = opts.hueStep ?? 15; // degrees between variants
  const smallRadius = opts.smallRadius ?? max(2, size * 0.035);
  const density = 0.5; // packing density 0..1
  const jitter = opts.jitter ?? 0.6; // per-point jitter multiplier

  const seededRand = mulberry32(Math.floor((x + y + size) * 9973) >>> 0);
  const randf = (min, max) => seededRand() * (max - min) + min;

  // parse current canvas fill color (works if user called fill(...) before)
  let baseCss = drawingContext && drawingContext.fillStyle ? drawingContext.fillStyle : "#ffffff";
  let baseCol;
  try {
    baseCol = color(baseCss); // p5 Color
  } catch (e) {
    baseCol = color(255); // fallback
  }

  const r = red(baseCol);
  const g = green(baseCol);
  const b = blue(baseCol);
  const a = alpha(baseCol) / 255.0; // 0..1

  // helpers: rgb <-> hsl
  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h = 0,
      s = 0,
      l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h *= 60;
    }
    return { h, s, l };
  }
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    if (s === 0) {
      const v = Math.round(l * 255);
      return { r: v, g: v, b: v };
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const hk = h / 360;
      const rr = hue2rgb(p, q, hk + 1 / 3);
      const gg = hue2rgb(p, q, hk);
      const bb = hue2rgb(p, q, hk - 1 / 3);
      return { r: Math.round(rr * 255), g: Math.round(gg * 255), b: Math.round(bb * 255) };
    }
  }

  const baseHsl = rgbToHsl(r, g, b);

  // prepare variant palette (array of {r,g,b,a})
  const palette = [];
  const mid = (variants - 1) / 2;
  for (let i = 0; i < variants; i++) {
    const shift = (i - mid) * hueStep + randf(-hueStep * 0.2, hueStep * 0.2); // small jitter
    const nh = (baseHsl.h + shift + 360) % 360;
    const ns = clamp(baseHsl.s * (1 + randf(-0.12, 0.12)), 0, 1);
    const nl = clamp(baseHsl.l * (1 + randf(-0.12, 0.12)), 0, 1);
    const rgbv = hslToRgb(nh, ns, nl);
    palette.push({ r: rgbv.r, g: rgbv.g, b: rgbv.b, a: a * 255 });
  }

  // compute how many small circles to draw based on area and density
  const bigR = size / 2;
  const bigArea = PI * bigR * bigR;
  const smallArea = PI * smallRadius * smallRadius;
  let count = Math.floor((5 * bigArea) / smallArea * density);
  count = max(8, min(2000, count)); // clamp reasonable limits

  noStroke();
  // rejection sampling inside circle
  let placed = 0;
  let attempts = 0;
  const maxAttempts = count * 10 + 1000;
  while (placed < count && attempts < maxAttempts) {
    attempts++;
    // pick a random point inside bounding square and test distance
    const px = randf(-bigR, bigR);
    const py = randf(-bigR, bigR);
    if (px * px + py * py <= bigR * bigR) {
      // small per-point offset jitter
      const jx = (noise(px * 0.01, py * 0.01, frameCount * 0.01) - 0.5) * smallRadius * jitter;
      const jy = (noise(px * 0.02, py * 0.02, frameCount * 0.02) - 0.5) * smallRadius * jitter;
      const finalX = x + px + jx;
      const finalY = y + py + jy;
      // pick a palette color
      const col = palette[placed % palette.length];
      fill(col.r, col.g, col.b, col.a);
      ellipse(finalX, finalY, smallRadius, smallRadius);
      placed++;
    }
  }
}

// small helper clamp (since p5 doesn't expose clamp globally in strict mode)
function clamp(v, a, b) {
  return max(a, min(b, v));
}

function drawSpiral() {
  const nowMs = Date.now();
  push();
  translate(width * 0.8, height / 2);

  let m = minute;
  let s = second;

  if (minuteChanged) {
    for (let i = 0; i < FUTURE_MINUTES; i++) {
      let futureMinute = (m + i + 1) % 60;
      if (futureMinute === 0) futureMinute = 60;

      const displayMinute = nf(futureMinute, 2);
      const travelDuration = TRAVEL_TIME_PER_MINUTE * (i + 1);

      for (let j = 0; j < NUMBERS_PER_GROUP; j++) {
        numbers.push({
          value: displayMinute,
          born: nowMs + (j * travelDuration * 1000) / NUMBERS_PER_GROUP,
          travelDuration,
        });
      }
    }
  }

  // --- Spiral path ---
  stroke(255, 120, 0);
  strokeWeight(16);
  noFill();
  beginShape();

  const tailStartX = -width / 6;
  const tailStartY = -height / 4.2;
  vertex(tailStartX, tailStartY);

  const startAngle = -HALF_PI;
  const endAngle = startAngle + TWO_PI * 3.5;
  const maxRadius = width / 8;
  const circleRadius = 45;

  for (let a = startAngle; a < endAngle; a += 0.05) {
    let r;
    if (a < startAngle + TWO_PI * 1) {
      r = map(a, startAngle, startAngle + TWO_PI * 1, maxRadius, maxRadius * 0.7);
    } else {
      r = map(a, startAngle + TWO_PI * 1, endAngle, maxRadius * 0.7, circleRadius);
    }

    const wavy = sin(a * 5) * 6;
    const px = (r + wavy) * cos(a);
    const py = (r + wavy) * sin(a);
    vertex(px, py);
  }
  endShape();
  noStroke();

  // --- Animate numbers ---
  for (let i = 0; i < numbers.length; i++) {
    const life = (nowMs - numbers[i].born) / 1000.0;
    if (life < 0) continue;

    const travelDuration = numbers[i].travelDuration;
    if (life > travelDuration) continue; // finished traveling → fade out naturally

    let a_num;
    let r_num;
    const currentAngleProgress = map(life, 0, travelDuration, startAngle - PI * 1.5, endAngle);

    if (currentAngleProgress < startAngle) {
      const spiralStartX = maxRadius * cos(startAngle);
      const spiralStartY = maxRadius * sin(startAngle);
      const tailProgressX = map(
        currentAngleProgress,
        startAngle - PI * 1.5,
        startAngle,
        tailStartX,
        spiralStartX
      );
      const tailProgressY = map(
        currentAngleProgress,
        startAngle - PI * 1.5,
        startAngle,
        tailStartY,
        spiralStartY
      );
      drawSpiralNumber(numbers[i].value, tailProgressX, tailProgressY, 255);
      continue;
    }

    a_num = currentAngleProgress;
    if (a_num < startAngle + TWO_PI * 1) {
      r_num = map(a_num, startAngle, startAngle + TWO_PI * 1, maxRadius, maxRadius * 0.7);
    } else {
      r_num = map(a_num, startAngle + TWO_PI * 1, endAngle, maxRadius * 0.7, circleRadius);
    }

    const wavy_num = sin(a_num * 5) * 6;
    let x = (r_num + wavy_num) * cos(a_num);
    let y = (r_num + wavy_num) * sin(a_num);

    let alpha = 255;
    if (r_num < circleRadius + 10) {
      const fadeProgress = map(r_num, circleRadius + 10, circleRadius, 0, 1);
      alpha = map(fadeProgress, 0, 1, 255, 0);
      if (r_num < circleRadius) {
        x = 0;
        y = 0;
      }
    }

    drawSpiralNumber(numbers[i].value, x, y, alpha);
  }

  // --- Center circle ---
  push();
  noStroke();
  fill(255, 240, 220);
  circle(0, 0, circleRadius * 2);
  drawingContext.shadowBlur = 25;
  drawingContext.shadowColor = "rgba(255,150,80,0.5)";
  fill(255, 90, 0);
  textSize(65);
  textStyle(BOLD);
  text(m === 0 ? "60" : nf(m, 2), 0, 0);
  pop();
  pop();

  // Limit array length (prevent memory overload)
  if (numbers.length > NUMBERS_PER_GROUP * FUTURE_MINUTES * 5) {
    numbers.splice(0, numbers.length - NUMBERS_PER_GROUP * FUTURE_MINUTES * 5);
  }
}

// Circle + number for spiral
function drawSpiralNumber(val, x, y, alpha) {
  push();
  noStroke();
  fill(255, 140, 0, alpha * 0.4);
  circle(x, y, 35);
  textSize(25);
  fill(255, 90, 0, alpha);
  textStyle(BOLD);
  text(val, x, y);
  pop();
}
