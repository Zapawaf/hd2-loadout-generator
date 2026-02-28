// app.js — HD2 Loadout Generator (POC randomizer + rules)
//
// ============================================================
// SECTION 0 — RULES SUMMARY (easy to read later)
// ============================================================
//
// Stratagem rules:
// 1) 4 stratagems, no duplicates (enforced by removing picks from pool)
// 2) Max 1 stratagem that uses backpack slot (tag: "uses_backpack_slot")
// 3) Max 1 support weapon stratagem (tag: "support_weapon")
// 4) At least 1 support weapon stratagem among the 4 (support_weapon implies damage)
// 5) If any chosen stratagem requires one-handed primary (tag: "requires_one_handed_primary"),
//    primary must have tag: "one_handed"
//
// UI expectation (from index.html):
// - #status
// - #generate button
// - #primaryName, #secondaryName, #grenadeName
// - #stratagemList (ul)

// ============================================================
// SECTION 1 — CONFIG (tweak knobs live here)
// ============================================================

import { getProfile } from "./profiles/index.js";

const CONFIG = {
    // Stratagem slot rules
    STRATAGEM_COUNT: 4,
    MAX_BACKPACK_STRATS: 1,         // "uses_backpack_slot"
    MAX_CARRIED_SUPPORT_WEAPON_STRATS: 1,     // support_weapon && !expendable
    MAX_EXPENDABLE_SUPPORT_WEAPON_STRATS: 2,  // support_weapon && expendable
    MAX_SUPPLY_STRATS: 2,           // prevents 3 - 4 blue stratagem loadouts
    EAGLE_REARM_SEC: 108,          // assumed maxed ship modules

    // Validity requirements
    REQUIRE_AT_LEAST_ONE_SUPPORT_WEAPON: true, // support_weapon => damage-capable

    // Retry attempts (brute force generation)
    MAX_GENERATION_ATTEMPTS: 250,

    // Edge case:
    // MS-11 Solo Silo is NOT allowed to be the only support weapon in the loadout
    SOLO_SILO_ID: "ms_11_solo_silo",
    DISALLOW_SOLO_SILO_AS_ONLY_SUPPORT_WEAPON: true
};

// ============================================================
// SECTION 2 — STATE
// ============================================================

const state = {
    primaries: [],
    secondaries: [],
    grenades: [],
    stratagems: []
};

// ============================================================
// SECTION 3 — DOM HELPERS
// ============================================================

function $(id) {
    return document.getElementById(id);
}

// ============================================================
// SECTION 4 — GENERIC HELPERS
// ============================================================

function hasTag(item, tag) {
    return Array.isArray(item?.tags) && item.tags.includes(tag);
}

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

// ============================================================
// WEIGHTING HELPERS (profiles)
// ============================================================

function getMacroMultiplier(item, profile) {
    // Default neutral
    let m = 1.0;

    const macro = profile?.macro || {};

    if (item?._kind === "primary") {
        m *= (macro.primarySubcategory?.[item._equipmentSub] ?? 1.0);
    } else if (item?._kind === "secondary") {
        m *= (macro.secondarySubcategory?.[item._equipmentSub] ?? 1.0);
    } else if (item?._kind === "throwable") {
        m *= (macro.throwableSubcategory?.[item._equipmentSub] ?? 1.0);
    } else if (item?._kind === "stratagem") {
        m *= (macro.stratagemTop?.[item._stratTop] ?? 1.0);

        if (item._stratTop === "Offensive") {
            m *= (macro.offensiveSub?.[item._stratSub] ?? 1.0);
        } else if (item._stratTop === "Defensive") {
            m *= (macro.defensiveSub?.[item._stratSub] ?? 1.0);
        } else if (item._stratTop === "Supply") {
            m *= (macro.supplySub?.[item._stratSub] ?? 1.0);
        }
    }

    return Number.isFinite(m) ? m : 1.0;
}

