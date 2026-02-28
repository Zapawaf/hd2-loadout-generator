/**
 * Elemental: forces items with arc/incendiary/gas (any combo).
 * Strict: ONLY arc/incendiary/gas items should be eligible.
 */
export const ELEMENTAL_THEME = {
  id: "elemental",
  label: "Elemental",

  rules: {
    useEvenStratagemTop: true,
    maxSupportWeapons: 1,
    maxBackpackSlot: 1,
    maxSupplyStratagems: 2,
    preventDoubleExosuit: true,
    soloSiloCannotBeOnlySupport: true,
    enforceOneHandedIfRequired: true,
    ALLOW_EXPENDABLE_AS_GUARANTEED_SUPPORT: false,
  },

  slotTheme: {
    primary:    { enabled: true, chance: 100 },
    secondary:  { enabled: true, chance: 100 },
    throwable:  { enabled: true, chance: 100 },
    stratagems: { enabled: true, chance: 100 },
  },

  // Keep these as-is (they help bias early picks)
  forcedFirstPick:  { tagsAny: ["arc", "incendiary", "gas"] },
  forcedSecondPick: { tagsAny: ["arc", "incendiary", "gas"] },
  forcedThirdPick:  { tagsAny: ["arc", "incendiary", "gas"] },

  // ✅ The important part:
  // Merge-required pool filtering so ONLY elemental-tagged items are candidates.
  requiredPools: {
    primaryAny:   { tagsAny: ["arc", "incendiary", "gas"] },
    secondaryAny: { tagsAny: ["arc", "incendiary", "gas"] },
    throwableAny: { tagsAny: ["arc", "incendiary", "gas"] },
    stratagemAny: { tagsAny: ["arc", "incendiary", "gas"] },

    // Keep these for compatibility (not required but harmless)
    primaryIds:   [],
    secondaryIds: [],
    throwableIds: [],
    stratagemIds: [],
  },

  // Leave your macro/micro alone (not related to the bug)
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

  micro: {
    tag: {
      arc: 1.00,
      incendiary: 1.00,
      gas: 1.00,
    },
  },
};