const W = 1080;
const H = 1920;
const SAFE_PAD = 36;

const ORANGE = '#FF3A01';
const MAGENTA = '#FF007B';
const BG_A = '#04011E';
const BG_B = '#0B0037';
const BG_C = '#190631';

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

let blob;
let bubbles = [];
let numbers = [];

const NUMBERS_PER_GROUP = 20;
const FUTURE_MINUTES = 5;
const TRAVEL_TIME_PER_MINUTE = 60;

let kablammoReady = false;
let digitClouds = {};
let buildRequested = false;

let secondFlash = 0;
let minuteFlash = 0;
let hourFlash = 0;

function preload() {}

function setup() {
  const canvas = createCanvas(W, H);
  canvas.parent('p5-container');
  pixelDensity(2);
  textAlign(CENTER, CENTER);
  frameRate(60);
  noStroke();

  updateTime();

  blob = new BlobLiquid(width * 0.5, height * 0.92, width * 0.45);
  enqueueFutureMinutes(minute, Date.now());

  if (typeof document !== 'undefined' && document.fonts) {
    document.fonts
      .load('400 320px "Kablammo"')
      .then(() => {
        kablammoReady = true;
        requestDigitCloudBuild();
      })
      .catch(() => {
        kablammoReady = false;
      });
  }
}

function requestDigitCloudBuild() {
  if (buildRequested) return;
  buildRequested = true;
  setTimeout(buildDigitClouds, 80);
}

function buildDigitClouds() {
  const pg = createGraphics(420, 560);
  pg.pixelDensity(1);
  pg.textAlign(CENTER, CENTER);
  pg.textFont('Kablammo');
  pg.textSize(pg.height * 0.8);

  for (let d = 0; d <= 9; d++) {
    pg.clear();
    pg.fill(255);
    pg.text(`${d}`, pg.width / 2, pg.height / 2 + pg.height * 0.05);
    pg.loadPixels();
    const pts = [];
    const step = 6;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let y = 0; y < pg.height; y += step) {
      for (let x = 0; x < pg.width; x += step) {
        const idx = 4 * (y * pg.width + x);
        const alpha = pg.pixels[idx + 3];
        if (alpha > 128) {
          minX = min(minX, x);
          maxX = max(maxX, x);
          minY = min(minY, y);
          maxY = max(maxY, y);
          const jitterX = (noise(d * 10 + x * 0.02, y * 0.02) - 0.5) * 4;
          const jitterY = (noise(d * 20 + x * 0.02, y * 0.02) - 0.5) * 4;
          pts.push({ x: x + jitterX, y: y + jitterY, baseX: x, baseY: y });
        }
      }
    }
    digitClouds[d] = {
      points: pts,
      width: maxX - minX,
      height: maxY - minY,
      minX,
      minY,
    };
  }
}

function draw() {
  updateTime();
  secondFlash = lerp(secondFlash, 0, 0.12);
  minuteFlash = lerp(minuteFlash, 0, 0.08);
  hourFlash = lerp(hourFlash, 0, 0.05);
  drawBackground();
  drawTimeCore();
  drawBlobAndBubbles();
  drawSpiral();
  drawDebugOverlay();
}

function updateTime() {
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

  hourPercentage = (minute * 60 + second + ms / 1000) / 3600;
  minutePercentage = (second + ms / 1000) / 60;
  secondPercentage = ms / 1000;
}

