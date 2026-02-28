export const STEALTH_THEME = {
  id: "stealth",
  label: "Stealth",

  rules: {
    requireSupportWeapon: true,
    maxSupportWeapons: 1,
    maxBackpackSlot: 1,
    maxSupplyStratagems: 2,
    maxVehicles: 1,
    preventDoubleExosuit: true,
    soloSiloCannotBeOnlySupport: true,
    enforceOneHandedIfRequired: true,
    ALLOW_EXPENDABLE_AS_GUARANTEED_SUPPORT: false,
    allowFallback: true,
  },

  // ✅ CLOSES PROPERLY
  exclude: {
    stratagemTagsAny: ["emplacement", "vehicle"],
    stratagemIds: [],

    primaryTagsAny: [],
    primaryIds: [],

    secondaryTagsAny: [],
    secondaryIds: [],

    throwableTagsAny: [],
    throwableIds: [],
  },

  slotTheme: {
    primary:    { enabled: true, chance: 100 },
    secondary:  { enabled: true, chance: 100 },
    throwable:  { enabled: true, chance: 100 },
    stratagems: { enabled: true, chance: 100 },
  },

  forcedFirstPick:  { tagsAny: [] },
  forcedSecondPick: { tagsAny: [] },
  forcedThirdPick:  { tagsAny: [] },

  requiredPools: {
    primaryAny:   { tagsAny: ["stealth"] },
    secondaryAny: { tagsAny: ["stealth", "melee"] },
    throwableAny: { tagsAny: ["stealth", "stun", "shield"] },

    stratagemIds: [
      "eagle_smoke_strike",
      "orbital_smoke_strike",
      "apw_1_anti_materiel_rifle",
      "cqc_1_one_true_flag",
      "cqc_9_defoliation_tool",
      "b_md_c4_pack",
      "ms_11_solo_silo",
      "lift_182_warp_pack",
      "lift_850_jump_pack",
      "lift_860_hover_pack",
      "b_1_supply_pack"
    ],

    stratagemAny: { tagsAny: ["defensive", "ems"] },
  },

  macro: {
    stratagemTop: {
      Offensive: 1.00,
      Defensive: 1.00,
      Supply: 1.00,
    },
  },

  micro: {
    tag: {
      stealth: 1.00,
      smoke: 1.00,
    },
    id: {},
    pools: {
      primaries:   { tag: {}, id: {}, categories: {} },
      secondaries: { tag: {}, id: {}, categories: {} },
      throwables:  { tag: {}, id: {}, categories: {} },
      stratagems:  { tag: {}, id: {}, categories: {} },
    },
  },

  fillPolicy: {
    mode: "degrade",
    maxRetries: 250,
    strictEquipment: false,
    strictStratagems: false,
  },
};