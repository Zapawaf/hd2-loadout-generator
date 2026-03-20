export const EXPENDABLE_THEME = {
  id: "expendable",
  label: "The Expendable",

  rules: {
    requireSupportWeapon: false,

    // Max number of carried / non-expendable "true" support weapons.
    // For this theme, set to 0 so the loadout stays focused on expendables only.
    maxCarriedSupportWeapons: 0,

    // Max number of expendable-tagged support weapons.
    // Increase or decrease this depending on how hard you want to force the theme.
    maxExpendableSupportWeapons: 4,

    // NOTE: Most expendable support weapons are also topType "Supply".
    // If this is lower than maxExpendableSupportWeapons, the Supply cap will block them.
    maxSupplyStratagems: 4,

    maxBackpackSlot: 1,
    maxVehicles: 1,
    preventDoubleExosuit: true,
    soloSiloCannotBeOnlySupport: false,
    enforceOneHandedIfRequired: true,

    // If true, expendables are allowed to satisfy a guaranteed support requirement.
    // This theme does not require support, so this mostly documents intended behavior.
    ALLOW_EXPENDABLE_AS_GUARANTEED_SUPPORT: true,

    allowFallback: true,
  },

  slotTheme: {
    primary:    { enabled: false, chance: 0 },
    secondary:  { enabled: false, chance: 0 },
    throwable:  { enabled: false, chance: 0 },
    stratagems: { enabled: true, chance: 100 },
  },

  requiredPools: {
    primaryIds: [],
    secondaryIds: [],
    throwableIds: [],
    stratagemIds: [
      "eat_17_expendable_anti_tank",
      "mls_4x_commando",
      "ms_11_solo_silo",
      "eat_411_leveller",
      "eat_700_expendable_napalm",
      "b_100_portable_hellbomb"
    ],
  },

  forcedFirstPick: null,
  forcedSecondPick: null,
  forcedThirdPick: null,
};