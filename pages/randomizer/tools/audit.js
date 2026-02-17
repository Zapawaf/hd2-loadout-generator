import { getProfile } from "../profiles/index.js";

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

const DEFAULT_RULES = {
    STRATAGEM_COUNT: 4,
    MAX_BACKPACK_STRATS: 1,
    MAX_SUPPLY_STRATS: 2,
    REQUIRE_AT_LEAST_ONE_SUPPORT_WEAPON: true,
    DISALLOW_SOLO_SILO_AS_ONLY_SUPPORT_WEAPON: true,
    SOLO_SILO_ID: "ms_11_solo_silo",
};

const $ = (id) => document.getElementById(id);
const log = (msg) => { $("log").textContent += msg + "\n"; };
const setStatus = (msg) => { $("status").textContent = msg; };

async function loadJson(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
    return await res.json();
}

function annotateFromPath(item, path, kind) {
    const parts = path.split("/").filter(Boolean);
    const annotated = { ...item, _src: path, _kind: kind, _top: "", _sub: "" };

    if (parts[1] === "Primary") {
        annotated._top = "Primary";
        annotated._sub = parts[2];
        annotated._macroKey = "primarySubcategory";
    } else if (parts[1] === "Secondary") {
        annotated._top = "Secondary";
        annotated._sub = parts[2];
        annotated._macroKey = "secondarySubcategory";
    } else if (parts[1] === "Throwable") {
        annotated._top = "Throwable";
        annotated._sub = parts[2];
        annotated._macroKey = "throwableSubcategory";
    } else if (parts[1] === "Stratagems") {
        annotated._top = parts[2];
        annotated._sub = parts[3];
        annotated._macroKeyTop = "stratagemTop";
        if (annotated._top === "Offensive") annotated._macroKeySub = "offensiveSub";
        if (annotated._top === "Defensive") annotated._macroKeySub = "defensiveSub";
        if (annotated._top === "Supply") annotated._macroKeySub = "supplySub";
    }
    return annotated;
}

async function loadAndMerge(paths, kind) {
    const all = [];
    for (const p of paths) {
        const arr = await loadJson(p);
        for (const item of arr) all.push(annotateFromPath(item, p, kind));
    }
    return all;
}

function hasTag(item, tag) {
    return Array.isArray(item?.tags) && item.tags.includes(tag);
}

function macroWeight(item, profile) {
    const m = profile?.macro || {};
    if (item._macroKey && item._sub) {
        const w = m?.[item._macroKey]?.[item._sub];
        return (typeof w === "number") ? w : 1.0;
    }
    if (item._macroKeyTop && item._top) {
        const wt = m?.[item._macroKeyTop]?.[item._top];
        const ws = item._macroKeySub && item._sub ? m?.[item._macroKeySub]?.[item._sub] : 1.0;
        return (typeof wt === "number" ? wt : 1.0) * (typeof ws === "number" ? ws : 1.0);
    }
    return 1.0;
}

function microWeight(item, profile) {
    let w = 1.0;
    const tagMap = profile?.micro?.tag || {};
    const idMap = profile?.micro?.id || {};
    for (const t of (item?.tags || [])) {
        const mult = tagMap[t];
        if (typeof mult === "number") w *= mult;
    }
    const idMult = idMap[item?.id];
    if (typeof idMult === "number") w *= idMult;
    if (!Number.isFinite(w) || w < 0) return 0;
    return w;
}

function itemWeight(item, profile) {
    const w = macroWeight(item, profile) * microWeight(item, profile);
    if (!Number.isFinite(w) || w <= 0) return 0;
    return w;
}

function weightedPickIndex(items, weightFn) {
    let total = 0;
    const weights = new Array(items.length);
    for (let i = 0; i < items.length; i++) {
        const w = weightFn(items[i]);
        weights[i] = w;
        total += w;
    }
    if (total <= 0) return Math.floor(Math.random() * items.length);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r <= 0) return i;
    }
    return items.length - 1;
}

function weightedPickAndRemove(pool, weightFn) {
    const idx = weightedPickIndex(pool, weightFn);
    return pool.splice(idx, 1)[0];
}

