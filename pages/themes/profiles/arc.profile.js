export const ARC_THEME = {
  id: "arc",
  label: "Arc",
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
    primary:   { enabled: true, chance: 100 },
    secondary: { enabled: true, chance: 100 },
    throwable: { enabled: true, chance: 100 },
    stratagems:{ enabled: true, chance: 100 },
  },
  forcedFirstPick:  { tagsAny: ["arc", "ems", "stun"] },
  forcedSecondPick: { tagsAny: ["arc", "ems", "stun"] },
  forcedThirdPick:  { tagsAny: ["arc", "ems", "stun", "stagger"] },
  requiredPools: {
    primaryIds:    [],
    secondaryIds:  [],
    throwableIds:  [],
    stratagemIds:  [],
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
  fillPolicy: {
    mode: "degrade",
    maxRetries: 200,
    strictEquipment: false,
    strictStratagems: false,
  },
};
