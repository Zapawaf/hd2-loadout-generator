import base from "./base.shared.js";
import random from "./random.profile.js";
import automatons from "./automatons.profile.js";
import terminids from "./terminids.profile.js";
import illuminate from "./illuminate.profile.js";

// Deep merge helper (plain objects only, safe for your config shapes)
function deepMerge(a, b) {
  const out = Array.isArray(a) ? [...a] : { ...(a || {}) };
  for (const [k, v] of Object.entries(b || {})) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// Dev-only-ish schema checks. Doesn't throw; only warns.
function assertProfileShape(profile) {
  const requiredMacroKeys = [
    "primarySubcategory",
    "secondarySubcategory",
    "throwableSubcategory",
    "stratagemTop",
    "offensiveSub",
    "defensiveSub",
    "supplySub",
  ];

  if (!profile || typeof profile !== "object") {
    console.warn("Profile is not an object:", profile);
    return;
  }

  if (!profile.macro || typeof profile.macro !== "object") {
    console.warn("Profile missing macro object:", profile);
    return;
  }

  for (const k of requiredMacroKeys) {
    if (!(k in profile.macro)) {
      console.warn(`Profile missing macro.${k} (${profile.name || "unnamed"})`);
    }
  }

  if (!profile.micro || typeof profile.micro !== "object") {
    console.warn(`Profile missing micro object (${profile.name || "unnamed"})`);
    return;
  }

  if (!("tag" in profile.micro)) {
    console.warn(`Profile missing micro.tag (${profile.name || "unnamed"})`);
  }
  if (!("id" in profile.micro)) {
    console.warn(`Profile missing micro.id (${profile.name || "unnamed"})`);
  }
}

export function getProfile(profileName) {
  const key = (profileName || "random").toLowerCase();
  let merged;

  switch (key) {
    case "automaton":
    case "automatons":
    case "bots":
      merged = deepMerge(base, automatons);
      break;

    case "terminid":
    case "terminids":
    case "bugs":
      merged = deepMerge(base, terminids);
      break;

    case "illuminate":
    case "squids":
      merged = deepMerge(base, illuminate);
      break;

    case "random":
    case "none":
    case "base":
    default:
      merged = deepMerge(base, random);
      break;
  }

  assertProfileShape(merged);
  return merged;
}
