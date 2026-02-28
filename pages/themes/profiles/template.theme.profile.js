/**
 * template.theme.profile.js — HD2 Loadout Generator (Themed Profiles)
 *
 * PURPOSE
 * - COPY/PASTE starter for NEW THEME PROFILES.
 * - Matches your working Arc/Gas/Incendiary profiles:
 *     rules + slotTheme + forced picks + requiredPools + macro + fillPolicy
 *
 * HOW TO USE
 * 1) Copy this file next to your other theme profiles
 * 2) Rename it (e.g., "stun_stagger.profile.js" or "smoke.profile.js")
 * 3) Update: id, label, forced picks, and any macro tweaks you want
 *
 * NOTES
 * - tagsAny is OR logic: tagsAny: ["stun","stagger"] means "stun OR stagger"
 * - To guarantee BOTH, use two forced slots:
 *     forcedSecondPick: { tagsAny:["stun"] }
 *     forcedThirdPick:  { tagsAny:["stagger"] }
 */

export const TEMPLATE_THEME = {
  // ============================================================
  // IDENTITY
  // ============================================================
  id: "template",
  label: "Template",

  // ============================================================
  // RULES (STRUCTURE / VALIDATION)
  // ============================================================
  rules: {
    useEvenStratagemTop: true,
    maxSupportWeapons: 1,
    maxBackpackSlot: 1,
    maxSupplyStratagems: 2,
    preventDoubleExosuit: true,
    soloSiloCannotBeOnlySupport: true,
    enforceOneHandedIfRequired: true,
    ALLOW_EXPENDABLE_AS_GUARANTEED_SUPPORT: false,

    // If you later wire this rule into your picker:
    // preventMeleeSecondaryIfDefoliationTool: false,
  },

  // ============================================================
  // THEME APPLICATION PER SLOT
  // ============================================================
  // enabled: whether the slot participates in themed selection
  // chance:  percent chance that slot will TRY themed picks (fallback may occur)
  slotTheme: {
    primary:    { enabled: true, chance: 100 },
    secondary:  { enabled: true, chance: 100 },
    throwable:  { enabled: true, chance: 100 },
    stratagems: { enabled: true, chance: 100 },
  },

  // ============================================================
  // FORCED PICKS (GUARANTEES)
  // ============================================================
  // These are "at least one item matches..." guarantees.
  // tagsAny is OR logic.
  forcedFirstPick: {
    tagsAny: ["arc"],
  },

  // Example: guarantee stun OR stagger in the second forced slot
  forcedSecondPick: {
    tagsAny: ["stun", "stagger"],
  },

  // If you want BOTH stun AND stagger, do:
  // forcedSecondPick: { tagsAny: ["stun"] },
  // forcedThirdPick:  { tagsAny: ["stagger"] },
  forcedThirdPick: null,

  // ============================================================
  // REQUIRED POOLS (HARD INCLUDE BY ID)
  // ============================================================
  // If you put IDs here, the generator MUST include them.
  // Leave empty for normal themed behavior.
  requiredPools: {
    primaryIds:    [],
    secondaryIds:  [],
    throwableIds:  [],
    stratagemIds:  [],
  },

  // ============================================================
  // MACRO (POOL / CATEGORY WEIGHTS)
  // ============================================================
  // These default to 1.00 everywhere; tweak per-theme if desired.
  macro: {
    primarySubcategory: {
      "Assault Rifle": 1.00,
      "Submachine Gun": 1.00,
      "Shotgun": 1.00,
      "Marksmen Rifle": 1.00,
      "Energy-Based": 1.00,
      "Explosive": 1.00,
      "Special": 1.00,
    },
    secondarySubcategory: {
      "Pistol": 1.00,
      "Melee": 1.00,
      "Special": 1.00,
    },
    throwableSubcategory: {
      "Standard": 1.00,
      "Special": 1.00,
    },
    stratagemTop: {
      "Offensive": 1.00,
      "Defensive": 1.00,
      "Supply": 1.00,
    },
    offensiveSub: {
      "Eagle Airstrikes": 1.00,
      "Orbitals": 1.00,
    },
    defensiveSub: {
      "Sentries": 1.00,
      "Mines": 1.00,
      "Emplacements": 1.00,
    },
    supplySub: {
      "Weapons": 1.00,
      "Backpacks": 1.00,
      "Vehicles": 1.00,
    },
  },

  // ============================================================
  // FILL POLICY (DEGRADE LADDER / RETRIES)
  // ============================================================
  fillPolicy: {
    // mode:
    // - "degrade" = relax theme matching as needed to complete a valid loadout
    // - (only if you implemented it) "strict" = refuse if can't meet theme
    mode: "degrade",

    // how many attempts before giving up
    maxRetries: 200,

    // strict flags (if your degrade ladder supports them)
    strictEquipment: false,
    strictStratagems: false,
  },
};