function drawBackground() {
  push();
  noStroke();
  const g = drawingContext.createLinearGradient(0, 0, width, height);
  const shift = osc01(frameCount * 0.02, 0.02) + hourFlash * 0.15;
  g.addColorStop(0, colorLerp(BG_A, BG_B, shift));
  g.addColorStop(1, colorLerp(BG_C, BG_A, 1 - shift));
  drawingContext.fillStyle = g;
  rect(0, 0, width, height);
  pop();

  push();
  blendMode(SCREEN);
  for (let i = 0; i < 9; i++) {
    const t = frameCount * 0.002 + i * 11.37;
    const cx = width * (0.1 + 0.8 * noise(i * 10 + t));
    const cy = height * (0.15 + 0.7 * noise(i * 20 - t));
    const r = width * 0.35 * noise(i * 30 + t * 0.7);
    const alpha = (120 + 80 * secondFlash) * noise(i * 2 + t * 1.4);
    const gradient = drawingContext.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, `rgba(255, 72, 0, ${alpha / 255})`);
    gradient.addColorStop(1, 'rgba(255, 0, 120, 0)');
    drawingContext.fillStyle = gradient;
    circle(cx, cy, r * 2);
  }

  if (minuteFlash > 0.01) {
    const halo = drawingContext.createRadialGradient(width * 0.5, height * 0.9, 0, width * 0.5, height * 0.9, width * 0.85);
    halo.addColorStop(0, `rgba(255, 120, 40, ${0.28 * minuteFlash})`);
    halo.addColorStop(1, 'rgba(255, 0, 120, 0)');
    drawingContext.fillStyle = halo;
    circle(width * 0.5, height * 0.9, width * 1.2);
  }
  pop();
}

function drawTimeCore() {
  push();
  const coreX = width * 0.5;
  const coreY = height * 0.38;
  const baseRadius = width * (0.34 + hourFlash * 0.02);

  push();
  drawingContext.save();
  drawingContext.shadowColor = `rgba(255, 60, 12, ${0.4 + hourFlash * 0.35})`;
  drawingContext.shadowBlur = 120 + hourFlash * 80;
  fill(255, 18 + hourFlash * 80);
  circle(coreX, coreY, baseRadius * (1.75 + minuteFlash * 0.18));
  drawingContext.restore();
  pop();

  push();
  fill(255, 40);
  drawColorBlindCircle(coreX, coreY, baseRadius * 1.6, {
    variants: 8,
    hueStep: 22,
    smallRadius: baseRadius * 0.065,
    jitter: 0.9,
  });
  pop();

  drawProgressArcs(coreX, coreY, baseRadius);
  drawHourGlyphs(coreX, coreY);
  drawMinuteSecondLabels(coreX, coreY + baseRadius * 0.82);
  pop();
}

function drawProgressArcs(cx, cy, baseRadius) {
  push();
  noFill();
  strokeWeight(36 + minuteFlash * 12);
  const glow = drawingContext;
  glow.save();
  glow.shadowBlur = 60 + 40 * secondFlash;
  glow.shadowColor = `rgba(255, 90, 0, ${0.45 + minuteFlash * 0.25})`;

  const hourArc = TAU * hourPercentage;
  const minuteArc = TAU * minutePercentage;
  const secondArc = TAU * secondPercentage;

  stroke(lerpColor(color(ORANGE), color(MAGENTA), 0.2 + hourFlash * 0.3));
  arc(cx, cy, baseRadius * 1.4, baseRadius * 1.4, -HALF_PI, -HALF_PI + hourArc);

  stroke(lerpColor(color(ORANGE), color(MAGENTA), 0.55));
  arc(cx, cy, baseRadius * 1.12, baseRadius * 1.12, -HALF_PI, -HALF_PI + minuteArc);

  stroke(lerpColor(color(ORANGE), color(MAGENTA), 0.8));
  arc(cx, cy, baseRadius * 0.84, baseRadius * 0.84, -HALF_PI, -HALF_PI + secondArc);

  glow.restore();
  pop();
}

function drawHourGlyphs(cx, cy) {
  const hourString = nf(hour, 2);
  const digits = [hourString.charAt(0), hourString.charAt(1)];
  const spacing = width * 0.18;
  const size = width * 0.18 * (1 + secondFlash * 0.05);
  for (let i = 0; i < digits.length; i++) {
    const dx = cx + (i - 0.5) * spacing;
    drawNumberPoints(dx, cy, size, digits[i]);
  }
}

