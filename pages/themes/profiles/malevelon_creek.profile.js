export const MALEVELON_CREEK_THEME = {
  id: "malevelon_creek",
  label: "Malevelon Creek",

  fillPolicy: {
    // Never fall back outside approved lists
    strictRequiredPools: true,
  },

  // Fill these with your approved IDs (strict mode will fail if left empty)
  requiredPools: {
    primaryIds: [],
    secondaryIds: [],
    throwableIds: [],
    stratagemIds: [],
  },

  slotTheme: {
    primary:   { enabled: true, chance: 100 },
    secondary: { enabled: true, chance: 100 },
    throwable: { enabled: true, chance: 100 },
    stratagems:{ enabled: true, chance: 100 },
  },

  rules: {
    requireSupportWeapon: true,
    maxSupplyStratagems: 2,
  },
};
