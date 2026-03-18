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

const analyzeBtn = document.getElementById("analyze-btn");
const simBtn = document.getElementById("simulate-btn");
const simResetBtn = document.getElementById("simulate-reset-btn");
const simRunsEl = document.getElementById("sim-runs");

function isAuditMode() {
  return (location.pathname || "").includes("/pages/themes/audit");
}


if (btn) btn.addEventListener("click", () => generate());
if (themeSelectEl) themeSelectEl.addEventListener("change", () => { if (isAuditMode()) generate(true); });

if (analyzeBtn) analyzeBtn.addEventListener("click", async () => {
  await analyzeSelectedTheme();
});

if (simBtn) simBtn.addEventListener("click", async () => {
  const runs = Math.max(10, Math.min(20000, parseInt(simRunsEl?.value || "500", 10) || 500));
  await simulateSelectedTheme(runs);
});

if (simResetBtn) simResetBtn.addEventListener("click", () => {
  const mount = document.getElementById("theme-sim-results");
  if (mount) mount.innerHTML = "";
});
// ------------------------------------------------------------
// AUDIT: theme stats (device-local) + expected weight percentages
// ------------------------------------------------------------
const THEME_STATS_KEY = "hd2_theme_roll_stats_v1";

function loadThemeStats() {
  try { return JSON.parse(localStorage.getItem(THEME_STATS_KEY) || "{}") || {}; }
  catch { return {}; }
}
function saveThemeStats(stats) {
  try { localStorage.setItem(THEME_STATS_KEY, JSON.stringify(stats || {})); } catch {}
}
function bumpThemeStat(themeId, kind) {
  const stats = loadThemeStats();
  stats.total = (stats.total || 0) + 1;
  stats.by = stats.by || {};
  stats.by[themeId] = stats.by[themeId] || { total:0, random:0, forced:0 };
  stats.by[themeId].total++;
  if (kind === "forced") stats.by[themeId].forced++;
  else stats.by[themeId].random++;
  saveThemeStats(stats);
  return stats;
}

// Central tweak point: theme weights
// (If a theme id is missing here, it defaults to 1.0)
const THEME_WEIGHTS = {
  arc: 1.0,
  gas: 1.0,
  incendiary: 1.0,
  elemental: 1.0,
  expendable: 1.0,
  guided: 1.0,
  medic_pacifist: 0.6,
  support: 0.6,
  melee: 0.5,
  stealth: 0.6,
  malevelon_creek: 0.7,
};

function themeWeight(theme) {
  const id = theme?.id;
  const w = (id && Object.prototype.hasOwnProperty.call(THEME_WEIGHTS, id)) ? THEME_WEIGHTS[id] : 1.0;
  return Math.max(0, Number(w) || 0);
}

function computeThemeChanceTable() {
  const enabled = (THEMES || []).filter(t => themeWeight(t) > 0);
  const totalW = enabled.reduce((s,t) => s + themeWeight(t), 0) || 1;
  return enabled.map(t => ({
    id: t.id,
    label: t.label || t.id,
    weight: themeWeight(t),
    pct: (themeWeight(t)/totalW)*100
  })).sort((a,b) => b.pct - a.pct);
}

