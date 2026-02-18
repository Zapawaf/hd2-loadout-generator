export default {
  name: "Terminids",

  /* Can be used edit default rules
  rules: {
    // Turn on �even top-type selection� for stratagem slots (33/33/33 baseline)
    useEvenStratagemTop: true,
    maxSupportWeapons: 1,
    maxBackpackSlot: 1,
    maxSupplyStratagems: 2,
    preventDoubleExosuit: true,
    soloSiloCannotBeOnlySupport: true,
    enforceOneHandedIfRequired: true,
    ALLOW_EXPENDABLE_AS_GUARANTEED_SUPPORT: false,
  },
  */

  macro: {
    primarySubcategory: {
      "Assault Rifle": 1.00,
      "Submachine Gun": 1.00,
      Shotgun: 0.90,
      "Marksmen Rifle": 0.60,
      "Energy-Based": 1.00,
      Explosive: 1.00,
      Special: 1.00,
    },
    secondarySubcategory: {
      Pistol: 1.00,
      Melee: 1.00,
      Special: 1.00,
    },
    throwableSubcategory: {
      Standard: 1.00,
      Special: 1.00,
    },
    stratagemTop: {
      Offensive: 1.00,
      Defensive: 0.70,
      Supply: 0.40,
    },
    offensiveSub: {
      "Eagle Airstrikes": 1.20,
      Orbitals: 1.20,
    },
    defensiveSub: {
      Sentries: 1.00,
      Mines: 0.80,
      Emplacements: 0.40,
    },
    supplySub: {
      Weapons: 1.00,
      Backpacks: 0.80,
      Vehicles: 0.40,
    },
  },
  micro: {
    tag: {
      horde_control: 1.20,
      stun: 1.00,
      ems: 1.00,
      guided: 1.00,
      heavy_pen: 1.00,
      anti_tank: 1.00,
      demo: 1.00,
      bug_hole: 1.40,
      incendiary: 1.00,
      smoke: 1.00,
      gas: 1.00,
      stealth: 1.00,
      stagger: 1.00,
      arc: 1.00,
      energy_based: 1.00,
      explosive: 1.00,
      expendable: 1.00,
      defensive: 1.00,
      offensive: 1.00,
      supply: 1.00,
      sentry: 1.00,
      mine: 1.00,
      emplacement: 1.00,
      support_weapon: 1.00,
      uses_backpack_slot: 1.00,
      requires_one_handed_primary: 1.00,
      medium_pen: 1.00,
      light_pen: 1.00,
    },
    id: {
      example_item_id_here: 1.00,
    },
    pools: {
      primaries: {
        tag: {},
        id: {},
        categories: {},
      },
      secondaries: {
        tag: {},
        id: {},
        categories: {},
      },
      throwables: {
        tag: {},
        id: {},
        categories: {},
      },
      stratagems: {
        tag: {},
        id: {},
        categories: {},
      },
    },
  },
};
