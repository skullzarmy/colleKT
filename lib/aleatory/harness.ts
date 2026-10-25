/**
 * Canonical ALEATORY-001 / ALEATORY-002 Deterministic Renderer Harness
 *
 * Implements the deterministic PRNG construction matching canonical chain renders:
 * 1. xmur3(seed) string-to-seed hash (raw string, never parsed as int/hex)
 * 2. sfc32 128-bit PRNG with EXACTLY 0 warmup discard calls
 * 3. Intercepts Math.random = rand BEFORE any libraries (p5.js, three.js) or sketches parse
 * 4. Injects CSS reset (0 margin, overflow hidden, canvas block) and locks devicePixelRatio = 1
 * 5. Resolves all declared <meta name="alea:library" content="..."> dependencies in order
 * 6. Implements full $alea API surface (version: 2, seed, hash, params, rand, randInt, randBetween, pick, chance, param, features, ready)
 */

export function resolveLibraryUrl(libSpec: string): string {
    const trimmed = libSpec.trim();
    const [name, version] = trimmed.split("@");
    if (name === "p5") {
        return `https://cdnjs.cloudflare.com/ajax/libs/p5.js/${version || "1.5.0"}/p5.min.js`;
    }
    if (name === "three") {
        return `https://cdnjs.cloudflare.com/ajax/libs/three.js/${version || "r128"}/three.min.js`;
    }
    return `https://cdn.jsdelivr.net/npm/${trimmed}`;
}

export function buildAleatoryHarnessHtml(
    code: string,
    seed: string = "unseeded",
    params: Record<string, unknown> = {},
    options?: { freezeClock?: boolean }
): string {
    const safeSeed = String(seed || "unseeded").replace(/"/g, '\\"');
    const safeParams = JSON.stringify(params || {});
    const freezeClock = Boolean(options?.freezeClock);

    // Extract all declared <meta name="alea:library" content="..."> dependencies
    const libRegex = /<meta\s+name=["']alea:library["']\s+content=["']([^"']+)["'][^>]*>/gi;
    const libraries: string[] = [];
    let libMatch: RegExpExecArray | null;
    while ((libMatch = libRegex.exec(code)) !== null) {
        if (libMatch[1]) {
            libraries.push(resolveLibraryUrl(libMatch[1]));
        }
    }
    const libraryScripts = libraries
        .map((url) => `<script src="${url}"></script>`)
        .join("\n");

    const clockFreezeSnippet = freezeClock
        ? `
  var FIXED = 0;
  var RealDate = Date;
  Date = class extends RealDate {
    constructor() { if (arguments.length === 0) super(FIXED); else super(...arguments); }
    static now() { return FIXED; }
  };
  performance.now = function () { return 0; };
`
        : "";

    const harnessScript = `
(function () {
  "use strict";

  // Lock Device Pixel Ratio to 1 so high-DPI displays compute identical canvas coordinates
  try {
    Object.defineProperty(window, "devicePixelRatio", {
      get: function () { return 1; }
    });
  } catch(e) {}

  // 1. Canonical PRNG Construction (Zero-Warmup SFC32 with raw string seed)
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

  var SEED_STRING = "${safeSeed}";
  var s = xmur3(String(SEED_STRING));
  var rand = sfc32(s(), s(), s(), s());

  // 2. Intercept Math.random BEFORE libraries or sketches parse
  Math.random = rand;
${clockFreezeSnippet}
  // 3. Complete $alea Global API Surface
  var featureStore = {};
  var PARAMS = ${safeParams};

  window.$alea = {
    version: 2,
    seed: SEED_STRING,
    hash: SEED_STRING,
    params: PARAMS || {},
    random: rand,
    rand: rand,
    randInt: function (lo, hi) { return Math.floor(rand() * (hi - lo + 1)) + lo; },
    randBetween: function (lo, hi) { return lo + rand() * (hi - lo); },
    pick: function (arr) { return arr[Math.floor(rand() * arr.length)]; },
    chance: function (p) { return rand() < p; },
    param: function (name, fallback) { return (PARAMS && name in PARAMS) ? PARAMS[name] : fallback; },
    features: function (obj) {
      if (!obj) return featureStore;
      for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) featureStore[k] = obj[k];
      try {
        window.parent.postMessage({ type: "alea:ready", features: featureStore, seed: SEED_STRING }, "*");
      } catch (e) {}
      return featureStore;
    },
    ready: function () {
      document.documentElement.setAttribute("data-alea-ready", "1");
      try {
        window.parent.postMessage({ type: "alea:ready", features: featureStore, seed: SEED_STRING }, "*");
      } catch (e) {}
    }
  };

  // Support custom ALEA_MAIN lifecycle
  var booted = false;
  var bootAleaMain = function () {
    if (booted) return;
    booted = true;
    var main = window.ALEA_MAIN;
    if (!main) return;
    try {
      if (typeof main.boot === "function") main.boot(window.$alea);
      if (typeof main.render === "function") main.render(window.$alea);
    } catch (err) {
      console.error("[alea] lifecycle threw:", err);
    }
    if (typeof main.resize === "function") {
      window.addEventListener("resize", function () {
        main.resize(window.innerWidth, window.innerHeight);
      });
    }
  };
  if (document.readyState === "complete") {
    setTimeout(bootAleaMain, 10);
  } else {
    window.addEventListener("load", bootAleaMain);
  }
})();
`;

    const injected =
        `<meta charset="utf-8">\n` +
        `<meta name="viewport" content="width=device-width,initial-scale=1">\n` +
        `<style>\n` +
        `  html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}\n` +
        `  canvas{display:block}\n` +
        `  svg{display:block;width:100%;height:100%}\n` +
        `</style>\n` +
        `<script>${harnessScript}<\/script>\n` +
        (libraryScripts ? `${libraryScripts}\n` : "");

    // Inject into head or wrap document
    const headIndex = code.search(/<head[^>]*>/i);
    if (headIndex !== -1) {
        const match = code.match(/<head[^>]*>/i);
        if (match) {
            const insertPos = headIndex + match[0].length;
            return code.slice(0, insertPos) + "\n" + injected + code.slice(insertPos);
        }
    }

    const htmlIndex = code.search(/<html[^>]*>/i);
    if (htmlIndex !== -1) {
        const match = code.match(/<html[^>]*>/i);
        if (match) {
            const insertPos = htmlIndex + match[0].length;
            return code.slice(0, insertPos) + `\n<head>\n${injected}</head>` + code.slice(insertPos);
        }
    }

    return `<!DOCTYPE html>\n<html>\n<head>\n${injected}</head>\n<body>\n${code}\n</body>\n</html>`;
}
