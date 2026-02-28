export const EXPENDABLE_THEME = {
  id: "expendable",
  label: "The Expendable",

  rules: {
    requireSupportWeapon: false,
    maxSupportWeapons: 4,
    maxSupplyStratagems: 4,
  },

  slotTheme: {
    primary:   { enabled: false, chance: 0 },
    secondary: { enabled: false, chance: 0 },
    throwable: { enabled: false, chance: 0 },
    stratagems:{ enabled: true, chance: 100 },
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
      "eat_700_expendable_napalm"
    ],
  },

  forcedFirstPick: null,
  forcedSecondPick: null,
  forcedThirdPick: null,
};
