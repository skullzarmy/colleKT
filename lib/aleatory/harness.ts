/**
 * Canonical $alea Seeded PRNG Harness
 *
 * Implements the deterministic PRNG construction from aleatory (harness-core.js):
 * xmur3(seed) string-to-seed hash + sfc32 128-bit PRNG.
 * Provides client-side sandboxed execution for ALEATORY-001 / ALEATORY-002 generative art.
 */

export function buildAleatoryHarnessHtml(
    code: string,
    seed: string = "0x0000000000000000000000000000000000000000000000000000000000000000",
    params: Record<string, unknown> = {}
): string {
    const safeSeed = seed.replace(/"/g, '\\"');
    const safeParams = JSON.stringify(params);

    const harnessScript = `
<script>
// Canonical $alea seeded PRNG from aleatory/src/lib/harness-core.js
function xmur3(str) {
  var h = 1779033703 ^ str.length;
  for (var i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function sfc32(a, b, c, d) {
  return function () {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    var t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

// Initialize seed & PRNG stream
var SEED_STRING = "${safeSeed}";
var seedGen = xmur3(SEED_STRING);
var rand = sfc32(seedGen(), seedGen(), seedGen(), seedGen());

// Override Math.random with deterministic stream
Math.random = function() {
  return rand();
};

// Expose full $alea lifecycle and helper API (ALEATORY-001 & ALEATORY-002)
var PARAMS = ${safeParams};
window.$alea = {
  seed: SEED_STRING,
  hash: SEED_STRING,
  params: PARAMS,
  rand: rand,
  random: rand,
  randInt: function(lo, hi) { return Math.floor(rand() * (hi - lo + 1)) + lo; },
  randBetween: function(lo, hi) { return lo + rand() * (hi - lo); },
  pick: function(arr) { return arr[Math.floor(rand() * arr.length)]; },
  chance: function(p) { return rand() < p; },
  param: function(id, fallback) {
    if (PARAMS && id in PARAMS) return PARAMS[id];
    return fallback;
  },
  features: function(traits) {
    try {
      window.parent.postMessage({ type: 'alea:ready', features: traits, seed: SEED_STRING }, '*');
    } catch(e) {}
    return traits;
  },
  ready: function() {
    try {
      window.parent.postMessage({ type: 'alea:ready', seed: SEED_STRING }, '*');
    } catch(e) {}
  }
};

// Auto-boot custom ALEA_MAIN if present
var booted = false;
var bootAleaMain = function() {
  if (booted) return;
  booted = true;
  var main = window.ALEA_MAIN;
  if (!main) return;
  try {
    if (typeof main.boot === "function") main.boot(window.$alea);
    if (typeof main.render === "function") main.render(window.$alea);
  } catch(e) {
    console.error("[alea] lifecycle error:", e);
  }
  if (typeof main.resize === "function") {
    window.addEventListener("resize", function() {
      main.resize(window.innerWidth, window.innerHeight);
    });
  }
};
if (document.readyState === "complete") {
  setTimeout(bootAleaMain, 10);
} else {
  window.addEventListener("load", bootAleaMain);
}
</script>
`;

    // If code already contains <head>, inject directly after <head>
    const headIndex = code.search(/<head[^>]*>/i);
    if (headIndex !== -1) {
        const match = code.match(/<head[^>]*>/i);
        if (match) {
            const insertPos = headIndex + match[0].length;
            return code.slice(0, insertPos) + harnessScript + code.slice(insertPos);
        }
    }

    // If code is full HTML without head, inject before <body> or at start
    const bodyIndex = code.search(/<body[^>]*>/i);
    if (bodyIndex !== -1) {
        return code.slice(0, bodyIndex) + "<head>" + harnessScript + "</head>" + code.slice(bodyIndex);
    }

    // Otherwise wrap in clean HTML boilerplate
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: #000;
  }
  canvas {
    display: block;
    width: 100% !important;
    height: 100% !important;
    object-fit: contain;
  }
</style>
${harnessScript}
</head>
<body>
${code.includes("<html") || code.includes("<body") ? code : `<script>\n${code}\n</script>`}
</body>
</html>`;
}
