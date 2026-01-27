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
    MAX_GENERATION_ATTEMPTS: 250
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

async function loadAndMerge(paths) {
    const lists = await Promise.all(paths.map(loadJson));
    // Flatten and filter out any non-object garbage just in case
    return lists.flat().filter(x => x && typeof x === "object");
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
        "./data/Primary/Assault Rifle/assault.json",
        "./data/Primary/Energy-Based/energy.json",
        "./data/Primary/Explosive/explosive.json",
        "./data/Primary/Marksmen Rifle/marksman.json",
        "./data/Primary/Shotgun/shotgun.json",
        "./data/Primary/Special/special.json",
        "./data/Primary/Submachine Gun/smg.json"
    ],
    secondaries: [
        "./data/Secondary/Melee/melee.json",
        "./data/Secondary/Pistol/pistol.json",
        "./data/Secondary/Special/special.json"
    ],
    grenades: [
        "./data/Throwable/Standard/standard.json",
        "./data/Throwable/Special/special.json"
    ],
    stratagems: [
        "./data/Stratagems/Defensive/Emplacements/emplacements.json",
        "./data/Stratagems/Defensive/Mines/mines.json",
        "./data/Stratagems/Defensive/Sentries/sentries.json",

        "./data/Stratagems/Offensive/Eagle Airstrikes/eagle.json",
        "./data/Stratagems/Offensive/Orbitals/orbitals.json",

        "./data/Stratagems/Supply/Backpacks/backpacks.json",
        "./data/Stratagems/Supply/Vehicles/vehicles.json",
        "./data/Stratagems/Supply/Weapons/weapons.json"
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
}

// ============================================================
// SECTION 7 — RENDERING
// ============================================================

function renderLoadout({ primary, secondary, grenade, stratagems }, note = "") {
    $("primaryName").textContent = primary?.name ?? "—";
    $("secondaryName").textContent = secondary?.name ?? "—";
    $("grenadeName").textContent = grenade?.name ?? "—";

    const ul = $("stratagemList");
    ul.innerHTML = "";

    const sortedStratagems = sortStratagemsForDisplay(stratagems);
    for (const s of sortedStratagems) {
        const li = document.createElement("li");
        li.textContent = s?.name ?? "—";
        ul.appendChild(li);
    }

    $("status").textContent = note || "Loadout generated.";
}

// ============================================================
// SECTION 8 — STRATAGEM SELECTION (ALL RULES LIVE HERE)
// ============================================================

function pickStratagemsWithRules() {
    const pool = [...state.stratagems]; // copy so we can splice
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

    return picked;
}

// ============================================================
// SECTION 9 — LOADOUT GENERATION (WEAPONS + CONSTRAINTS)
// ============================================================

function tryGenerateOnce() {
    // 1) Pick stratagems first because they can constrain the primary
    const pickedStrats = pickStratagemsWithRules();
    if (!pickedStrats) return null;

    // 2) One-handed requirement check
    const requiresOneHanded = pickedStrats.some(s => hasTag(s, "requires_one_handed_primary"));

    // 3) Primary pool based on shield/requirement rules
    const primaryPool = requiresOneHanded
        ? state.primaries.filter(w => hasTag(w, "one_handed"))
        : state.primaries;

    if (!primaryPool.length) return null;

    return {
        primary: pickRandom(primaryPool),
        secondary: pickRandom(state.secondaries),
        grenade: pickRandom(state.grenades),
        stratagems: pickedStrats,
        requiresOneHanded
    };
}

function generateLoadout() {
    // Brute-force retry in case constraints clash with your current data set
    for (let attempt = 1; attempt <= CONFIG.MAX_GENERATION_ATTEMPTS; attempt++) {
        const result = tryGenerateOnce();
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

// Boot
loadAllData().catch(err => {
    console.error(err);
    $("status").textContent = err?.message ?? "Failed to load data.";
});