function getMicroMultiplier(item, profile) {
    let m = 1.0;

    const micro = profile?.micro || {};

    // Backward-compatible global weights
    const globalTagWeights = micro.tag || {}; // { tagName: weight }
    const globalIdWeights = micro.id || {};   // { itemId: weight }

    // New scoped weights
    const pools = micro.pools || {};

    // Map item._kind to pool keys used in micro.pools
    const kind = item?._kind;
    const poolKey =
        kind === "primary" ? "primaries" :
        kind === "secondary" ? "secondaries" :
        kind === "throwable" ? "throwables" :
        kind === "stratagem" ? "stratagems" :
        null;

    // Build candidate category keys (most granular first)
    const categoryKeys = [];
    if (kind === "primary" || kind === "secondary" || kind === "throwable") {
        // Equipment subcategory names (e.g., "Assault Rifle", "Shotgun", "Special")
        if (item?._equipmentSub) categoryKeys.push(String(item._equipmentSub));
    } else if (kind === "stratagem") {
        // Stratagem keys checked in order: "Top/Sub", then "Sub", then "Top"
        if (item?._stratTop && item?._stratSub) categoryKeys.push(`${item._stratTop}/${item._stratSub}`);
        if (item?._stratSub) categoryKeys.push(String(item._stratSub));
        if (item?._stratTop) categoryKeys.push(String(item._stratTop));
    }

    function getScopedTagWeight(tag) {
        // 1) Pool + category/subcategory (most granular)
        if (poolKey && pools?.[poolKey]?.categories && categoryKeys.length) {
            const cats = pools[poolKey].categories;
            for (const ck of categoryKeys) {
                const w = cats?.[ck]?.tag?.[tag];
                if (typeof w === "number") return w;
            }
        }

        // 2) Pool-wide (applies to entire pool)
        if (poolKey) {
            const w = pools?.[poolKey]?.tag?.[tag];
            if (typeof w === "number") return w;
        }

        // 3) Global fallback
        const gw = globalTagWeights?.[tag];
        if (typeof gw === "number") return gw;

        return 1.0;
    }

    function getScopedIdWeight(id) {
        // 1) Pool + category/subcategory (most granular)
        if (poolKey && pools?.[poolKey]?.categories && categoryKeys.length) {
            const cats = pools[poolKey].categories;
            for (const ck of categoryKeys) {
                const w = cats?.[ck]?.id?.[id];
                if (typeof w === "number") return w;
            }
        }

        // 2) Pool-wide (applies to entire pool)
        if (poolKey) {
            const w = pools?.[poolKey]?.id?.[id];
            if (typeof w === "number") return w;
        }

        // 3) Global fallback
        const gw = globalIdWeights?.[id];
        if (typeof gw === "number") return gw;

        return 1.0;
    }

    // Tag multiplier
    const tags = item?.tags || [];
    for (const t of tags) {
        m *= getScopedTagWeight(t);
    }

    // Per-ID multiplier (scoped)
    if (item?.id) {
        m *= getScopedIdWeight(item.id);
    }

    return Number.isFinite(m) ? m : 1.0;
}

function getItemWeight(item, profile) {
    // Weight = macro * micro
    const w = getMacroMultiplier(item, profile) * getMicroMultiplier(item, profile);
    if (!Number.isFinite(w) || w <= 0) return 0;
    return w;
}

function weightedPick(items, weightFn) {
    if (!items || items.length === 0) return null;
    const weights = items.map(weightFn);
    const total = weights.reduce((a, b) => a + b, 0);

    if (total <= 0) {
        return pickRandom(items);
    }

    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r <= 0) return items[i];
    }
    return items[items.length - 1];
}

// ------------------------------------------------------------
// Stratagem Top-Type helper (legend-first distribution control)
// ------------------------------------------------------------
// Baseline is even odds between Offensive/Defensive/Supply,
// then macro.stratagemTop multipliers bias it from there.
// NOTE: We use the _stratTop field (set during normalization).
function pickStratagemTopEven(profile) {
    const macro = profile?.macro?.stratagemTop || {};
    const choices = [
        ["Offensive", 1.0 * (macro.Offensive ?? 1.0)],
        ["Defensive", 1.0 * (macro.Defensive ?? 1.0)],
        ["Supply", 1.0 * (macro.Supply ?? 1.0)],
    ];

    const total = choices.reduce((sum, [, w]) => sum + (Number.isFinite(w) && w > 0 ? w : 0), 0);
    if (total <= 0) return "Offensive";

    let r = Math.random() * total;
    for (const [name, wRaw] of choices) {
        const w = (Number.isFinite(wRaw) && wRaw > 0) ? wRaw : 0;
        r -= w;
        if (r <= 0) return name;
    }
    return choices[choices.length - 1][0];
}

// Like weightedPick, but removes the chosen item from the array (no duplicates).
function weightedSplicePick(pool, weightFn) {
    if (!pool || pool.length === 0) return null;

    const weights = pool.map(weightFn);
    const total = weights.reduce((a, b) => a + b, 0);

    if (total <= 0) {
        const idx = Math.floor(Math.random() * pool.length);
        return pool.splice(idx, 1)[0];
    }

    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
        r -= weights[i];
        if (r <= 0) return pool.splice(i, 1)[0];
    }

    return pool.splice(pool.length - 1, 1)[0];
}