function pickStratagemsWithRules(stratPool, rules, profile) {
    const pool = [...stratPool];
    const picked = [];
    let backpackCount = 0;
    let supplyCount = 0;
    let supportCount = 0;

    while (picked.length < rules.STRATAGEM_COUNT) {
        if (pool.length === 0) return null;
        const candidate = weightedPickAndRemove(pool, (it) => itemWeight(it, profile));

        const usesBackpack = hasTag(candidate, "uses_backpack_slot");
        const isSupportWeapon = hasTag(candidate, "support_weapon");
        const isSupply = candidate._top === "Supply";

        // IMPORTANT: Match generator rule — max 1 support_weapon TOTAL
        if (isSupportWeapon && supportCount >= 1) continue;
        if (isSupply && supplyCount >= rules.MAX_SUPPLY_STRATS) continue;
        if (usesBackpack && backpackCount >= rules.MAX_BACKPACK_STRATS) continue;

        picked.push(candidate);

        if (usesBackpack) backpackCount++;
        if (isSupply) supplyCount++;
        if (isSupportWeapon) supportCount++;
    }

    if (rules.REQUIRE_AT_LEAST_ONE_SUPPORT_WEAPON) {
        if (supportCount < 1) return null;
    }

    if (rules.DISALLOW_SOLO_SILO_AS_ONLY_SUPPORT_WEAPON) {
        const supportWeapons = picked.filter(s => hasTag(s, "support_weapon"));
        if (supportWeapons.length === 1 && supportWeapons[0]?.id === rules.SOLO_SILO_ID) return null;
    }

    return picked;
}

function tryGenerateOnce(state, rules, profile) {
    const pickedStrats = pickStratagemsWithRules(state.stratagems, rules, profile);
    if (!pickedStrats) return null;

    const requiresOneHanded = pickedStrats.some(s => hasTag(s, "requires_one_handed_primary"));
    const primaryPool = requiresOneHanded ? state.primaries.filter(w => hasTag(w, "one_handed")) : state.primaries;

    if (!primaryPool.length || !state.secondaries.length || !state.grenades.length) return null;

    const primary = primaryPool[weightedPickIndex(primaryPool, (it) => itemWeight(it, profile))];
    const secondary = state.secondaries[weightedPickIndex(state.secondaries, (it) => itemWeight(it, profile))];
    const grenade = state.grenades[weightedPickIndex(state.grenades, (it) => itemWeight(it, profile))];

    return { primary, secondary, grenade, stratagems: pickedStrats, requiresOneHanded };
}

function inc(map, key, n = 1) {
    map.set(key, (map.get(key) || 0) + n);
}

function percent(n, d) {
    return d === 0 ? 0 : (n / d) * 100;
}

function toCsv(rows) {
    const esc = (v) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
    };
    return rows.map(r => r.map(esc).join(",")).join("\n");
}

