// pages/owned/owned.js
// Ownership selection UI + localStorage persistence.

const STORAGE_KEY = "hd2_excluded_v1";
function $(id) { return document.getElementById(id); }

function safeJsonParse(text, fallback) {
    try { return JSON.parse(text); } catch { return fallback; }
}

function loadExcluded() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? safeJsonParse(raw, null) : null;
    if (!data || typeof data !== "object") {
        return { primaries: [], secondaries: [], grenades: [], stratagems: [] };
    }
    return {
        primaries: Array.isArray(data.primaries) ? data.primaries : [],
        secondaries: Array.isArray(data.secondaries) ? data.secondaries : [],
        grenades: Array.isArray(data.grenades) ? data.grenades : [],
        stratagems: Array.isArray(data.stratagems) ? data.stratagems : []
    };
}

function saveExcluded(excluded) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(excluded));
}

function excludedToSets(excluded) {
    return {
        primaries: new Set(excluded.primaries),
        secondaries: new Set(excluded.secondaries),
        grenades: new Set(excluded.grenades),
        stratagems: new Set(excluded.stratagems)
    };
}

async function loadJson(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
    return res.json();
}

async function loadAndMerge(paths) {
    const lists = await Promise.all(paths.map(async (path) => {
        const items = await loadJson(path);

        const fixKnownIconPath = (icon) => {
            if (!icon || typeof icon !== "string") return icon;
            return icon
                .replace(/\/Primary\/Marksman\//g, "/Primary/Marksman Rifle/")
                .replace(/\/Primary\/Marksman Rifle\//g, "/Primary/Marksman Rifle/");
        };

        const makeIconPathRelative = (icon) => {
            if (!icon || typeof icon !== "string") return null;
            if (/^(https?:)?\/\//i.test(icon)) return icon;
            if (icon.startsWith("../") || icon.startsWith("./")) return icon;
            if (icon.startsWith("/img/")) return `../${icon}`;
            return icon;
        };

        const imgBaseFallback = encodeURI(
            path
                .replace(/^\.\//, "")
                .replace(/^\.\.\/data\//, "../img/")
                .replace(/^data\//, "../img/")
                .replace(/\/[^\/]+\.json$/i, "")
        );

        return (items || []).map(it => {
            const iconFixed = fixKnownIconPath(it?.icon);
            return {
                ...it,
                icon: makeIconPathRelative(iconFixed) || `${imgBaseFallback}/${it.id}.png`,
                _src: path
            };
        });
    }));

    return lists.flat().filter(x => x && typeof x === "object");
}

/* ✅ IMPORTANT: These paths match your actual project structure */
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

const state = { primaries: [], secondaries: [], grenades: [], stratagems: [] };

function resolveIconFallbacks(src) {
    if (!src) return null;
    if (src.includes("/Primary/Marksman/")) return src.replace("/Primary/Marksman/", "/Primary/Marksman%20Rifle/");
    if (src.includes("/Primary/Marksman Rifle/")) return src.replace("/Primary/Marksman Rifle/", "/Primary/Marksman%20Rifle/");
    return null;
}

function renderOwnedCard(containerEl, it, excludedSet, categoryKey) {
    const card = document.createElement("label");
    card.className = "owned-card";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !excludedSet.has(it.id);

    cb.addEventListener("change", () => {
        const excluded = loadExcluded();
        const arr = excluded[categoryKey] || [];
        const set = new Set(arr);

        if (cb.checked) set.delete(it.id);
        else set.add(it.id);

        excluded[categoryKey] = Array.from(set);
        saveExcluded(excluded);
        updateStatus();
    });

    const img = document.createElement("img");
    img.className = "item-icon owned-icon";
    img.alt = it?.name ?? "icon";

    let iconPath = it.icon || "";
    iconPath = iconPath.replace(/^\.\//, "");
    if (iconPath && !iconPath.startsWith("/")) iconPath = "/" + iconPath;
    img.src = encodeURI(iconPath);

    img.onerror = () => {
        const alt = resolveIconFallbacks(img.src);
        if (alt) {
            img.onerror = () => img.removeAttribute("src");
            img.src = alt;
            return;
        }
        img.removeAttribute("src");
    };

    const name = document.createElement("span");
    name.className = "owned-name";
    name.textContent = it?.name ?? it?.id ?? "—";

    card.appendChild(cb);
    card.appendChild(img);
    card.appendChild(name);
    containerEl.appendChild(card);
}

function renderEquipmentList(containerEl, items, excludedSet, categoryKey) {
    containerEl.innerHTML = "";

    const groups = new Map();
    for (const it of items) {
        const src = it?._src || "";
        const parts = src.split("/").filter(Boolean);
        const header = (parts.length >= 3 ? parts[parts.length - 2] : "") || "Other";
        if (!groups.has(header)) groups.set(header, []);
        groups.get(header).push(it);
    }

    const groupKeys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
    for (const g of groupKeys) {
        const typeCard = document.createElement("div");
        typeCard.className = "slot-card owned-type-card";
        containerEl.appendChild(typeCard);

        const titleEl = document.createElement("div");
        titleEl.className = "owned-type-title";
        titleEl.textContent = g;
        typeCard.appendChild(titleEl);

        const grid = document.createElement("div");
        grid.className = "owned-grid";
        typeCard.appendChild(grid);

        const sorted = [...groups.get(g)].sort((a, b) => (a?.name ?? "").localeCompare(b?.name ?? ""));
        for (const it of sorted) {
            renderOwnedCard(grid, it, excludedSet, categoryKey);
        }
    }
}

/* ✅ Stratagems: render subtypes inside a FIXED top bucket */
function renderStratagemBucket(containerEl, items, excludedSet, topName) {
    containerEl.innerHTML = "";

    const subGroups = new Map();
    for (const it of items) {
        const src = it?._src || "";
        const parts = src.split("/").filter(Boolean);
        const i = parts.findIndex(p => p === "Stratagems");
        const top = (i !== -1 && parts[i + 1]) ? parts[i + 1] : "Other";
        if (top !== topName) continue;

        const sub = (parts.length >= 3 ? parts[parts.length - 2] : "Other") || "Other";
        if (!subGroups.has(sub)) subGroups.set(sub, []);
        subGroups.get(sub).push(it);
    }

    const subKeys = Array.from(subGroups.keys()).sort((a, b) => a.localeCompare(b));
    for (const sub of subKeys) {
        const typeCard = document.createElement("div");
        typeCard.className = "slot-card owned-type-card";
        containerEl.appendChild(typeCard);

        const titleEl = document.createElement("div");
        titleEl.className = "owned-type-title";
        titleEl.textContent = sub;
        typeCard.appendChild(titleEl);

        const grid = document.createElement("div");
        grid.className = "owned-grid";
        typeCard.appendChild(grid);

        const sorted = [...subGroups.get(sub)].sort((a, b) => (a?.name ?? "").localeCompare(b?.name ?? ""));
        for (const it of sorted) {
            renderOwnedCard(grid, it, excludedSet, "stratagems");
        }
    }
}

function applySearchFilter(query) {
    const q = (query || "").trim().toLowerCase();
    const cards = document.querySelectorAll(".owned-card");
    for (const c of cards) {
        const text = (c.textContent || "").toLowerCase();
        c.style.display = (!q || text.includes(q)) ? "" : "none";
    }
}

function setAll(checked) {
    const excluded = loadExcluded();

    const allCats = [
        ["primaries", state.primaries],
        ["secondaries", state.secondaries],
        ["grenades", state.grenades],
        ["stratagems", state.stratagems],
    ];

    for (const [key, items] of allCats) {
        if (checked) excluded[key] = [];
        else excluded[key] = items.map(x => x.id);
    }

    saveExcluded(excluded);
    rerender();
    updateStatus();
}

function updateStatus() {
    const excluded = loadExcluded();
    const counts = {
        primaries: excluded.primaries.length,
        secondaries: excluded.secondaries.length,
        grenades: excluded.grenades.length,
        stratagems: excluded.stratagems.length
    };

    $("ownedStatus").textContent =
        `Excluded — Primary: ${counts.primaries}, Secondary: ${counts.secondaries}, Throwable: ${counts.grenades}, Stratagems: ${counts.stratagems}`;
}

function rerender() {
    const excluded = loadExcluded();
    const sets = excludedToSets(excluded);

    renderEquipmentList($("ownedPrimaries"), state.primaries, sets.primaries, "primaries");
    renderEquipmentList($("ownedSecondaries"), state.secondaries, sets.secondaries, "secondaries");
    renderEquipmentList($("ownedGrenades"), state.grenades, sets.grenades, "grenades");

    renderStratagemBucket($("ownedDefensive"), state.stratagems, sets.stratagems, "Defensive");
    renderStratagemBucket($("ownedOffensive"), state.stratagems, sets.stratagems, "Offensive");
    renderStratagemBucket($("ownedSupply"), state.stratagems, sets.stratagems, "Supply");

    applySearchFilter($("ownedSearch").value);
}

async function boot() {
    $("ownedStatus").textContent = "Loading…";

    state.primaries = await loadAndMerge(DATA_PATHS.primaries);
    state.secondaries = await loadAndMerge(DATA_PATHS.secondaries);
    state.grenades = await loadAndMerge(DATA_PATHS.grenades);
    state.stratagems = await loadAndMerge(DATA_PATHS.stratagems);

    rerender();
    updateStatus();

    $("ownedSelectAll").addEventListener("click", () => setAll(true));
    $("ownedSelectNone").addEventListener("click", () => setAll(false));
    $("ownedSearch").addEventListener("input", (e) => applySearchFilter(e.target.value));
}

boot().catch(err => {
    console.error(err);
    $("ownedStatus").textContent = err?.message ?? "Failed to load owned items data.";
});