function computeCooldownEffectiveSec(s) {
    // Eagles: average cooldown per use over a full cycle
    if (hasTag(s, "eagle") && typeof s.cooldown_between_uses_sec === "number") {
        const uses = (typeof s.uses === "number" && s.uses > 0) ? s.uses : 5; // default 5 if omitted
        return s.cooldown_between_uses_sec + (CONFIG.EAGLE_REARM_SEC / uses);
    }

    // Non-eagles: regular cooldown
    if (typeof s.cooldown_sec === "number") return s.cooldown_sec;

    return null;
}

// --- Uses / Limits helpers ---
// Rules (your model):
// 1) If "uses" is missing => unlimited
// 2) If "uses" exists AND stratagem is renewable (Eagle/rearm) => unlimited (renewable)
// 3) If "uses" exists AND NOT renewable => limited (hard cap)

function hasRearm(s) {
    // You currently model Eagle rearm via tag + CONFIG.EAGLE_REARM_SEC
    // If you ever add rearm_sec to JSONs later, this will still work.
    return hasTag(s, "eagle") || (typeof s.rearm_sec === "number");
}

function isRenewableStratagem(s) {
    return (typeof s.uses === "number" && s.uses > 0) && hasRearm(s);
}

function isLimitedStratagem(s) {
    return (typeof s.uses === "number" && s.uses > 0) && !hasRearm(s);
}

function getUseCap(s) {
    // Only meaningful for limited strats
    return isLimitedStratagem(s) ? s.uses : Infinity;
}


async function loadJson(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
    return res.json();
}


