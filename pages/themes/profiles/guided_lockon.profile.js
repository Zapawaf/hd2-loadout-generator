export const GUIDED_LOCKON_THEME = {
  id: "guided_lockon",
  label: "Guided / Lock-On",

  rules: {
    useEvenStratagemTop: true,
    maxSupportWeapons: 1,
    maxBackpackSlot: 1,
    maxSupplyStratagems: 2,
    preventDoubleExosuit: true,
    soloSiloCannotBeOnlySupport: true,
    enforceOneHandedIfRequired: true,
    ALLOW_EXPENDABLE_AS_GUARANTEED_SUPPORT: false,

    // Optional: if your themes.js supports this, let Solo Silo NOT count toward supply cap:
    // supplyExemptIds: ["ms_11_solo_silo"],
  },

  slotTheme: {
    primary:   { enabled: true, chance: 100 },
    secondary: { enabled: true, chance: 100 },
    throwable: { enabled: true, chance: 100 },
    stratagems:{ enabled: true, chance: 100 },
  },

  // Stratagem ladder:
  // First try to force one of these IDs (this affects guaranteed support too, if your themes.js does that).
  forcedFirstPick: {
    idsAny: ["faf_14_spear", "sta_x3_w_a_s_p_launcher"],
  },

  // If none of those are available/valid, bias toward guided-tagged things
  forcedSecondPick: {
    tagsAny: ["guided"],
  },

  forcedThirdPick: null,

  requiredPools: {
  // Force the exact Guided kit you described
  primaryIds:   ["jar_5_dominator"],
  secondaryIds: ["p_92_warrant"],
  throwableIds: ["g_50_seeker"],

  // Limit stratagems to the guided/lock-on set:
  // - Support weapon must be Spear or W.A.S.P.
  // - The remaining picks come from your preferred orbitals/eagle/sentry list
  stratagemIds: [
    "faf_14_spear",
    "sta_x3_w_a_s_p_launcher",
    "mls_4x_commando",

    "orbital_railcannon_strike",
    "orbital_precision_strike",
    "orbital_laser",

    "a_mls_4x_rocket_sentry",
    "eagle_110mm_rocket_pods",
  ],
},

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
      "Supply": 0.20,
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

    fillPolicy: {
    mode: "degrade",
    maxRetries: 250,
    strictEquipment: true,
    strictStratagems: true,
  },
};
