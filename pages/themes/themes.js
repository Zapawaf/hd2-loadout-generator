import { THEMES } from "./themes.list.js";

/**
 * Themed Randomizer Engine (isolated from main Randomizer logic)
 *
 * IMPORTANT: We auto-discover JSON file paths by *scraping* the working Randomizer's JS file
 * for strings like "/data/...json". This avoids hardcoding paths that might differ in your repo.
 *
 * We do NOT import or execute Randomizer code; we only fetch it as text and extract paths.
 */

const btn = document.getElementById("generate-btn");
const statusEl = document.getElementById("status");
const pickedEl = document.getElementById("theme-picked");
const themeSelectEl = document.getElementById("theme-select");

const primaryEl = document.getElementById("equip-primary");
const secondaryEl = document.getElementById("equip-secondary");
const throwableEl = document.getElementById("equip-throwable");
const stratListEl = document.getElementById("strat-list");

btn.addEventListener("click", () => generate());
if (themeSelectEl) themeSelectEl.addEventListener("change", () => generate());

// ------------------------------------------------------------
// Auto-discover DATA_PATHS from your working Randomizer
// ------------------------------------------------------------
const RANDOMIZER_JS_CANDIDATES = [
  "/pages/randomizer/app.js",
  "/pages/randomizer/randomizer.js",
  "/pages/randomizer/main.js",
  "/pages/randomizer/index.js",
  "/pages/randomizer/script.js",
];

async function fetchTextFirstOk(urls) {
  for (const u of urls) {
    try {
      const res = await fetch(u, { cache: "no-store" });
      if (!res.ok) continue;
      return await res.text();
    } catch {
      // ignore and try next
    }
  }
  return null;
}

function extractJsonPathsFromText(txt) {
  const out = new Set();
  const re = /["'](\/data\/[^"']+?\.json)["']/g;
  let m;
  while ((m = re.exec(txt)) !== null) out.add(m[1]);
  return Array.from(out);
}

function categorize(paths) {
  const prim = [];
  const sec = [];
  const thr = [];
  const strat = [];
  for (const p of paths) {
    if (p.includes("/data/Primary/")) prim.push(p);
    else if (p.includes("/data/Secondary/")) sec.push(p);
    else if (p.includes("/data/Throwable/")) thr.push(p);
    else if (p.includes("/data/Stratagems/")) strat.push(p);
  }
  return { prim, sec, thr, strat };
}

// Cache loaded JSON
const cache = new Map();
async function loadJson(path) {
  if (cache.has(path)) return cache.get(path);
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  const data = await res.json();
  cache.set(path, data);
  return data;
}

async function discoverDataPaths() {
  const txt = await fetchTextFirstOk(RANDOMIZER_JS_CANDIDATES);
  if (!txt) {
    throw new Error(
      "Could not auto-discover data paths. Could not fetch Randomizer JS from /pages/randomizer/ (tried common filenames)."
    );
  }

  const all = extractJsonPathsFromText(txt);
  const c = categorize(all);

  if (!c.prim.length || !c.sec.length || !c.thr.length || !c.strat.length) {
    // If the Randomizer JS doesn't include all paths, it might load them elsewhere.
    // We can still proceed, but warn.
    console.warn("Partial path discovery:", c);
  }

  return c;
}

// ------------------------------------------------------------
// Load + annotate
// ------------------------------------------------------------
function annotateFromPath(path, it, kind) {
  const parts = path.split("/").filter(Boolean); // data, Primary, Subcat, file.json...
  if (kind === "primary") {
    return { ...it, kind, subcategory: parts[2] || "Unknown" };
  }
  if (kind === "secondary") {
    return { ...it, kind, subcategory: parts[2] || "Unknown" };
  }
  if (kind === "throwable") {
    return { ...it, kind, subcategory: parts[2] || "Unknown" };
  }
  // stratagem
  return { ...it, kind, topType: parts[2] || "Unknown", subcategory: parts[3] || "Unknown" };
}

async function loadAndAnnotate(paths, kind) {
  const out = [];
  for (const p of paths) {
    const arr = await loadJson(p);
    for (const it of arr) out.push(annotateFromPath(p, it, kind));
  }
  return out;
}

