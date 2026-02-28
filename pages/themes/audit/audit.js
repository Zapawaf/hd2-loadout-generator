import { THEMES } from "../themes.list.js";

/**
 * Themes Audit (standalone)
 *
 * Loads the same data pools Themes uses (by scraping /pages/randomizer/app.js for /data/*.json paths),
 * then shows candidate counts after applying theme required pools + ladder filtering + core constraints.
 *
 * Note: This does NOT modify Randomizer or Themes code; it’s a read-only analyzer.
 */

const STORAGE_KEY = "hd2_excluded_v1"; // matches /pages/owned/owned.js
const $ = (id) => document.getElementById(id);

function safeJsonParse(text, fallback) {
  try { return JSON.parse(text); } catch { return fallback; }
}

function loadExcludedSet() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const arr = safeJsonParse(raw || "[]", []);
  return new Set(Array.isArray(arr) ? arr : []);
}

async function fetchTextFirstOk(urls) {
  let lastErr = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return await res.text();
      lastErr = new Error(`HTTP ${res.status} for ${url}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("fetchTextFirstOk failed");
}

function extractJsonPathsFromText(text) {
  const re = /["'](\/data\/[\w\-\s\/]+\.json)["']/g;
  const out = new Set();
  let m;
  while ((m = re.exec(text))) out.add(m[1]);
  return Array.from(out);
}

function categorize(path) {
  const p = path.toLowerCase();
  if (p.includes("/data/primary/")) return "primary";
  if (p.includes("/data/secondary/")) return "secondary";
  if (p.includes("/data/throwable/") || p.includes("/data/grenade/")) return "throwable";
  if (p.includes("/data/stratagems/")) return "stratagem";
  return null;
}

async function loadJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path} (HTTP ${res.status})`);
  return await res.json();
}

async function discoverDataPaths() {
  const randomizerCandidates = [
    "/pages/randomizer/app.js",
    "/pages/randomizer/randomizer.js",
    "/pages/randomizer/main.js"
  ];
  const text = await fetchTextFirstOk(randomizerCandidates);
  const paths = extractJsonPathsFromText(text);
  const buckets = { primary: [], secondary: [], throwable: [], stratagem: [] };
  for (const p of paths) {
    const c = categorize(p);
    if (c) buckets[c].push(p);
  }
  // de-dupe
  for (const k of Object.keys(buckets)) buckets[k] = Array.from(new Set(buckets[k]));
  return buckets;
}

function annotateFromPath(item, jsonPath) {
  // Attach basic metadata used by the picker + audit display.
  // This mirrors the approach used in the Themes engine: infer slot + category from path segments.
  const parts = jsonPath.split("/").filter(Boolean);
  // Example: /data/Stratagems/Defensive/Emplacements/emplacements.json
  //          /data/Primary/Assault Rifle/assault.json
  const idx = parts.findIndex(p => p.toLowerCase() === "data");
  const slot = parts[idx + 1] || "";
  const top = parts[idx + 2] || "";
  const sub = parts[idx + 3] || "";

  if (slot.toLowerCase() === "stratagems") {
    item.topType = top;       // Defensive/Offensive/Supply
    item.subcategory = sub;   // Emplacements/Support/etc
  } else {
    item.subcategory = top;   // Assault Rifle / Pistol / Special etc
  }

  return item;
}

async function loadAndAnnotate(jsonPath, excluded) {
  const data = await loadJson(jsonPath);
  if (!Array.isArray(data)) return [];
  const out = [];
  for (const it of data) {
    if (!it || !it.id) continue;
    if (excluded.has(it.id)) continue; // exclude unowned
    out.push(annotateFromPath({ ...it }, jsonPath));
  }
  return out;
}

async function loadAllPools() {
  const excluded = loadExcludedSet();
  const buckets = await discoverDataPaths();

  const pools = { primary: [], secondary: [], throwable: [], stratagem: [] };

  for (const [key, paths] of Object.entries(buckets)) {
    for (const p of paths) {
      const items = await loadAndAnnotate(p, excluded);
      pools[key].push(...items);
    }
  }
  // de-dupe by id inside each pool
  for (const key of Object.keys(pools)) {
    const seen = new Set();
    pools[key] = pools[key].filter(it => (seen.has(it.id) ? false : (seen.add(it.id), true)));
  }
  return { pools, buckets, excludedCount: excluded.size };
}

function hasTag(item, tag) {
  return Array.isArray(item.tags) && item.tags.includes(tag);
}