function renderThemeChanceStats() {
  if (!isAuditMode()) return;
  const mount = document.getElementById("theme-chance-stats");
  if (!mount) return;

  const rows = computeThemeChanceTable();
  mount.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <strong>Expected theme chance (weights only)</strong>
    </div>
    <div style="margin-top:6px; color: var(--muted);">Cooldown is not modeled in these percentages.</div>
    <table style="width:100%; margin-top:10px; border-collapse:collapse;">
      <thead>
        <tr>
          <th style="text-align:left; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.12);">Theme</th>
          <th style="text-align:right; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.12);">Weight</th>
          <th style="text-align:right; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.12);">%</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td style="padding:6px 0;">${r.label}</td>
            <td style="padding:6px 0; text-align:right;">${r.weight.toFixed(2)}</td>
            <td style="padding:6px 0; text-align:right;">${r.pct.toFixed(1)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderThemeRollStats(stats) {
  if (!isAuditMode()) return;
  const mount = document.getElementById("theme-roll-stats");
  if (!mount) return;

  const total = stats?.total || 0;
  const by = stats?.by || {};
  const rows = (THEMES || []).map(t => {
    const rec = by[t.id] || { total:0, random:0, forced:0 };
    const pct = total ? (rec.total/total)*100 : 0;
    return { label: t.label || t.id, pct, total: rec.total, random: rec.random, forced: rec.forced };
  }).sort((a,b) => b.total - a.total);

  mount.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <strong>Theme roll % (this device)</strong>
    </div>
    <div style="margin-top:6px; color: var(--muted);">Total rolls tracked: ${total}</div>
    <table style="width:100%; margin-top:10px; border-collapse:collapse;">
      <thead>
        <tr>
          <th style="text-align:left; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.12);">Theme</th>
          <th style="text-align:right; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.12);">%</th>
          <th style="text-align:right; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.12);">Total</th>
          <th style="text-align:right; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.12);">Rnd</th>
          <th style="text-align:right; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.12);">Forced</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td style="padding:6px 0;">${r.label}</td>
            <td style="padding:6px 0; text-align:right;">${r.pct.toFixed(1)}</td>
            <td style="padding:6px 0; text-align:right;">${r.total}</td>
            <td style="padding:6px 0; text-align:right;">${r.random}</td>
            <td style="padding:6px 0; text-align:right;">${r.forced}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function weightedPickTheme(themes) {
  const items = (themes || []).filter(t => themeWeight(t) > 0);
  const totalW = items.reduce((s,t)=>s+themeWeight(t),0);
  if (!items.length || totalW <= 0) return (themes && themes[0]) || null;
  let r = Math.random() * totalW;
  for (const t of items) {
    r -= themeWeight(t);
    if (r <= 0) return t;
  }
  return items[items.length-1];
}

function topN(freqMap, n=15) {
  const entries = Object.entries(freqMap || {});
  entries.sort((a,b)=>b[1]-a[1]);
  return entries.slice(0,n);
}

function renderSimResults(sim) {
  if (!isAuditMode()) return;
  const mount = document.getElementById("theme-sim-results");
  if (!mount) return;
  if (!sim) { mount.innerHTML=""; return; }

  const { themeLabel, runs, ok, fail, primary, secondary, throwable, stratagems } = sim;

  const mkTable = (title, entries, denom) => `
    <div style="margin-top:10px;"><strong>${title}</strong></div>
    <table style="width:100%; margin-top:6px; border-collapse:collapse;">
      <thead>
        <tr>
          <th style="text-align:left; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.12);">Item</th>
          <th style="text-align:right; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.12);">%</th>
          <th style="text-align:right; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.12);">Count</th>
        </tr>
      </thead>
      <tbody>
        ${entries.map(([label,count]) => `
          <tr>
            <td style="padding:6px 0;">${label}</td>
            <td style="padding:6px 0; text-align:right;">${denom ? ((count/denom)*100).toFixed(1) : "0.0"}</td>
            <td style="padding:6px 0; text-align:right;">${count}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  mount.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <strong>Theme simulation: ${themeLabel}</strong>
    </div>
    <div style="margin-top:6px; color: var(--muted);">Runs: ${runs} • Success: ${ok} • Fail: ${fail}</div>
    ${mkTable("Primary (top)", topN(primary, 12), ok)}
    ${mkTable("Secondary (top)", topN(secondary, 12), ok)}
    ${mkTable("Throwable (top)", topN(throwable, 12), ok)}
    ${mkTable("Stratagems (top)", topN(stratagems, 20), ok*4)}
  `;
}

async function analyzeSelectedTheme() {
  if (!isAuditMode()) return;
  renderThemeChanceStats();
  renderThemeRollStats(loadThemeStats());
  setStatus("Done.");
}

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

//Exclusion rules to ensure anything listed under "exclude:" is not accidentally included in a pool based on tags
function applyThemeExclusions(theme, slotKey, items) {
  const ex = theme.exclude || {};

  const idsKey =
    slotKey === "primary" ? "primaryIds" :
    slotKey === "secondary" ? "secondaryIds" :
    slotKey === "throwable" ? "throwableIds" :
    "stratagemIds";

  const tagsKey =
    slotKey === "primary" ? "primaryTagsAny" :
    slotKey === "secondary" ? "secondaryTagsAny" :
    slotKey === "throwable" ? "throwableTagsAny" :
    "stratagemTagsAny";

  const excludedIds = Array.isArray(ex[idsKey]) ? ex[idsKey] : [];
  const excludedTags = Array.isArray(ex[tagsKey]) ? ex[tagsKey] : [];

  if (!excludedIds.length && !excludedTags.length) return items;

  return items.filter(it => {
    if (excludedIds.includes(it.id)) return false;
    if (excludedTags.some(tag => hasTag(it, tag))) return false;
    return true;
  });
}

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

    // Split support caps:
    // - carried = non-expendable / "true" support weapons
    // - expendable = support weapons that also have the "expendable" tag
    maxCarriedSupportWeapons: 1,
    maxExpendableSupportWeapons: 1,

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

  // Exclude always wins, even if the item matches required IDs/tags.
  items = applyThemeExclusions(theme, slotKey, items);

  if (!slotCfg.enabled) return { filtered: items, themed: false };
  if (!chancePass(slotCfg.chance)) return { filtered: items, themed: false };

  const pools = theme.requiredPools || {};
  const idsKey =
    slotKey === "primary" ? "primaryIds" :
    slotKey === "secondary" ? "secondaryIds" :
    slotKey === "throwable" ? "throwableIds" :
    "stratagemIds";

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

  const reqIds = Array.isArray(pools[idsKey]) ? pools[idsKey] : [];

  const anyObj = pools[anyKey];
  const reqTagsAny =
    (anyObj && Array.isArray(anyObj.tagsAny) ? anyObj.tagsAny : null) ||
    (Array.isArray(pools[tagsArrKey]) ? pools[tagsArrKey] : []);

  if ((reqIds && reqIds.length) || (reqTagsAny && reqTagsAny.length)) {
    const reqSet = new Set();
    const req = [];

    for (const it of items) {
      const byId = reqIds.length ? reqIds.includes(it.id) : false;
      const byTag = reqTagsAny.length ? reqTagsAny.some(t => hasTag(it, t)) : false;

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

function renderStrats(listEl, strats) {
  listEl.innerHTML = "";

  const sorted = [...(strats || [])].sort((a, b) => {
    const aIsSupport = hasTag(a, "support_weapon") ? 1 : 0;
    const bIsSupport = hasTag(b, "support_weapon") ? 1 : 0;

    // support_weapon first
    if (aIsSupport !== bIsSupport) return bIsSupport - aIsSupport;

    const topTypeRank = {
      Supply: 0,
      Defensive: 1,
      Offensive: 2
    };

    const aRank = topTypeRank[a?.topType] ?? 99;
    const bRank = topTypeRank[b?.topType] ?? 99;

    // then Supply > Defensive > Offensive
    if (aRank !== bRank) return aRank - bRank;

    // fallback alphabetical
    return (a?.name || "").localeCompare(b?.name || "");
  });

  for (const s of sorted) {
    const li = document.createElement("li");

    const img = document.createElement("img");
    img.className = "item-icon";
    setIcon(img, s?.icon || "", s?.name || "Stratagem icon");

    const name = document.createElement("span");
    name.className = "item-name";
    name.textContent = s?.name || "—";

    li.appendChild(img);
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

  const carriedSupportCount = picked.filter(
    p => hasTag(p, "support_weapon") && !hasTag(p, "expendable")
  ).length;

  const expendableSupportCount = picked.filter(
    p => hasTag(p, "support_weapon") && hasTag(p, "expendable")
  ).length;

  const isSupport = hasTag(cand, "support_weapon");
  const isExpendableSupport = isSupport && hasTag(cand, "expendable");
  const isCarriedSupport = isSupport && !hasTag(cand, "expendable");

  if (isCarriedSupport && carriedSupportCount >= rules.maxCarriedSupportWeapons) return false;
  if (isExpendableSupport && expendableSupportCount >= rules.maxExpendableSupportWeapons) return false;

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
    const theme = findThemeByIdOrLabel(forced) || weightedPickTheme(THEMES);
    const isSelected = !!findThemeByIdOrLabel(forced);
    pickedEl.textContent = `Theme: ${theme.label}${isSelected ? " (selected)" : ""}`;

    const rules = getRules(theme);
    const maxRetries = (theme.fillPolicy && theme.fillPolicy.maxRetries) || 200;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Stratagems first
      const stratPool = pools.strat.slice();
      const pickedStrats = [];

      // Guaranteed support weapon
      let supportCandidates = applyThemeExclusions(
            theme,
            "stratagems",
            stratPool.filter(s => hasTag(s, "support_weapon"))
      );
      if (!rules.ALLOW_EXPENDABLE_AS_GUARANTEED_SUPPORT) {
        supportCandidates = supportCandidates.filter(s => !hasTag(s, "expendable"));
      }
      const themedSupport = applySlotThemeFilter(theme, "stratagems", supportCandidates);
      supportCandidates = themedSupport.filtered.filter(s => canAddStrat(rules, pickedStrats, s));

      const guaranteed = supportCandidates.length
        ? weightedPick(supportCandidates, (it) => macroWeightFor(theme, "stratagem", it))
        : null;

      if (guaranteed) pickedStrats.push(guaranteed);

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
      renderStrats(stratListEl, pickedStrats);
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


async function buildLoadoutForTheme(theme, pools) {
  const rules = getRules(theme);
  const maxRetries = (theme.fillPolicy && theme.fillPolicy.maxRetries) || 200;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const stratPool = pools.strat.slice();
    const pickedStrats = [];

    if (rules.requireSupportWeapon !== false) {
      let supportCandidates = applyThemeExclusions(
            theme,
            "stratagems",
            stratPool.filter(s => hasTag(s, "support_weapon"))
      );
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
    if (rules.requireSupportWeapon !== false) {
      if (!pickedStrats.some(s => hasTag(s, "support_weapon"))) continue;
    }

    let primCandidates = pools.prim.slice();
    primCandidates = enforceOneHandedIfRequired(rules, pickedStrats, primCandidates);

    const primaryPool = applySlotThemeFilter(theme, "primary", primCandidates).filtered;
    const secondaryPool = applySlotThemeFilter(theme, "secondary", pools.sec).filtered;
    const throwablePool = applySlotThemeFilter(theme, "throwable", pools.thr).filtered;

    const primary = weightedPick(primaryPool, (it) => macroWeightFor(theme, "primary", it));
    const secondary = weightedPick(secondaryPool, (it) => macroWeightFor(theme, "secondary", it));
    const throwable = weightedPick(throwablePool, (it) => macroWeightFor(theme, "throwable", it));

    if (!primary || !secondary || !throwable) continue;
    return { primary, secondary, throwable, stratagems: pickedStrats };
  }
  return null;
}

async function simulateSelectedTheme(runs = 500) {
  if (!isAuditMode()) return;

  const forcedId = themeSelectEl && themeSelectEl.value ? themeSelectEl.value : "";
  const theme = forcedId ? findThemeByIdOrLabel(forcedId) : null;
  if (!theme) { setStatus("Select a theme to simulate."); return; }

  setStatus(`Simulating ${theme.label}… (${runs})`);

  const pools = await loadAllPools();

  const freqPrimary = {};
  const freqSecondary = {};
  const freqThrowable = {};
  const freqStrats = {};
  let ok = 0, fail = 0;

  for (let i = 0; i < runs; i++) {
    const out = await buildLoadoutForTheme(theme, pools);
    if (!out) { fail++; continue; }
    ok++;

    const p = out.primary?.label || out.primary?.name || out.primary?.id;
    const s = out.secondary?.label || out.secondary?.name || out.secondary?.id;
    const t = out.throwable?.label || out.throwable?.name || out.throwable?.id;

    freqPrimary[p] = (freqPrimary[p] || 0) + 1;
    freqSecondary[s] = (freqSecondary[s] || 0) + 1;
    freqThrowable[t] = (freqThrowable[t] || 0) + 1;

    for (const st of out.stratagems || []) {
      const lbl = st.label || st.name || st.id;
      freqStrats[lbl] = (freqStrats[lbl] || 0) + 1;
    }
  }

  renderSimResults({
    themeLabel: theme.label,
    runs,
    ok,
    fail,
    primary: freqPrimary,
    secondary: freqSecondary,
    throwable: freqThrowable,
    stratagems: freqStrats
  });

  setStatus(`Sim complete: ${theme.label} — ${ok}/${runs} succeeded, ${fail} failed.`);
}