async function loadAllPools() {
  setStatus("Discovering data paths from Randomizer...");
  const discovered = await discoverDataPaths();

  setStatus("Loading data...");
  const [prim, sec, thr, strat] = await Promise.all([
    loadAndAnnotate(discovered.prim, "primary"),
    loadAndAnnotate(discovered.sec, "secondary"),
    loadAndAnnotate(discovered.thr, "throwable"),
    loadAndAnnotate(discovered.strat, "stratagem"),
  ]);

  return { prim, sec, thr, strat };
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hasTag(it, tag) {
  return Array.isArray(it.tags) && it.tags.includes(tag);
}

function matchesLadderStep(it, step) {
  if (!step) return true;
  if (step.ids && step.ids.length) return step.ids.includes(it.id);
  if (step.tagsAny && step.tagsAny.length) return step.tagsAny.some(t => hasTag(it, t));
  if (step.tagsAll && step.tagsAll.length) return step.tagsAll.every(t => hasTag(it, t));
  return true;
}

function macroWeightFor(theme, kind, it) {
  const m = theme.macro || {};
  if (kind === "primary") return (m.primarySubcategory && m.primarySubcategory[it.subcategory]) ?? 1.0;
  if (kind === "secondary") return (m.secondarySubcategory && m.secondarySubcategory[it.subcategory]) ?? 1.0;
  if (kind === "throwable") return (m.throwableSubcategory && m.throwableSubcategory[it.subcategory]) ?? 1.0;

  if (kind === "stratagem") {
    const topW = (m.stratagemTop && m.stratagemTop[it.topType]) ?? 1.0;
    let subW = 1.0;
    if (it.topType === "Offensive") subW = (m.offensiveSub && m.offensiveSub[it.subcategory]) ?? 1.0;
    if (it.topType === "Defensive") subW = (m.defensiveSub && m.defensiveSub[it.subcategory]) ?? 1.0;
    if (it.topType === "Supply") subW = (m.supplySub && m.supplySub[it.subcategory]) ?? 1.0;
    return topW * subW;
  }
  return 1.0;
}

function weightedPick(arr, weightFn) {
  if (!arr.length) return null;
  let total = 0;
  const weights = arr.map(it => {
    const w = Math.max(0, Number(weightFn(it) ?? 1));
    total += w;
    return w;
  });
  if (total <= 0) return pickRandom(arr);

  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

function chancePass(pct) {
  const p = Math.max(0, Math.min(100, Number(pct ?? 100)));
  return Math.random() * 100 < p;
}

function isExosuit(it) {
  const n = (it.name || "").toLowerCase();
  return it.id?.startsWith("exo_") || n.includes("exosuit");
}

function getRules(theme) {
  return {
    useEvenStratagemTop: true,
    maxSupportWeapons: 1,
    maxBackpackSlot: 1,
    maxSupplyStratagems: 2,
    preventDoubleExosuit: true,
    soloSiloCannotBeOnlySupport: true,
    enforceOneHandedIfRequired: true,
    ALLOW_EXPENDABLE_AS_GUARANTEED_SUPPORT: false,
    ...(theme.rules || {}),
  };
}

function applySlotThemeFilter(theme, slotKey, items) {
  const slotCfg = (theme.slotTheme && theme.slotTheme[slotKey]) || { enabled: true, chance: 100 };
  if (!slotCfg.enabled) return { filtered: items, themed: false };
  if (!chancePass(slotCfg.chance)) return { filtered: items, themed: false };

  const pools = theme.requiredPools || {};
  const idsKey =
    slotKey === "primary" ? "primaryIds" :
    slotKey === "secondary" ? "secondaryIds" :
    slotKey === "throwable" ? "throwableIds" :
    "stratagemIds";
  const reqIds = pools[idsKey] || [];

// Also support tag-based required pools (merged with required IDs).
// Forms supported in theme.requiredPools:
// - <slot>Any: { tagsAny: ["tag1","tag2"] }
// - <slot>TagsAny: ["tag1","tag2"]  (optional legacy convenience)
const anyKey =
  slotKey === "primary" ? "primaryAny" :
  slotKey === "secondary" ? "secondaryAny" :
  slotKey === "throwable" ? "throwableAny" :
  "stratagemAny";

const tagsArrKey =
  slotKey === "primary" ? "primaryTagsAny" :
  slotKey === "secondary" ? "secondaryTagsAny" :
  slotKey === "throwable" ? "throwableTagsAny" :
  "stratagemTagsAny";

const anyObj = pools[anyKey];
const reqTagsAny = (anyObj && Array.isArray(anyObj.tagsAny) ? anyObj.tagsAny : null) ||
                   (Array.isArray(pools[tagsArrKey]) ? pools[tagsArrKey] : []);

if ((reqIds && reqIds.length) || (reqTagsAny && reqTagsAny.length)) {
  const reqSet = new Set();
  const req = [];

  for (const it of items) {
    const byId = reqIds && reqIds.length ? reqIds.includes(it.id) : false;
    const byTag = reqTagsAny && reqTagsAny.length ? reqTagsAny.some(t => hasTag(it, t)) : false;
    if (byId || byTag) {
      if (!reqSet.has(it.id)) {
        reqSet.add(it.id);
        req.push(it);
      }
    }
  }

  if (req.length) return { filtered: req, themed: true };
}


  const steps = [theme.forcedFirstPick, theme.forcedSecondPick, theme.forcedThirdPick].filter(Boolean);
  for (const step of steps) {
    const sub = items.filter(it => matchesLadderStep(it, step));
    if (sub.length) return { filtered: sub, themed: true };
  }

  return { filtered: items, themed: false };
}

function enforceOneHandedIfRequired(rules, strats, primCandidates) {
  if (!rules.enforceOneHandedIfRequired) return primCandidates;
  const needs = strats.some(s => hasTag(s, "requires_one_handed_primary"));
  if (!needs) return primCandidates;
  return primCandidates.filter(p => hasTag(p, "one_handed"));
}

// ------------------------------------------------------------
// Rendering (match Randomizer markup/classes so Randomizer CSS applies)
// ------------------------------------------------------------

// Prevent broken-image glyphs: hide until loaded, show on success.
function setIcon(imgEl, iconPath, altText) {
  imgEl.style.display = "none";
  imgEl.alt = altText || "icon";
  const src = iconPath ? (iconPath.startsWith("/") ? iconPath : ("/" + iconPath)) : "";
  if (!src) return;

  imgEl.onload = () => { imgEl.style.display = ""; };
  imgEl.onerror = () => { imgEl.style.display = "none"; };

  imgEl.src = src;
}

function renderItem(container, label, item) {
  container.innerHTML = "";

  const card = document.createElement("div");
  card.className = "slot-card";

  const title = document.createElement("strong");
  title.textContent = label;
  card.appendChild(title);

  const row = document.createElement("div");
  row.className = "item-row";

  const img = document.createElement("img");
  img.className = "item-icon item-icon-large";
  setIcon(img, item?.icon || "", item?.name || `${label} icon`);

  const name = document.createElement("div");
  name.className = "item-name";
  name.textContent = item?.name || "—";

  row.appendChild(img);
  row.appendChild(name);
  card.appendChild(row);

  container.appendChild(card);
}


function stratDisplayOrderKey(s) {
  // Support weapon first
  if (hasTag(s, "support_weapon")) return 0;

  const top = (s.topType || "").toLowerCase();

  if (top === "supply") return 1;
  if (top === "defensive") return 2;
  if (top === "offensive") return 3;

  return 9; // unknowns last
}


function sortStratsForDisplay(strats) {
  return strats.slice().sort((a, b) => {
    const ka = stratDisplayOrderKey(a);
    const kb = stratDisplayOrderKey(b);

    if (ka !== kb) return ka - kb;

    const na = (a.name || a.id || "").toLowerCase();
    const nb = (b.name || b.id || "").toLowerCase();
    return na.localeCompare(nb);
  });
}


function renderStrats(listEl, strats) {
  listEl.innerHTML = "";

  for (const s of (strats || [])) {
    const li = document.createElement("li");
    li.className = "stratagem-item";

    const iconWrap = document.createElement("div");
    iconWrap.className = "stratagem-icon-wrap";

    const img = document.createElement("img");
    img.className = "item-icon";
    setIcon(img, s?.icon || "", s?.name || "Stratagem icon");

    iconWrap.appendChild(img);

    const name = document.createElement("div");
    name.className = "stratagem-name";
    name.textContent = s?.name || "—";

    li.appendChild(iconWrap);
    li.appendChild(name);
    listEl.appendChild(li);
  }
}

// ------------------------------------------------------------
// Stratagem constraints
// ------------------------------------------------------------
function canAddStrat(rules, picked, cand) {
  if (picked.some(p => p.id === cand.id)) return false;

  const backpackCount = picked.filter(p => hasTag(p, "uses_backpack_slot")).length;
  if (hasTag(cand, "uses_backpack_slot") && backpackCount >= rules.maxBackpackSlot) return false;

  const supportCount = picked.filter(p => hasTag(p, "support_weapon")).length;
  if (hasTag(cand, "support_weapon") && supportCount >= rules.maxSupportWeapons) return false;

  const supplyCount = picked.filter(p => p.topType === "Supply").length;
  if (cand.topType === "Supply" && supplyCount >= rules.maxSupplyStratagems) return false;

  if (rules.preventDoubleExosuit) {
    const exoCount = picked.filter(isExosuit).length;
    if (isExosuit(cand) && exoCount >= 1) return false;
  }

  return true;
}

function pickStratWithTheme(theme, rules, pool, picked) {
  const themed = applySlotThemeFilter(theme, "stratagems", pool);
  const candidates = themed.filtered.filter(c => canAddStrat(rules, picked, c));
  if (candidates.length) return weightedPick(candidates, (it) => macroWeightFor(theme, "stratagem", it));

  const fallback = pool.filter(c => canAddStrat(rules, picked, c));
  if (!fallback.length) return null;
  return weightedPick(fallback, (it) => macroWeightFor(theme, "stratagem", it));
}

// ------------------------------------------------------------
// Main generation
// ------------------------------------------------------------

function getUrlThemeId() {
  try {
    const u = new URL(window.location.href);
    return u.searchParams.get("theme");
  } catch {
    return null;
  }
}

function getSelectedThemeId() {
  if (!themeSelectEl) return null;
  const v = String(themeSelectEl.value || "");
  if (!v || v === "__random__") return null;
  return v;
}

function findThemeByIdOrLabel(idOrLabel) {
  if (!idOrLabel) return null;
  const key = String(idOrLabel).toLowerCase();
  return (
    THEMES.find(t => String(t.id || "").toLowerCase() === key) ||
    THEMES.find(t => String(t.label || "").toLowerCase() === key) ||
    null
  );
}

function initThemeSelect() {
  if (!themeSelectEl) return;

  // populate (keep the existing "Random Theme" option in HTML)
  for (const t of THEMES) {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.label;
    themeSelectEl.appendChild(opt);
  }

  // support deep-linking: ?theme=gas
  const urlTheme = getUrlThemeId();
  const resolved = findThemeByIdOrLabel(urlTheme);
  if (resolved) themeSelectEl.value = resolved.id;
}

async function generate() {
  try {
    const pools = await loadAllPools();

    // Theme selection: URL (?theme=...) or dropdown, otherwise random
    const forced = getSelectedThemeId() || getUrlThemeId();
    const theme = findThemeByIdOrLabel(forced) || pickRandom(THEMES);
    const isSelected = !!findThemeByIdOrLabel(forced);
    pickedEl.textContent = `Theme: ${theme.label}${isSelected ? " (selected)" : ""}`;

    const rules = getRules(theme);
    const maxRetries = (theme.fillPolicy && theme.fillPolicy.maxRetries) || 200;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Stratagems first
      const stratPool = pools.strat.slice();
      const pickedStrats = [];
      if (rules.requireSupportWeapon) {
      // Guaranteed support weapon
      let supportCandidates = stratPool.filter(s => hasTag(s, "support_weapon"));
      if (!rules.ALLOW_EXPENDABLE_AS_GUARANTEED_SUPPORT) {
        supportCandidates = supportCandidates.filter(s => !hasTag(s, "expendable"));
      }
      const themedSupport = applySlotThemeFilter(theme, "stratagems", supportCandidates);
      supportCandidates = themedSupport.filtered.filter(s => canAddStrat(rules, pickedStrats, s));

      const guaranteed = supportCandidates.length
        ? weightedPick(supportCandidates, (it) => macroWeightFor(theme, "stratagem", it))
        : null;

      if (guaranteed) pickedStrats.push(guaranteed);
      }

      while (pickedStrats.length < 4) {
        const next = pickStratWithTheme(theme, rules, stratPool, pickedStrats);
        if (!next) break;
        pickedStrats.push(next);
      }

      if (pickedStrats.length !== 4) continue;

      if (rules.soloSiloCannotBeOnlySupport) {
        const support = pickedStrats.filter(s => hasTag(s, "support_weapon"));
        if (support.length === 1 && support[0].id === "ms_11_solo_silo") continue;
      }

      if (rules.requireSupportWeapon && !pickedStrats.some(s => hasTag(s, "support_weapon"))) {
        continue;
      }

      // Equipment
      let primCandidates = pools.prim.slice();
      primCandidates = enforceOneHandedIfRequired(rules, pickedStrats, primCandidates);

      const primaryPool = applySlotThemeFilter(theme, "primary", primCandidates).filtered;
      const secondaryPool = applySlotThemeFilter(theme, "secondary", pools.sec).filtered;
      const throwablePool = applySlotThemeFilter(theme, "throwable", pools.thr).filtered;

      const primary = weightedPick(primaryPool, (it) => macroWeightFor(theme, "primary", it));
      const secondary = weightedPick(secondaryPool, (it) => macroWeightFor(theme, "secondary", it));
      const throwable = weightedPick(throwablePool, (it) => macroWeightFor(theme, "throwable", it));

      if (!primary || !secondary || !throwable) continue;

      setStatus(`Loadout generated (${theme.label}).`);

      renderItem(primaryEl, "Primary", primary);
      renderItem(secondaryEl, "Secondary", secondary);
      renderItem(throwableEl, "Throwable", throwable);
      const displayStrats = sortStratsForDisplay(pickedStrats);
      renderStrats(stratListEl, displayStrats);
      return;
    }

    throw new Error("Could not generate a valid themed loadout (rules too strict / not enough items in pool).");
  } catch (err) {
    console.error(err);
    setStatus(String(err?.message || err));
  }
}

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

// init theme dropdown (if present)
initThemeSelect();

// auto-run once
generate();
