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

const CONFIG = {
    // Stratagem slot rules
    STRATAGEM_COUNT: 4,
    MAX_BACKPACK_STRATS: 1,         // "uses_backpack_slot"
    MAX_SUPPORT_WEAPON_STRATS: 1,   // "support_weapon"

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
        .replace(/\/Primary\/Marksman\//g, "/Primary/Marksmen Rifle/")
        .replace(/\/Primary\/Marksman Rifle\//g, "/Primary/Marksmen Rifle/");
}

async function loadAndMerge(paths) {
    const lists = await Promise.all(paths.map(async (path) => {
        const items = await loadJson(path);

        // Convert a JSON path like:
        //   /data/Primary/Assault Rifle/assault.json
        // into an image base path like:
        //   img/Primary/Assault Rifle
        const imgBase = encodeURI(
            path
                .replace(/^\.\//, "")            // strip leading "./"
                .replace(/^data\//, "/img/")     // data -> img
                .replace(/\/[^\/]+\.json$/i, "") // drop filename
        );

        return (items || []).map(it => ({
            ...it,
            // Prefer explicit icon path in JSON; fallback to deterministic id-based path.
            icon: normalizeIconPath((typeof it.icon === "string" && it.icon) ? it.icon : `${imgBase}/${it.id}.png`),
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
        .replace(/\/Primary\/Marksman\//g, "/Primary/Marksmen Rifle/")
        .replace(/\/Primary\/Marksman Rifle\//g, "/Primary/Marksmen Rifle/");

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
            const fallback = normalized.replace("Marksmen Rifle", "Marksmen%20Rifle");

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
        "/data/Primary/Marksmen Rifle/marksman.json",
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

    const sortedStratagems = [...(stratagems || [])].sort((a, b) =>
        (a?.name || "").localeCompare(b?.name || "")
    );

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

function pickStratagemsWithRules(excludedSets) {
    const pool = [...state.stratagems].filter(s => isOwned("stratagems", s, excludedSets)); // copy so we can splice
    const picked = [];

    let backpackCount = 0;
    let supportWeaponCount = 0;

    while (picked.length < CONFIG.STRATAGEM_COUNT) {
        if (pool.length === 0) return null; // ran out of options

        const idx = Math.floor(Math.random() * pool.length);
        const candidate = pool.splice(idx, 1)[0]; // removes -> no duplicates

        const usesBackpack = hasTag(candidate, "uses_backpack_slot");
        const isSupportWeapon = hasTag(candidate, "support_weapon");

        // Rule: Max backpack stratagems
        if (usesBackpack && backpackCount >= CONFIG.MAX_BACKPACK_STRATS) continue;

        // Rule: Max support weapon stratagems
        if (isSupportWeapon && supportWeaponCount >= CONFIG.MAX_SUPPORT_WEAPON_STRATS) continue;

        picked.push(candidate);

        if (usesBackpack) backpackCount++;
        if (isSupportWeapon) supportWeaponCount++;
    }

    // Rule: Must have at least one support weapon (support_weapon implies damage)
    if (CONFIG.REQUIRE_AT_LEAST_ONE_SUPPORT_WEAPON) {
        const hasAtLeastOneSupportWeapon = picked.some(s => hasTag(s, "support_weapon"));
        if (!hasAtLeastOneSupportWeapon) return null;
    }

    // Edge case: Solo Silo cannot be the ONLY support weapon
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

function tryGenerateOnce(excludedSets) {
    // Apply optional ownership filtering (defaults to all-owned)
    const primariesOwned = state.primaries.filter(w => isOwned("primaries", w, excludedSets));
    const secondariesOwned = state.secondaries.filter(w => isOwned("secondaries", w, excludedSets));
    const grenadesOwned = state.grenades.filter(w => isOwned("grenades", w, excludedSets));

    // 1) Pick stratagems first because they can constrain the primary
    const pickedStrats = pickStratagemsWithRules(excludedSets);
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
        primary: pickRandom(primaryPool),
        secondary: pickRandom(secondariesOwned),
        grenade: pickRandom(grenadesOwned),
        stratagems: pickedStrats,
        requiresOneHanded
    };
}

function generateLoadout() {
    // Brute-force retry in case constraints clash with your current data set
    const excludedSets = getExcludedSets();

    for (let attempt = 1; attempt <= CONFIG.MAX_GENERATION_ATTEMPTS; attempt++) {
        const result = tryGenerateOnce(excludedSets);
        if (!result) continue;

        const note = result.requiresOneHanded
            ? "Loadout generated (one-handed primary required)."
            : "Loadout generated.";

        renderLoadout(result, note);
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