function drawMinuteSecondLabels(cx, y) {
  const labelSize = width * 0.06;
  const minuteStr = nf(minute, 2);
  const secondStr = nf(second, 2);
  const labelOffset = width * 0.12;
  const pillWidth = width * 0.18;
  const pillHeight = labelSize * 1.4;

  push();
  if (kablammoReady) textFont('Kablammo');
  textSize(labelSize);
  drawingContext.save();
  drawingContext.shadowColor = `rgba(255, 90, 0, ${0.3 + minuteFlash * 0.3})`;
  drawingContext.shadowBlur = 30;
  fill(255, 35 + minuteFlash * 140);
  rect(cx - labelOffset - pillWidth / 2, y - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
  fill(255, 35 + secondFlash * 140);
  rect(cx + labelOffset - pillWidth / 2, y - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
  drawingContext.restore();

  fill(255, 220);
  text(`${minuteStr}′`, cx - labelOffset, y + labelSize * 0.05);
  fill(255, 180);
  text(`${secondStr}″`, cx + labelOffset, y + labelSize * 0.05);
  pop();
}

function drawBlobAndBubbles() {
  push();
  blob.draw(secondPercentage);
  if (secondChanged) {
    if (bubbles.length > 0) {
      bubbles[bubbles.length - 1].startPop();
    }
    const p = blob.spawnPoint(secondPercentage);
    const r = random(width * 0.035, width * 0.05);
    bubbles.push(new Bubble(p.x, p.y, r, nf(second, 2)));
  }

  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.update();
    b.show();
    if (b.done || b.y + b.r < -SAFE_PAD) {
      bubbles.splice(i, 1);
    }
  }
  pop();
}

function drawSpiral() {
  push();
  const nowMs = Date.now();
  translate(width * 0.16, height * 0.64);

  if (minuteChanged) {
    enqueueFutureMinutes(minute, nowMs);
  }

  stroke(255, 120, 0, 160);
  strokeWeight(14);
  noFill();
  beginShape();

  const tailStartX = -width * 0.22;
  const tailStartY = -height * 0.12;
  vertex(tailStartX, tailStartY);

  const startAngle = -HALF_PI;
  const endAngle = startAngle + TWO_PI * 3.5;
  const maxRadius = width * 0.22;
  const circleRadius = width * 0.08;

  for (let a = startAngle; a < endAngle; a += 0.05) {
    let r;
    if (a < startAngle + TWO_PI * 1) {
      r = map(a, startAngle, startAngle + TWO_PI * 1, maxRadius, maxRadius * 0.7);
    } else {
      r = map(a, startAngle + TWO_PI * 1, endAngle, maxRadius * 0.7, circleRadius);
    }

    const wavy = sin(a * 5) * 10;
    const x = (r + wavy) * cos(a);
    const y = (r + wavy) * sin(a);
    vertex(x, y);
  }
  endShape();
  noStroke();

  for (let i = 0; i < numbers.length; i++) {
    const life = (nowMs - numbers[i].born) / 1000.0;
    if (life < 0) continue;

    const travelDuration = numbers[i].travelDuration;
    if (life > travelDuration) continue;

    const startAngleTail = startAngle - PI * 1.3;
    let currentAngleProgress = map(life, 0, travelDuration, startAngleTail, endAngle);

    if (currentAngleProgress < startAngle) {
      const spiralStartX = maxRadius * cos(startAngle);
      const spiralStartY = maxRadius * sin(startAngle);
      const tailProgressX = map(currentAngleProgress, startAngleTail, startAngle, tailStartX, spiralStartX);
      const tailProgressY = map(currentAngleProgress, startAngleTail, startAngle, tailStartY, spiralStartY);
      drawSpiralNumber(numbers[i].value, tailProgressX, tailProgressY, 180);
      continue;
    }

    let r;
    if (currentAngleProgress < startAngle + TWO_PI * 1) {
      r = map(currentAngleProgress, startAngle, startAngle + TWO_PI * 1, maxRadius, maxRadius * 0.7);
    } else {
      r = map(currentAngleProgress, startAngle + TWO_PI * 1, endAngle, maxRadius * 0.7, circleRadius);
    }

    const wavy = sin(currentAngleProgress * 5) * 10;
    let x = (r + wavy) * cos(currentAngleProgress);
    let y = (r + wavy) * sin(currentAngleProgress);

    let alpha = 220;
    if (r < circleRadius + 12) {
      const fadeProgress = map(r, circleRadius + 12, circleRadius, 0, 1);
      alpha = map(fadeProgress, 0, 1, 220, 0);
      if (r < circleRadius) {
        x = 0;
        y = 0;
      }
    }

    drawSpiralNumber(numbers[i].value, x, y, alpha);
  }

  push();
  drawingContext.save();
  drawingContext.shadowBlur = 35;
  drawingContext.shadowColor = 'rgba(255, 140, 50, 0.6)';
  fill(255, 230, 210);
  circle(0, 0, circleRadius * 2 * (1 + minuteFlash * 0.08));
  fill(255, 90, 0);
  if (kablammoReady) textFont('Kablammo');
  textSize(width * 0.08);
  textStyle(BOLD);
  text(minute === 0 ? '60' : nf(minute, 2), 0, 0);
  drawingContext.restore();
  pop();

  if (numbers.length > NUMBERS_PER_GROUP * FUTURE_MINUTES * 6) {
    numbers.splice(0, numbers.length - NUMBERS_PER_GROUP * FUTURE_MINUTES * 6);
  }
  pop();
}

function enqueueFutureMinutes(baseMinute, timestamp) {
  for (let i = 0; i < FUTURE_MINUTES; i++) {
    let futureMinute = (baseMinute + i + 1) % 60;
    if (futureMinute === 0) futureMinute = 60;

    const displayMinute = nf(futureMinute, 2);
    const travelDuration = TRAVEL_TIME_PER_MINUTE * (i + 1);

    for (let j = 0; j < NUMBERS_PER_GROUP; j++) {
      numbers.push({
        value: displayMinute,
        born: timestamp + j * ((travelDuration * 1000) / NUMBERS_PER_GROUP),
        travelDuration,
      });
    }
  }
}

function drawSpiralNumber(val, x, y, alpha) {
  push();
  if (kablammoReady) textFont('Kablammo');
  noStroke();
  fill(255, 100, 0, alpha * 0.35);
  circle(x, y, width * 0.065);
  textSize(width * 0.045);
  fill(255, 140, 0, alpha);
  textStyle(BOLD);
  text(val, x, y);
  pop();
}

function drawNumberPoints(x, y, size, numberStr) {
  if (!digitClouds[numberStr]) {
    drawKablammoFallback(x, y, size, numberStr);
    return;
  }

  const data = digitClouds[numberStr];
  const scale = (size / max(data.width, 1)) * (1 + minuteFlash * 0.04);
  push();
  noStroke();
  for (let i = 0; i < data.points.length; i++) {
    const p = data.points[i];
    const jitterPhase = frameCount * 0.015 + i * 0.07;
    const px = x + (p.x - data.minX - data.width / 2) * scale + sin(jitterPhase) * 3;
    const py = y + (p.y - data.minY - data.height / 2) * scale + cos(jitterPhase * 0.8) * 3;
    const pulse = (sin(jitterPhase + secondPercentage * TAU) + 1) * 0.5;
    const hueMix = constrain(pulse + secondFlash * 0.4 + minuteFlash * 0.2, 0, 1);
    const dotSize = scale * 6 + pulse * 3 + secondFlash * 4;
    const col = lerpColor(color(ORANGE), color(MAGENTA), hueMix);
    fill(red(col), green(col), blue(col), 210);
    ellipse(px, py, dotSize, dotSize);
  }
  pop();
}

function drawKablammoFallback(x, y, size, numberStr) {
  push();
  if (kablammoReady) {
    textFont('Kablammo');
  } else {
    textFont('monospace');
  }
  textSize(size * 1.2);
  fill(255, 220);
  text(numberStr, x, y + size * 0.32);
  pop();
}

function drawDebugOverlay() {
  push();
  const panelWidth = width - SAFE_PAD * 2;
  const panelHeight = 140;
  const panelX = SAFE_PAD;
  const panelY = height - panelHeight - SAFE_PAD;

  drawingContext.save();
  drawingContext.shadowColor = `rgba(0,0,0,${0.6 + hourFlash * 0.3})`;
  drawingContext.shadowBlur = 24 + hourFlash * 26;
  fill(0, 120 + hourFlash * 80);
  rect(panelX, panelY, panelWidth, panelHeight, 24);
  drawingContext.restore();

  const timeString = `${nf(hour, 2)}:${nf(minute, 2)}:${nf(second, 2)}`;
  if (kablammoReady) textFont('Kablammo');
  textSize(width * 0.06);
  fill(255);
  text(timeString, width / 2, panelY + panelHeight * 0.38);

  textSize(width * 0.035);
  fill(255, 180);
  text(
    `h ${hourPercentage.toFixed(4)}  •  m ${minutePercentage.toFixed(4)}  •  s ${secondPercentage.toFixed(4)}`,
    width / 2,
    panelY + panelHeight * 0.74
  );
  pop();
}

function debugTimeDisplay() {}

function onSecondChange() {
  secondFlash = 1;
}
function onMinuteChange() {
  minuteFlash = 1;
  secondFlash = max(secondFlash, 0.6);
}
function onHourChange() {
  hourFlash = 1;
  minuteFlash = max(minuteFlash, 0.7);
}

// Utility helpers
function osc01(t, hz = 0.05, phase = 0) {
  return (sin(TAU * hz * t + phase) + 1) * 0.5;
}

function colorLerp(a, b, t) {
  const ca = color(a);
  const cb = color(b);
  const cc = lerpColor(ca, cb, constrain(t, 0, 1));
  return `rgba(${red(cc)},${green(cc)},${blue(cc)},1)`;
}

class BlobLiquid {
  constructor(cx, cy, baseR) {
    this.cx = cx;
    this.cy = cy;
    this.baseR = baseR;
    this.noiseScale = 0.6;
    this.jitter = baseR * 0.28;
    this.points = 220;
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
    push();
    noStroke();
    const grad = drawingContext.createRadialGradient(this.cx, this.cy, this.baseR * 0.2, this.cx, this.cy, this.baseR * 1.4);
    grad.addColorStop(0, 'rgba(255, 80, 0, 0.48)');
    grad.addColorStop(1, 'rgba(120, 0, 120, 0.12)');
    drawingContext.fillStyle = grad;
    beginShape();
    for (let i = 0; i < this.points; i++) {
      const a = map(i, 0, this.points, PI * 0.85, TAU + PI * 0.25);
      const p = this.edgeAtAngle(a, t);
      vertex(p.x, p.y);
    }
    vertex(width + SAFE_PAD, height + SAFE_PAD);
    vertex(-SAFE_PAD, height + SAFE_PAD);
    endShape(CLOSE);
    pop();
  }
  spawnPoint(t) {
    const a = random(PI * 1.05, PI * 1.4);
    const edge = this.edgeAtAngle(a, t);
    const inward = p5.Vector.sub(createVector(this.cx, this.cy), edge).setMag(width * 0.04);
    edge.add(inward);
    return edge;
  }
}

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
    this.vy = random(-1.2, -2.4);
    this.vx = random(-0.4, 0.4);
  }
  startPop() {
    if (this.popping) return;
    this.popping = true;
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: cos(random(TWO_PI)) * random(1, 3.2),
        vy: sin(random(TWO_PI)) * random(1, 3.2),
        alpha: 255,
        size: random(4, 7),
      });
    }
  }
  update() {
    if (!this.popping) {
      this.x += this.vx;
      this.y += this.vy;
    } else {
      this.popProgress += 0.05;
      if (this.popProgress > 1) this.done = true;
    }

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
        this.x - this.r * 0.4,
        this.y - this.r * 0.4,
        this.r * 0.2,
        this.x,
        this.y,
        this.r
      );
      grad.addColorStop(0, 'rgba(255, 60, 0, 0.38)');
      grad.addColorStop(0.5, 'rgba(255, 120, 0, 0.58)');
      grad.addColorStop(1, 'rgba(255, 0, 120, 0.45)');
      drawingContext.fillStyle = grad;
      circle(this.x, this.y, this.r * 2);
      fill(255);
      noStroke();
      if (kablammoReady) textFont('Kablammo');
      textSize(this.r * 0.85);
      text(this.label, this.x, this.y + 2);
    } else {
      const scale = 1 + this.popProgress * 0.6;
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

function drawColorBlindCircle(x, y, size, opts = {}) {
  const variants = opts.variants ?? 6;
  const hueStep = opts.hueStep ?? 15;
  const smallRadius = opts.smallRadius ?? max(2, size * 0.035);
  const density = 0.5;
  const jitter = opts.jitter ?? 0.6;

  const rng = createRng(Math.floor((x + y + size) * 10));
  const rRange = (minVal, maxVal) => minVal + (maxVal - minVal) * rng();

  let baseCss = drawingContext && drawingContext.fillStyle ? drawingContext.fillStyle : '#ffffff';
  let baseCol;
  try {
    baseCol = color(baseCss);
  } catch (e) {
    baseCol = color(255);
  }

  const r = red(baseCol);
  const g = green(baseCol);
  const b = blue(baseCol);
  const a = alpha(baseCol) / 255.0;

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const maxVal = Math.max(r, g, b);
    const minVal = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (maxVal + minVal) / 2;
    if (maxVal !== minVal) {
      const d = maxVal - minVal;
      s = l > 0.5 ? d / (2 - maxVal - minVal) : d / (maxVal + minVal);
      switch (maxVal) {
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
  const palette = [];
  const mid = (variants - 1) / 2;
  for (let i = 0; i < variants; i++) {
    const shift = (i - mid) * hueStep + rRange(-hueStep * 0.2, hueStep * 0.2);
    const nh = (baseHsl.h + shift + 360) % 360;
    const ns = constrain(baseHsl.s * (1 + rRange(-0.12, 0.12)), 0, 1);
    const nl = constrain(baseHsl.l * (1 + rRange(-0.12, 0.12)), 0, 1);
    const rgbv = hslToRgb(nh, ns, nl);
    palette.push({ r: rgbv.r, g: rgbv.g, b: rgbv.b, a: a * 255 });
  }

  const bigR = size / 2;
  const bigArea = PI * bigR * bigR;
  const smallArea = PI * smallRadius * smallRadius;
  let count = Math.floor((5 * bigArea) / smallArea * density);
  count = max(12, min(2600, count));

  noStroke();
  let placed = 0;
  let attempts = 0;
  const maxAttempts = count * 8 + 800;
  while (placed < count && attempts < maxAttempts) {
    attempts++;
    const px = rRange(-bigR, bigR);
    const py = rRange(-bigR, bigR);
    if (px * px + py * py <= bigR * bigR) {
      const jx = (noise(px * 0.01, py * 0.01, frameCount * 0.01) - 0.5) * smallRadius * jitter;
      const jy = (noise(px * 0.02, py * 0.02, frameCount * 0.02) - 0.5) * smallRadius * jitter;
      const finalX = x + px + jx;
      const finalY = y + py + jy;
      const col = palette[placed % palette.length];
      fill(col.r, col.g, col.b, col.a);
      ellipse(finalX, finalY, smallRadius, smallRadius);
      placed++;
    }
  }
}

function clamp(v, a, b) {
  return max(a, min(b, v));
}

function createRng(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let t2 = Math.imul(t ^ (t >>> 15), t | 1);
    t2 ^= t2 + Math.imul(t2 ^ (t2 >>> 7), t2 | 61);
    return ((t2 ^ (t2 >>> 14)) >>> 0) / 4294967296;
  };
}