// Normalize icon paths without modifying data/img.
// - Prefer explicit JSON `icon` when present.
// - Fix known folder-name mismatches (e.g., Marksman -> Marksmen Rifle).
function normalizeIconPath(src) {
    if (!src || typeof src !== "string") return src;
    return src
        .replace(/\/Primary\/Marksman\//g, "/Primary/Marksman Rifle/")
        .replace(/\/Primary\/Marksman Rifle\//g, "/Primary/Marksman Rifle/");
}

async function loadAndMerge(paths) {
    const lists = await Promise.all(paths.map(async (path) => {
        const items = await loadJson(path);

        // Convert a JSON path like:
        //   /data/Primary/Assault Rifle/assault.json
        // into an image base path like:
        //   /img/Primary/Assault Rifle
        const imgBase = encodeURI(
            path
                .replace(/^\.\//, "")             // strip leading "./"
                .replace(/^data\//, "/img/")       // data -> /img
                .replace(/\/[^\/]+\.json$/i, "") // drop filename
        );

        // Derive category metadata from the JSON path so macro weights can be applied
        // without requiring extra fields in every item JSON.
        // Examples:
        //   /data/Primary/Shotgun/shotgun.json              => kind=primary, equipmentSub="Shotgun"
        //   /data/Stratagems/Defensive/Sentries/sentries.json => kind=stratagem, stratTop="Defensive", stratSub="Sentries"
        const parts = path.split("/").filter(Boolean);

        let kind = "unknown";
        let equipmentSub = null;
        let stratTop = null;
        let stratSub = null;

        // parts[0] is "data" when path begins with /data/...
        const dataIdx = parts.indexOf("data");
        const baseIdx = dataIdx >= 0 ? dataIdx : 0;

        if (parts[baseIdx + 1] === "Primary") {
            kind = "primary";
            equipmentSub = parts[baseIdx + 2] || null;
        } else if (parts[baseIdx + 1] === "Secondary") {
            kind = "secondary";
            equipmentSub = parts[baseIdx + 2] || null;
        } else if (parts[baseIdx + 1] === "Throwable") {
            kind = "throwable";
            equipmentSub = parts[baseIdx + 2] || null;
        } else if (parts[baseIdx + 1] === "Stratagems") {
            kind = "stratagem";
            stratTop = parts[baseIdx + 2] || null; // Offensive / Defensive / Supply
            stratSub = parts[baseIdx + 3] || null; // Sentries / Orbitals / Weapons / etc
        }

        return (items || []).map(it => ({
            ...it,

            // Prefer explicit icon path in JSON; fallback to deterministic id-based path.
            icon: normalizeIconPath((typeof it.icon === "string" && it.icon) ? it.icon : `${imgBase}/${it.id}.png`),

            // Derived fields used for weighting
            _kind: kind,
            _equipmentSub: equipmentSub,
            _stratTop: stratTop,
            _stratSub: stratSub,

            // Keep original source for debugging
            _src: path
        }));
    }));

    // Flatten and filter out any non-object garbage just in case
    return lists.flat().filter(x => x && typeof x === "object");
}



// ============================================================
// SECTION 4.2 — OWNERSHIP FILTER (optional; defaults to "everything owned")
// ============================================================
//
// Ownership is configured on /pages/owned.html and stored in localStorage.
// If the user has never customized ownership, randomizer behavior is unchanged.

const OWNERSHIP = {
    STORAGE_KEY: "hd2_excluded_v1"
};

function loadExcludedSafe() {
    const raw = localStorage.getItem(OWNERSHIP.STORAGE_KEY);
    if (!raw) return null;
    try {
        const data = JSON.parse(raw);
        if (!data || typeof data !== "object") return null;
        return {
            primaries: Array.isArray(data.primaries) ? data.primaries : [],
            secondaries: Array.isArray(data.secondaries) ? data.secondaries : [],
            grenades: Array.isArray(data.grenades) ? data.grenades : [],
            stratagems: Array.isArray(data.stratagems) ? data.stratagems : []
        };
    } catch {
        return null;
    }
}

function getExcludedSets() {
    const excluded = loadExcludedSafe();
    if (!excluded) return null; // no customization => treat all as owned
    return {
        primaries: new Set(excluded.primaries),
        secondaries: new Set(excluded.secondaries),
        grenades: new Set(excluded.grenades),
        stratagems: new Set(excluded.stratagems)
    };
}

function isOwned(categoryKey, item, excludedSets) {
    if (!excludedSets) return true; // default behavior: everything is owned
    const set = excludedSets[categoryKey];
    if (!set) return true;
    return !set.has(item?.id);
}

/**
 * ICON LOADING (no broken-image flash)
 * Uses display:none so the browser cannot paint the broken-image placeholder.
 */
function setIcon(imgEl, src, alt) {
    if (!imgEl) return;

    imgEl.alt = alt || "icon";

    // HARD hide so the browser can't paint a broken-image glyph while loading/404ing.
    imgEl.style.display = "none";
    imgEl.removeAttribute("src");
    delete imgEl.dataset.triedFallback;

    if (!src || typeof src !== "string") return;

    // Fix known folder-name mismatches without touching data/img.
    let normalized = src
        .replace(/\/Primary\/Marksman\//g, "/Primary/Marksman Rifle/")
        .replace(/\/Primary\/Marksmen Rifle\//g, "/Primary/Marksman Rifle/");

    // Normalize icon path so it always resolves from site root.
    // Prevents pages under /pages/... from looking for /pages/.../img/...
    normalized = normalized.replace(/^\.\//, "");
    if (!normalized.startsWith("/")) normalized = "/" + normalized;
    normalized = encodeURI(normalized);

    imgEl.onload = () => {
        imgEl.style.display = ""; // show ONLY after successful load
    };

    imgEl.onerror = () => {
        // Try one fallback (mainly for space-encoding / edge mismatches)
        const tried = imgEl.dataset.triedFallback === "1";
        if (!tried) {
            imgEl.dataset.triedFallback = "1";

            // If spaces weren't encoded for some reason, retry with encoded spaces.
            // (encodeURI should handle it, but this is a safe fallback.)
            const fallback = normalized.replace("Marksman Rifle", "Marksman%20Rifle");

            if (fallback !== imgEl.src) {
                imgEl.style.display = "none";
                imgEl.src = fallback;
                return;
            }
        }

        // Final failure: stay hidden forever (no broken icon)
        imgEl.removeAttribute("src");
        imgEl.style.display = "none";
    };

    imgEl.src = normalized;
}

// ============================================================
// SECTION 4.5 — STRATAGEM DISPLAY ORDER HELPERS
// ============================================================

const STRATAGEM_DISPLAY_ORDER = ["supply", "defensive", "offensive"];

function getStratagemDisplayRank(strat) {
    const tags = Array.isArray(strat?.tags) ? strat.tags : [];
    const id = String(strat?.id || strat?._id || "").toLowerCase();

    const isSupport = tags.includes("support_weapon");
    const isExpendable = tags.includes("expendable");

    // 1) Carried support weapons first (support_weapon && !expendable)
    if (isSupport && !isExpendable) return -2;

    // 2) Expendable support weapons should NOT steal Slot 1 from normal Supply.
    // Put them after Supply, but before Defensive/Offensive.
    if (isSupport && isExpendable) {
        // Slight extra push for Solo Silo so it doesn't appear early within the expendable bucket.
        if (id === "ms_11_solo_silo") return 0.75;
        return 0.5;
    }

    // 3) Normal category order: Supply → Defensive → Offensive
    for (let i = 0; i < STRATAGEM_DISPLAY_ORDER.length; i++) {
        if (tags.includes(STRATAGEM_DISPLAY_ORDER[i])) return i;
    }
    return 999; // Unknown/missing category tags go last
}


function sortStratagemsForDisplay(stratagems) {
    return [...stratagems].sort((a, b) => {
        const ra = getStratagemDisplayRank(a);
        const rb = getStratagemDisplayRank(b);
        if (ra !== rb) return ra - rb;

        // Tiebreaker: name (keeps it stable/readable)
        return (a?.name ?? "").localeCompare(b?.name ?? "");
    });
}


// ============================================================
// SECTION 5 — DATA PATHS
// ============================================================

/* ===== Paths to your generated JSON files (relative to project root) ===== */
const DATA_PATHS = {
    primaries: [
        "/data/Primary/Assault Rifle/assault.json",
        "/data/Primary/Energy-Based/energy.json",
        "/data/Primary/Explosive/explosive.json",
        "/data/Primary/Marksman Rifle/marksman.json",
        "/data/Primary/Shotgun/shotgun.json",
        "/data/Primary/Special/special.json",
        "/data/Primary/Submachine Gun/smg.json"
    ],
    secondaries: [
        "/data/Secondary/Melee/melee.json",
        "/data/Secondary/Pistol/pistol.json",
        "/data/Secondary/Special/special.json"
    ],
    grenades: [
        "/data/Throwable/Standard/standard.json",
        "/data/Throwable/Special/special.json"
    ],
    stratagems: [
        "/data/Stratagems/Defensive/Emplacements/emplacements.json",
        "/data/Stratagems/Defensive/Mines/mines.json",
        "/data/Stratagems/Defensive/Sentries/sentries.json",

        "/data/Stratagems/Offensive/Eagle Airstrikes/eagle.json",
        "/data/Stratagems/Offensive/Orbitals/orbitals.json",

        "/data/Stratagems/Supply/Backpacks/backpacks.json",
        "/data/Stratagems/Supply/Vehicles/vehicles.json",
        "/data/Stratagems/Supply/Weapons/weapons.json"
    ]
};

// ============================================================
// SECTION 6 — LOAD ALL DATA
// ============================================================

async function loadAllData() {
    $("status").textContent = "Loading data…";

    state.primaries = await loadAndMerge(DATA_PATHS.primaries);
    state.secondaries = await loadAndMerge(DATA_PATHS.secondaries);
    state.grenades = await loadAndMerge(DATA_PATHS.grenades);
    state.stratagems = await loadAndMerge(DATA_PATHS.stratagems);

    state.stratagems = state.stratagems.map(s => ({
        ...s,
        cooldown_effective_sec: computeCooldownEffectiveSec(s)
    }));


    console.log("Loaded primaries:", state.primaries.length);
    console.log("Loaded secondaries:", state.secondaries.length);
    console.log("Loaded grenades:", state.grenades.length);
    console.log("Loaded stratagems:", state.stratagems.length);

    // Tiny sanity checks
    if (!state.primaries.length) throw new Error("No primaries loaded. Check your data paths.");
    if (!state.secondaries.length) throw new Error("No secondaries loaded. Check your data paths.");
    if (!state.grenades.length) throw new Error("No grenades loaded. Check your data paths.");
    if (state.stratagems.length < CONFIG.STRATAGEM_COUNT) {
        throw new Error(`Not enough stratagems loaded (need at least ${CONFIG.STRATAGEM_COUNT}).`);
    }

    $("status").textContent = "Ready.";

    // Generate a loadout on first page load so the UI isn't empty
    try {
        generateLoadout();
    } catch (e) {
        console.error(e);
    }
}

// ============================================================
// SECTION 7 — RENDERING
// ============================================================

function renderEquipment({ primary, secondary, grenade }) {
    // Build/replace the 3 equipment cards into their mount points.
    const mounts = {
        primary: $("equipment-primary"),
        secondary: $("equipment-secondary"),
        throwable: $("equipment-throwable"),
    };

    function buildCard(label, item) {
        const card = document.createElement("div");
        card.className = "slot-card";

        const title = document.createElement("strong");
        title.textContent = label;
        card.appendChild(title);

        const row = document.createElement("div");
        row.className = "item-row";

        const img = document.createElement("img");
        img.className = "item-icon item-icon-large";
        img.alt = `${label} icon`;
        // No broken glyph on boot; setIcon hides until load succeeds.
        setIcon(img, item?.icon ?? "", item?.name ?? `${label} icon`);

        const name = document.createElement("div");
        name.className = "item-name";
        name.textContent = item?.name ?? "—";

        row.appendChild(img);
        row.appendChild(name);
        card.appendChild(row);

        return card;
    }

    if (mounts.primary) {
        mounts.primary.innerHTML = "";
        mounts.primary.appendChild(buildCard("Primary", primary));
    }
    if (mounts.secondary) {
        mounts.secondary.innerHTML = "";
        mounts.secondary.appendChild(buildCard("Secondary", secondary));
    }
    if (mounts.throwable) {
        mounts.throwable.innerHTML = "";
        mounts.throwable.appendChild(buildCard("Throwable", grenade));
    }
}

function renderLoadout({ primary, secondary, grenade, stratagems }, note = "") {
    renderEquipment({ primary, secondary, grenade });

    const ul = $("stratagemList");
    ul.innerHTML = "";

    const sortedStratagems = sortStratagemsForDisplay(stratagems || []);


    for (const s of sortedStratagems) {
        const li = document.createElement("li");
        li.className = "stratagem-item";

        const iconWrap = document.createElement("div");
        iconWrap.className = "stratagem-icon-wrap";

        const img = document.createElement("img");
        img.className = "item-icon";
        setIcon(img, s?.icon ?? "", s?.name ?? "Stratagem icon");

        iconWrap.appendChild(img);

        const name = document.createElement("div");
        name.className = "stratagem-name";
        name.textContent = s?.name ?? "—";

        li.appendChild(iconWrap);
        li.appendChild(name);
        ul.appendChild(li);
    }

    // Status note
    $("status").textContent = note ? `Loadout generated (${note}).` : "Loadout generated.";
}

// ============================================================
// SECTION 8 — STRATAGEM SELECTION (ALL RULES LIVE HERE)
// ============================================================

function pickStratagemsWithRules(profile, excludedSets) {
    const pool = [...state.stratagems].filter(s => isOwned("stratagems", s, excludedSets)); // copy so we can splice
    const picked = [];

    let backpackCount = 0;
    let supplyCount = 0;

    // Support weapon split:
    // - carried support weapons: support_weapon && !expendable  (max 1)
    // - expendable support weapons: support_weapon && expendable (max 2)
    let carriedSupportCount = 0;
    let expendableSupportCount = 0;

    const useEvenTop = !!(profile?.rules?.useEvenStratagemTop);

    function wouldViolateRules(candidate) {
        const usesBackpack = hasTag(candidate, "uses_backpack_slot");
        const isSupportWeapon = hasTag(candidate, "support_weapon");
        const isExpendable = hasTag(candidate, "expendable");
        const isSupply = hasTag(candidate, "supply");

        const isCarriedSupportWeapon = isSupportWeapon && !isExpendable;
        const isExpendableSupportWeapon = isSupportWeapon && isExpendable;

        if (isSupply && supplyCount >= CONFIG.MAX_SUPPLY_STRATS) return true;
        if (usesBackpack && backpackCount >= CONFIG.MAX_BACKPACK_STRATS) return true;
        if (isCarriedSupportWeapon && carriedSupportCount >= 1) return true;
        if (isExpendableSupportWeapon && expendableSupportCount >= 2) return true;

        return false;
    }

    function applyCounters(candidate) {
        const usesBackpack = hasTag(candidate, "uses_backpack_slot");
        const isSupportWeapon = hasTag(candidate, "support_weapon");
        const isExpendable = hasTag(candidate, "expendable");
        const isSupply = hasTag(candidate, "supply");

        const isCarriedSupportWeapon = isSupportWeapon && !isExpendable;
        const isExpendableSupportWeapon = isSupportWeapon && isExpendable;

        if (usesBackpack) backpackCount++;
        if (isSupply) supplyCount++;
        if (isCarriedSupportWeapon) carriedSupportCount++;
        if (isExpendableSupportWeapon) expendableSupportCount++;
    }

    function pickFromPoolFiltered(filterFn) {
        const candidates = pool.filter(filterFn);
        if (!candidates.length) return null;

        const chosen = weightedPick(candidates, (it) => getItemWeight(it, profile));
        if (!chosen) return null;

        const idx = pool.findIndex(x => x.id === chosen.id);
        if (idx >= 0) pool.splice(idx, 1);

        return chosen;
    }

    function pickFromPoolByCandidates(candidates, weightFn) {
        if (!candidates || candidates.length === 0) return null;
        const chosen = weightedPick(candidates, weightFn);
        if (!chosen) return null;
        const idx = pool.findIndex(x => x.id === chosen.id);
        if (idx >= 0) pool.splice(idx, 1);
        return chosen;
    }

    // Hierarchical stratagem selection:
    // 1) Pick Top (Supply/Defensive/Offensive) using ONLY macro.stratagemTop (and availability)
    // 2) Pick Sub within that top using ONLY macro.<top>Sub (and availability)
    // 3) Pick Item within that sub using ONLY micro/scoped weights (no macro), so tags can't "resurrect" a nerfed category.
    function pickHierarchicalStratagem(preferredTop) {
        // Eligible for non-guaranteed slots: respect rules, and also avoid extra carried supports (slot 1 already handled)
        const eligible = pool.filter(it =>
            !(hasTag(it, "support_weapon") && !hasTag(it, "expendable")) &&
            !wouldViolateRules(it)
        );
        if (!eligible.length) return null;

        const macroTop = profile?.macro?.stratagemTop || {};
        const topNames = ["Offensive", "Defensive", "Supply"];

        // Build top candidates with availability counts so we don't pick empty buckets.
        let tops = topNames.map(t => {
            const count = eligible.filter(it => it?._stratTop === t).length;
            const base = (Number.isFinite(macroTop?.[t]) ? macroTop[t] : 1.0);
            const w = base * (count > 0 ? count : 0);
            return { t, w, count };
        }).filter(x => x.count > 0 && x.w > 0);

        if (!tops.length) return null;

        // Try preferredTop first, but fall back gracefully if no eligible candidates exist there.
        let topPick = null;
        if (preferredTop) {
            const found = tops.find(x => x.t === preferredTop);
            if (found) topPick = preferredTop;
        }
        if (!topPick) {
            topPick = weightedPick(tops, x => x.w)?.t;
        }
        if (!topPick) return null;

        // Subcategory selection
        const macro = profile?.macro || {};
        let subWeights = {};
        if (topPick === "Offensive") subWeights = macro.offensiveSub || {};
        else if (topPick === "Defensive") subWeights = macro.defensiveSub || {};
        else if (topPick === "Supply") subWeights = macro.supplySub || {};

        const eligibleTop = eligible.filter(it => it?._stratTop === topPick);
        if (!eligibleTop.length) return null;

        const subs = {};
        for (const it of eligibleTop) {
            const sub = it?._stratSub || "Unknown";
            subs[sub] = (subs[sub] || 0) + 1;
        }

        const subChoices = Object.entries(subs).map(([sub, count]) => {
            const wSub = (Number.isFinite(subWeights?.[sub]) ? subWeights[sub] : 1.0);
            // Multiply by count so big buckets don't get under-picked purely due to having more items.
            return { sub, w: wSub * count, count };
        }).filter(x => x.count > 0 && x.w > 0);

        const subPick = (subChoices.length ? weightedPick(subChoices, x => x.w)?.sub : null) || (eligibleTop[0]?._stratSub);

        const eligibleSub = eligibleTop.filter(it => (it?._stratSub || "Unknown") === subPick);
        if (!eligibleSub.length) return null;

        // Item selection within sub uses MICRO ONLY (no macro), so "incendiary" etc. only tilt within the chosen bucket.
        const chosen = pickFromPoolByCandidates(eligibleSub, it => getMicroMultiplier(it, profile));
        return chosen;
    }

    if (useEvenTop) {
        // Force one support weapon first so "visible Slot 1" is always support after display-sort.
        let supportPick = pickFromPoolFiltered(it =>
            hasTag(it, "support_weapon") &&
            !hasTag(it, "expendable") &&
            !wouldViolateRules(it)
        );

        if (!supportPick) {
            supportPick = pickFromPoolFiltered(it =>
                hasTag(it, "support_weapon") &&
                !wouldViolateRules(it)
            );
        }

        if (!supportPick) return null;

        picked.push(supportPick);
        applyCounters(supportPick);

        while (picked.length < CONFIG.STRATAGEM_COUNT) {
            if (pool.length === 0) return null;

            // Stage 1 (Top): choose Supply/Defensive/Offensive using ONLY macro.stratagemTop.
            // We pass a preferred top to keep the "even top" feel, but selection stays hierarchical.
            const preferredTop = pickStratagemTopEven(profile);

            // Stage 2 (Sub) + Stage 3 (Item): pick within the chosen bucket.
            let next = pickHierarchicalStratagem(preferredTop);

            // Fallback: let the hierarchical picker choose any top/sub that has eligible candidates.
            if (!next) next = pickHierarchicalStratagem(null);

            if (!next) return null;

            picked.push(next);
            applyCounters(next);
        }

        // Keep safety edge case
        if (CONFIG.DISALLOW_SOLO_SILO_AS_ONLY_SUPPORT_WEAPON) {
            const supportWeapons = picked.filter(s => hasTag(s, "support_weapon"));
            if (supportWeapons.length === 1 && supportWeapons[0]?.id === CONFIG.SOLO_SILO_ID) {
                return null;
            }
        }

        return picked;
    }

    // DEFAULT MODE (existing behavior)
    while (picked.length < CONFIG.STRATAGEM_COUNT) {
        if (pool.length === 0) return null; // ran out of options

        const candidate = weightedSplicePick(pool, (it) => getItemWeight(it, profile));
        if (!candidate) return null; // removes -> no duplicates

        const usesBackpack = hasTag(candidate, "uses_backpack_slot");
        const isSupportWeapon = hasTag(candidate, "support_weapon");
        const isExpendable = hasTag(candidate, "expendable");
        const isSupply = hasTag(candidate, "supply");

        const isCarriedSupportWeapon = isSupportWeapon && !isExpendable;
        const isExpendableSupportWeapon = isSupportWeapon && isExpendable;

        if (isSupply && supplyCount >= CONFIG.MAX_SUPPLY_STRATS) continue;
        if (usesBackpack && backpackCount >= CONFIG.MAX_BACKPACK_STRATS) continue;
        if (isCarriedSupportWeapon && carriedSupportCount >= 1) continue;
        if (isExpendableSupportWeapon && expendableSupportCount >= 2) continue;

        picked.push(candidate);

        if (usesBackpack) backpackCount++;
        if (isSupply) supplyCount++;
        if (isCarriedSupportWeapon) carriedSupportCount++;
        if (isExpendableSupportWeapon) expendableSupportCount++;
    }

    if (CONFIG.REQUIRE_AT_LEAST_ONE_SUPPORT_WEAPON) {
        const hasAtLeastOneSupportWeapon = picked.some(s => hasTag(s, "support_weapon"));
        if (!hasAtLeastOneSupportWeapon) return null;
    }

    if (CONFIG.DISALLOW_SOLO_SILO_AS_ONLY_SUPPORT_WEAPON) {
        const supportWeapons = picked.filter(s => hasTag(s, "support_weapon"));
        if (supportWeapons.length === 1 && supportWeapons[0]?.id === CONFIG.SOLO_SILO_ID) {
            return null;
        }
    }

    return picked;
}


// ============================================================
// SECTION 9 — LOADOUT GENERATION (WEAPONS + CONSTRAINTS)
// ============================================================

function tryGenerateOnce(profile, excludedSets) {
    // Apply optional ownership filtering (defaults to all-owned)
    const primariesOwned = state.primaries.filter(w => isOwned("primaries", w, excludedSets));
    const secondariesOwned = state.secondaries.filter(w => isOwned("secondaries", w, excludedSets));
    const grenadesOwned = state.grenades.filter(w => isOwned("grenades", w, excludedSets));

    // 1) Pick stratagems first because they can constrain the primary
    const pickedStrats = pickStratagemsWithRules(profile, excludedSets);
    if (!pickedStrats) return null;

    // 2) One-handed requirement check
    const requiresOneHanded = pickedStrats.some(s => hasTag(s, "requires_one_handed_primary"));

    // 3) Primary pool based on shield/requirement rules
    const primaryPool = requiresOneHanded
        ? primariesOwned.filter(w => hasTag(w, "one_handed"))
        : primariesOwned;

    if (!primaryPool.length) return null;
    if (!secondariesOwned.length) return null;
    if (!grenadesOwned.length) return null;

    return {
        primary: weightedPick(primaryPool, (it) => getItemWeight(it, profile)),
        secondary: weightedPick(secondariesOwned, (it) => getItemWeight(it, profile)),
        grenade: weightedPick(grenadesOwned, (it) => getItemWeight(it, profile)),
        stratagems: pickedStrats,
        requiresOneHanded
    };
}

function generateLoadout() {
    // Resolve active faction + profile
    const factionSel = $("faction");
    const rawFaction = (factionSel && factionSel.value) ? factionSel.value : "any";
    const factionKey = (rawFaction === "any") ? "random" : rawFaction;

    const profile = getProfile(factionKey);
    // Debug: confirm the selected profile is used
    console.log(`[Randomizer] Active profile: ${profile?.name || factionKey}`, profile);

    // Brute-force retry in case constraints clash with your current data set
    const excludedSets = getExcludedSets();

    for (let attempt = 1; attempt <= CONFIG.MAX_GENERATION_ATTEMPTS; attempt++) {
        const result = tryGenerateOnce(profile, excludedSets);
        if (!result) continue;

        const noteParts = [];
        if (profile?.name) noteParts.push(profile.name);
        if (result.requiresOneHanded) noteParts.push("one-handed primary required");

        renderLoadout(result, noteParts.join(" • "));
        return;
    }

    $("status").textContent =
        "Could not generate a valid loadout with current rules/data. (Check tags + constraints.)";
}


// ============================================================
// SECTION 10 — EVENT HOOKS + BOOT
// ============================================================

// Hook up button
$("generate").addEventListener("click", () => {
    try {
        generateLoadout();
    } catch (err) {
        console.error(err);
        $("status").textContent = err?.message ?? "Unknown error generating loadout.";
    }
});

// Auto-generate a new loadout if the user changes the dropdown
$("faction").addEventListener("change", () => {
    generateLoadout();
});

// Boot
loadAllData().catch(err => {
    console.error(err);
    $("status").textContent = err?.message ?? "Failed to load data.";
});