// ---------------------------
// Required Pool Merge (IDs + Any rules)
// ---------------------------
function buildRequiredPool(theme, slotKey, items) {
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

  const reqIds = new Set(pools[idsKey] || []);
  const any = pools[anyKey] || {};

  const topSet = new Set(any.topType || []);
  const subSet = new Set(any.subcategory || []);
  const tagsAny = new Set(any.tagsAny || []);
  const tagsAll = new Set(any.tagsAll || []);

  const out = [];
  const seen = new Set();

  for (const it of items) {
    const byId = reqIds.size && reqIds.has(it.id);

    const byTop = topSet.size && topSet.has(it.topType);
    const bySub = subSet.size && subSet.has(it.subcategory);

    const byTagsAny = tagsAny.size && Array.isArray(it.tags) && it.tags.some(t => tagsAny.has(t));
    const byTagsAll = tagsAll.size && Array.isArray(it.tags) && Array.from(tagsAll).every(t => it.tags.includes(t));

    const matchesAny = byTop || bySub || byTagsAny || byTagsAll;

    if (byId || matchesAny) {
      if (!seen.has(it.id)) {
        seen.add(it.id);
        out.push(it);
      }
    }
  }
  return out;
}

// ---------------------------
// Ladder matching (copied conceptually from Themes engine)
// ---------------------------
function matchesLadderStep(item, step) {
  // step can be:
  // - { tagsAny: [...] }
  // - { tagsAll: [...] }
  // - { subcategoryAny: [...] }
  // - { topTypeAny: [...] }  (stratagems)
  if (!step) return false;

  if (Array.isArray(step.tagsAny) && step.tagsAny.length) {
    return (item.tags || []).some(t => step.tagsAny.includes(t));
  }
  if (Array.isArray(step.tagsAll) && step.tagsAll.length) {
    return step.tagsAll.every(t => hasTag(item, t));
  }
  if (Array.isArray(step.subcategoryAny) && step.subcategoryAny.length) {
    return step.subcategoryAny.includes(item.subcategory);
  }
  if (Array.isArray(step.topTypeAny) && step.topTypeAny.length) {
    return step.topTypeAny.includes(item.topType);
  }
  return false;
}

function getRules(theme) {
  return theme.rules || {};
}

function applySlotThemeFilter(theme, slotKey, items) {
  // 1) merged required pool (IDs + Any)
  const required = buildRequiredPool(theme, slotKey, items);
  if (required.length) return { filtered: required, reason: "requiredPools (merged)" };

  // 2) forced picks (forcedFirstPick/Second/Third) — this snapshot uses these heavily
  const forcedSteps = [theme.forcedFirstPick, theme.forcedSecondPick, theme.forcedThirdPick].filter(Boolean);
  for (let i = 0; i < forcedSteps.length; i++) {
    const step = forcedSteps[i];
    const match = items.filter(it => matchesLadderStep(it, step));
    if (match.length) return { filtered: match, reason: `forced pick ${i + 1}` };
  }

  // 3) ladder (if present)
  const ladderKey =
    slotKey === "primary" ? "primaryLadder" :
    slotKey === "secondary" ? "secondaryLadder" :
    slotKey === "throwable" ? "throwableLadder" :
    "stratagemLadder";

  const ladder = (theme.ladder && theme.ladder[ladderKey]) || [];
  for (let i = 0; i < ladder.length; i++) {
    const step = ladder[i];
    const match = items.filter(it => matchesLadderStep(it, step));
    if (match.length) return { filtered: match, reason: `ladder step ${i + 1}` };
  }

  // 4) fallback
  return { filtered: items, reason: "fallback (full pool)" };
}

// ---------------------------
// Audit output
// ---------------------------
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const ch of children) node.appendChild(ch);
  return node;
}

function kvRow(k, v) {
  return [el("div", { html: k }), el("div", { html: v })];
}

function summarizeStratPool(items) {
  const total = items.length;
  const support = items.filter(it => hasTag(it, "support_weapon")).length;
  const backpack = items.filter(it => hasTag(it, "uses_backpack_slot")).length;
  const oneHand = items.filter(it => hasTag(it, "requires_one_handed_primary")).length;
  const defensive = items.filter(it => (it.topType || "") === "Defensive").length;
  const offensive = items.filter(it => (it.topType || "") === "Offensive").length;
  const supply = items.filter(it => (it.topType || "") === "Supply").length;
  return { total, support, backpack, oneHand, defensive, offensive, supply };
}