function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function renderTopTable(container, title, rows) {
    const div = document.createElement("div");
    div.innerHTML = `<h3>${title}</h3>`;
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    thead.innerHTML = "<tr><th>Name</th><th>Count</th><th>Odds</th></tr>";
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    for (const r of rows) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${r.name}</td><td>${r.count}</td><td>${r.odds.toFixed(3)}%</td>`;
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    div.appendChild(table);
    container.appendChild(div);
}

/* ==========================================================
   NEW: Visible stratagem display ordering (match what user sees)
   ========================================================== */

const STRATAGEM_DISPLAY_ORDER = ["supply", "defensive", "offensive"];

function getStratagemDisplayRank(strat) {
    const tags = Array.isArray(strat?.tags) ? strat.tags : [];

    // Force support weapons first (visible slot 1 should be support_weapon if rule guarantees one exists)
    if (tags.includes("support_weapon")) return -1;

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

        // Stable/readable tie-breaker
        return (a?.name ?? "").localeCompare(b?.name ?? "");
    });
}

async function runAudit() {
    $("runBtn").disabled = true;
    $("dlItemsBtn").disabled = true;
    $("dlTagsBtn").disabled = true;
    $("dlSlot1Btn").disabled = true;
    $("log").textContent = "";

    const faction = $("faction").value;
    const runs = Math.max(100, Number($("runs").value || 50000));
    const attempts = Math.max(10, Number($("attempts").value || 250));

    const profile = getProfile(faction);
    log(`[Audit] Using profile: ${profile?.name || faction}`);

    const rules = { ...DEFAULT_RULES, ...(profile.rules || {}) };
    log(`[Audit] Rules: ${JSON.stringify(rules)}`);

    setStatus("Loading data…");
    const state = {
        primaries: await loadAndMerge(DATA_PATHS.primaries, "primary"),
        secondaries: await loadAndMerge(DATA_PATHS.secondaries, "secondary"),
        grenades: await loadAndMerge(DATA_PATHS.grenades, "grenade"),
        stratagems: await loadAndMerge(DATA_PATHS.stratagems, "stratagem"),
    };
    log(`[Audit] Loaded primaries=${state.primaries.length}, secondaries=${state.secondaries.length}, grenades=${state.grenades.length}, stratagems=${state.stratagems.length}`);

    const itemCounts = new Map();
    const itemNames = new Map();
    const itemMeta = new Map();
    const tagCounts = new Map();

    // Debug: stratagem top-type distribution by slot (VISIBLE order)
    const stratSlotTopCounts = new Map(); // key `${slot}|${top}`

    // Non-support top-type distribution (exclude exactly one support_weapon per run; ignore slots)
    const nonSupportTopCounts = new Map(); // key `${top}`
    let nonSupportPicksCount = 0;
    let runsWithNoSupportWeapon = 0;

    // Debug: visible Slot 1 support_weapon rate (VISIBLE order)
    let visibleSlot1Total = 0;
    let visibleSlot1Support = 0;

    // Debug: Slot 1 stratagem item breakdown (VISIBLE order)
    const stratSlot1Counts = new Map();
    const stratSlot1Meta = new Map();

    let failed = 0;

    setStatus(`Running ${runs.toLocaleString()} simulations…`);
    const t0 = performance.now();

    for (let i = 1; i <= runs; i++) {
        let result = null;
        for (let a = 0; a < attempts; a++) {
            result = tryGenerateOnce(state, rules, profile);
            if (result) break;
        }
        if (!result) { failed++; continue; }

        // ============================
        // CRITICAL: match the UI visible/display order
        // ============================
        result.stratagems = sortStratagemsForDisplay(result.stratagems);

        // Non-support top-type distribution (exclude exactly one support_weapon per run; ignore slots)
        {
            const supportIdx = result.stratagems.findIndex(s => (s?.tags || []).includes("support_weapon"));
            if (supportIdx === -1) {
                runsWithNoSupportWeapon += 1;
            }
            const nonSupport = result.stratagems.filter((_, idx) => idx !== supportIdx);
            for (const s of nonSupport) {
                if (s && s._top) {
                    inc(nonSupportTopCounts, s._top, 1);
                    nonSupportPicksCount += 1;
                }
            }
        }

        // Debug: stratagem slot distribution + visible Slot 1 support_weapon rate (VISIBLE order)
        visibleSlot1Total += 1;
        const slot1 = result.stratagems[0];
        if (slot1 && Array.isArray(slot1.tags) && slot1.tags.includes("support_weapon")) {
            visibleSlot1Support += 1;
        }

        for (let si = 0; si < result.stratagems.length; si++) {
            const s = result.stratagems[si];
            const slot = si + 1;
            const top = s._top || "";
            if (top) inc(stratSlotTopCounts, `${slot}|${top}`, 1);

            if (slot === 1) {
                inc(stratSlot1Counts, s.id, 1);
                if (!stratSlot1Meta.has(s.id)) {
                    stratSlot1Meta.set(s.id, { id: s.id, name: s.name || s.id, top: s._top || "", sub: s._sub || "" });
                }
            }
        }

        const picks = [
            { kind: "Primary", item: result.primary },
            { kind: "Secondary", item: result.secondary },
            { kind: "Throwable", item: result.grenade },
            ...result.stratagems.map(s => ({ kind: "Stratagem", item: s }))
        ];

        for (const p of picks) {
            const key = `${p.kind}|${p.item.id}`;
            inc(itemCounts, key, 1);
            itemNames.set(key, p.item.name || p.item.id);
            itemMeta.set(key, { top: p.item._top || "", sub: p.item._sub || "", src: p.item._src || "" });
            for (const t of (p.item.tags || [])) inc(tagCounts, t, 1);
        }

        if (i % 5000 === 0) setStatus(`Running… ${i.toLocaleString()} / ${runs.toLocaleString()}`);
    }

    const t1 = performance.now();
    const effectiveRuns = runs - failed;

    setStatus(`Done. Runs=${runs.toLocaleString()}, failed=${failed.toLocaleString()} (${(failed / runs * 100).toFixed(2)}%). Time=${((t1 - t0) / 1000).toFixed(2)}s`);

    const resultsDiv = $("results");
    resultsDiv.innerHTML = "";

    function topByKind(kind, denomPerRun) {
        const rows = [];
        for (const [key, count] of itemCounts.entries()) {
            const [k, id] = key.split("|");
            if (k !== kind) continue;
            rows.push({ name: itemNames.get(key) || id, count, odds: percent(count, effectiveRuns * denomPerRun) });
        }
        rows.sort((a, b) => b.odds - a.odds);
        return rows.slice(0, 25);
    }

    // Stratagem Slots — Top-Type Distribution (percent + count, per VISIBLE slot)
    (function renderStratSlotTopTable() {
        const sc = (rules && rules.STRATAGEM_COUNT) ? rules.STRATAGEM_COUNT : 4;
        const tops = ["Offensive", "Defensive", "Supply"];

        const div = document.createElement("div");
        div.innerHTML = `<h3>Stratagem Slots — Top-Type Distribution</h3>
      <div style="margin-bottom:8px">Counts are per-slot across successful runs (after retries). Based on <b>visible/display order</b>.</div>`;

        const table = document.createElement("table");
        const thead = document.createElement("thead");
        thead.innerHTML = "<tr><th>Slot</th><th>Offensive</th><th>Defensive</th><th>Supply</th></tr>";
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        for (let slot = 1; slot <= sc; slot++) {
            const tr = document.createElement("tr");
            const tds = [`<td>${slot}</td>`];
            for (const top of tops) {
                const c = stratSlotTopCounts.get(`${slot}|${top}`) || 0;
                const pct = effectiveRuns > 0 ? (c / effectiveRuns * 100) : 0;
                tds.push(`<td>${pct.toFixed(2)}% (${c.toLocaleString()})</td>`);
            }
            tr.innerHTML = tds.join("");
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        div.appendChild(table);
        resultsDiv.appendChild(div);
    })();

    // Visible Slot 1 — support_weapon Rate (what the user sees)
    (function renderVisibleSlot1SupportRate() {
        const div = document.createElement("div");
        div.innerHTML = `<h3>Visible Slot 1 — support_weapon Rate</h3>`;
        const table = document.createElement("table");
        const thead = document.createElement("thead");
        thead.innerHTML = "<tr><th>Metric</th><th>Value</th></tr>";
        table.appendChild(thead);
        const tbody = document.createElement("tbody");

        const total = visibleSlot1Total || 0;
        const hit = visibleSlot1Support || 0;
        const pct = total > 0 ? (hit / total * 100) : 0;

        const tr1 = document.createElement("tr");
        tr1.innerHTML = `<td>Runs</td><td>${total.toLocaleString()}</td>`;
        const tr2 = document.createElement("tr");
        tr2.innerHTML = `<td>support_weapon in visible Slot 1</td><td>${pct.toFixed(2)}% (${hit.toLocaleString()})</td>`;

        tbody.appendChild(tr1);
        tbody.appendChild(tr2);
        table.appendChild(tbody);
        div.appendChild(table);
        resultsDiv.appendChild(div);
    })();

    // Non-support Stratagem Picks — Top-Type Distribution (guaranteed support excluded; orderless)
    (function renderNonSupportTopType() {
        const div = document.createElement("div");
        div.innerHTML = `<h3>Non-support Stratagem Picks — Top-Type Distribution (guaranteed support excluded)</h3>
          <div style="margin-bottom:8px">
            Counts include only stratagem picks after removing <b>exactly one</b> <code>support_weapon</code> per run (the guaranteed one shown in Visible Slot 1). Slot order is ignored for this stat.
          </div>`;

        const expectedPerRun = Math.max(0, (rules.STRATAGEM_COUNT || 4) - 1);
        const expectedTotal = effectiveRuns * expectedPerRun;

        const table = document.createElement("table");
        const thead = document.createElement("thead");
        thead.innerHTML = "<tr><th>Top Type</th><th>Count</th><th>Percent</th></tr>";
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        const rows = ["Offensive", "Defensive", "Supply"].map(top => {
            const c = nonSupportTopCounts.get(top) || 0;
            const pct = (expectedTotal > 0) ? (c / expectedTotal * 100) : 0;
            return { top, c, pct };
        });

        for (const r of rows) {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${r.top}</td><td>${r.c.toLocaleString()}</td><td>${r.pct.toFixed(2)}%</td>`;
            tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        div.appendChild(table);

        const sanity = document.createElement("div");
        sanity.style.marginTop = "8px";
        sanity.innerHTML = `<div><b>Sanity:</b> expected non-support picks = ${expectedTotal.toLocaleString()} (runs × ${expectedPerRun}), counted = ${nonSupportPicksCount.toLocaleString()}, runs with 0 support_weapon = ${runsWithNoSupportWeapon.toLocaleString()}</div>`;
        div.appendChild(sanity);

        resultsDiv.appendChild(div);
    })();



    renderTopTable(resultsDiv, `Top Primaries (odds per run)`, topByKind("Primary", 1));
    renderTopTable(resultsDiv, `Top Secondaries (odds per run)`, topByKind("Secondary", 1));
    renderTopTable(resultsDiv, `Top Throwables (odds per run)`, topByKind("Throwable", 1));
    renderTopTable(resultsDiv, `Top Stratagems (odds per stratagem slot)`, topByKind("Stratagem", rules.STRATAGEM_COUNT));

    const itemRows = [["kind", "top", "sub", "id", "name", "count", "odds_percent", "src"]];
    for (const [key, count] of itemCounts.entries()) {
        const [kind, id] = key.split("|");
        const meta = itemMeta.get(key) || { top: "", sub: "", src: "" };
        const denom = effectiveRuns * (kind === "Stratagem" ? rules.STRATAGEM_COUNT : 1);
        itemRows.push([kind, meta.top, meta.sub, id, itemNames.get(key) || id, count, percent(count, denom).toFixed(6), meta.src]);
    }

    const tagRows = [["tag", "count", "avg_per_run"]];
    for (const [tag, count] of tagCounts.entries()) {
        tagRows.push([tag, count, (count / Math.max(1, effectiveRuns)).toFixed(6)]);
    }

    $("dlItemsBtn").disabled = false;
    $("dlTagsBtn").disabled = false;
    $("dlSlot1Btn").disabled = false;

    $("dlItemsBtn").onclick = () => downloadText(`hd2_audit_items_${faction}_${runs}.csv`, toCsv(itemRows));
    $("dlTagsBtn").onclick = () => downloadText(`hd2_audit_tags_${faction}_${runs}.csv`, toCsv(tagRows));
    $("dlSlot1Btn").onclick = () => {
        const rows = [];
        rows.push(["slot", "id", "name", "top", "sub", "count", "odds_percent"]);
        const entries = Array.from(stratSlot1Counts.entries()).map(([id, c]) => {
            const meta = stratSlot1Meta.get(id) || { id, name: id, top: "", sub: "" };
            const pct = effectiveRuns > 0 ? (c / effectiveRuns * 100) : 0;
            return { ...meta, count: c, odds_percent: pct };
        });
        entries.sort((a, b) => (b.odds_percent - a.odds_percent) || a.name.localeCompare(b.name));
        for (const e of entries) rows.push([1, e.id, e.name, e.top, e.sub, e.count, e.odds_percent.toFixed(6)]);
        downloadText(`hd2_audit_strat_slot1_${faction}_${runs}.csv`, toCsv(rows));
    };

    $("runBtn").disabled = false;
}

$("runBtn").addEventListener("click", () => runAudit().catch(err => {
    console.error(err);
    setStatus(err?.message || "Audit failed.");
    log(String(err?.stack || err));
    $("runBtn").disabled = false;
}));