async function runAudit(state) {
  const themeId = $("themeSelect").value;
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  if (!theme) throw new Error("No themes found. Check themes.list.js exports.");

  const { pools } = state;

  const primary = applySlotThemeFilter(theme, "primary", pools.primary);
  const secondary = applySlotThemeFilter(theme, "secondary", pools.secondary);
  const throwable = applySlotThemeFilter(theme, "throwable", pools.throwable);
  const strat = applySlotThemeFilter(theme, "stratagem", pools.stratagem);

  const stratSum = summarizeStratPool(strat.filtered);

  const out = $("out");
  out.innerHTML = "";

  // Header
  out.appendChild(el("div", { class: "audit-card" }, [
    el("div", { class: "mono small muted", html: `Theme ID: <code>${theme.id}</code>` }),
    el("div", { class: "mono", html: `Theme Label: <code>${theme.label || "(missing label)"}</code>` }),
  ]));

  // Pool counts
  const grid = el("div", { class: "audit-grid" });

  const equipCard = el("div", { class: "audit-card" });
  equipCard.appendChild(el("div", { class: "group-title", html: "Equipment Pools" }));
  const equipKV = el("div", { class: "audit-kv" });
  kvRow("Primary candidates", `<span class="good mono">${primary.filtered.length}</span> <span class="muted small">(${primary.reason})</span>`).forEach(n => equipKV.appendChild(n));
  kvRow("Secondary candidates", `<span class="good mono">${secondary.filtered.length}</span> <span class="muted small">(${secondary.reason})</span>`).forEach(n => equipKV.appendChild(n));
  kvRow("Throwable candidates", `<span class="good mono">${throwable.filtered.length}</span> <span class="muted small">(${throwable.reason})</span>`).forEach(n => equipKV.appendChild(n));
  equipCard.appendChild(equipKV);

  const stratCard = el("div", { class: "audit-card" });
  stratCard.appendChild(el("div", { class: "group-title", html: "Stratagem Pool Summary" }));
  const stratKV = el("div", { class: "audit-kv" });
  kvRow("Total candidates", `<span class="good mono">${stratSum.total}</span> <span class="muted small">(${strat.reason})</span>`).forEach(n => stratKV.appendChild(n));
  kvRow("support_weapon", `<span class="mono">${stratSum.support}</span>`).forEach(n => stratKV.appendChild(n));
  kvRow("uses_backpack_slot", `<span class="mono">${stratSum.backpack}</span>`).forEach(n => stratKV.appendChild(n));
  kvRow("requires_one_handed_primary", `<span class="mono">${stratSum.oneHand}</span>`).forEach(n => stratKV.appendChild(n));
  kvRow("TopType Defensive / Offensive / Supply", `<span class="mono">${stratSum.defensive}</span> / <span class="mono">${stratSum.offensive}</span> / <span class="mono">${stratSum.supply}</span>`).forEach(n => stratKV.appendChild(n));
  stratCard.appendChild(stratKV);

  grid.appendChild(equipCard);
  grid.appendChild(stratCard);
  out.appendChild(grid);

  // Show requiredPools config (if any)
  const req = theme.requiredPools || {};
  const reqCard = el("div", { class: "audit-card" });
  reqCard.appendChild(el("div", { class: "group-title", html: "requiredPools (raw config)" }));
  reqCard.appendChild(el("pre", { class: "mono small", html: escapeHtml(JSON.stringify(req, null, 2)) }));
  out.appendChild(reqCard);

  // Basic warnings
  const warnings = [];
  if (getRules(theme).requireSupportWeapon && stratSum.support === 0) warnings.push("Theme requires a support weapon, but stratagem pool has 0 support_weapon candidates.");
  if (primary.filtered.length === 0) warnings.push("Primary pool is empty after theme filters.");
  if (secondary.filtered.length === 0) warnings.push("Secondary pool is empty after theme filters.");
  if (throwable.filtered.length === 0) warnings.push("Throwable pool is empty after theme filters.");
  if (stratSum.total === 0) warnings.push("Stratagem pool is empty after theme filters.");

  if (warnings.length) {
    const w = el("div", { class: "audit-card" });
    w.appendChild(el("div", { class: "group-title warn", html: "Warnings" }));
    const ul = el("ul", { class: "small" });
    warnings.forEach(t => ul.appendChild(el("li", { class: "warn", html: escapeHtml(t) })));
    w.appendChild(ul);
    out.appendChild(w);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
}

async function init() {
  // populate theme dropdown
  const sel = $("themeSelect");
  sel.innerHTML = "";
  for (const t of THEMES) {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.label || t.id;
    sel.appendChild(opt);
  }

  $("status").textContent = "Loading pools…";
  const state = await loadAllPools();
  $("status").textContent = `Pools loaded. (Excluded IDs: ${state.excludedCount})`;

  $("analyzeBtn").addEventListener("click", async () => {
    $("status").textContent = "Analyzing…";
    try {
      await runAudit(state);
      $("status").textContent = "Done.";
    } catch (e) {
      console.error(e);
      $("status").textContent = "Audit failed (see console).";
      const out = $("out");
      out.innerHTML = `<div class="audit-card bad"><strong>Audit error:</strong> <span class="mono">${escapeHtml(e?.message || String(e))}</span></div>`;
    }
  });

  // auto-run once
  $("analyzeBtn").click();
}

init();
