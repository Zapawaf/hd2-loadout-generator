export default {
  name: "Base (Shared)",

  // Can be used edit default rules
  rules: {
    // Turn on ?even top-type selection? for stratagem slots (33/33/33 baseline)
    useEvenStratagemTop: true,
    maxSupportWeapons: 1,
    maxBackpackSlot: 1,
    maxSupplyStratagems: 2,
    preventDoubleExosuit: true,
    soloSiloCannotBeOnlySupport: true,
    enforceOneHandedIfRequired: true,
    ALLOW_EXPENDABLE_AS_GUARANTEED_SUPPORT: false,
  },
  
  macro: {
    // Equipment
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

    // Stratagems
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
    // Tag weights: unknown tags default to 1.00 in the picker (recommended),
    // but listing common ones here makes the knobs visible.
    tag: {
      horde_control: 1.00,
      stun: 1.00,
      ems: 1.00,
      guided: 1.00,
      heavy_pen: 1.00,
      anti_tank: 1.00,
      demo: 1.00,
      bug_hole: 1.00,
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
    },

    id: {
      // per-item overrides (none active)
    },


    // ============================================================
    // SCOPED MICRO (optional)
    //
    // Lets you bias tags/ids ONLY within a specific pool and/or subcategory.
    // Resolution order for a given tag/id (first match wins):
    // 1) micro.pools.<pool>.categories["<Subcategory>"].tag / .id
    // 2) micro.pools.<pool>.tag / .id
    // 3) micro.tag / micro.id (global fallback)
    //
    // Pools:
    // - primaries, secondaries, throwables, stratagems
    //
    // Stratagem category keys support:
    // - "Top/Sub" (e.g., "Offensive/Orbitals", "Supply/Backpacks")
    // - "Sub" only (e.g., "Orbitals")
    // - "Top" only (e.g., "Offensive")
    // ============================================================
    pools: {

      primaries: {
        tag: {
          // Example: medium_pen: 1.10
        },
        id: {
          // Example: "ar_23_liberator": 0.90
        },
        categories: {

          "Assault Rifle": {
            tag: {},
            id: {}
          },

          "Submachine Gun": {
            tag: {},
            id: {}
          },

          "Shotgun": {
            tag: {},
            id: {}
          },

          "Marksmen Rifle": {
            tag: {},
            id: {}
          },

          "Energy-Based": {
            tag: {},
            id: {}
          },

          "Explosive": {
            tag: {},
            id: {}
          },

          "Special": {
            tag: {},
            id: {}
          }

        }
      },

      secondaries: {
        tag: {},
        id: {},
        categories: {

          "Pistol": {
            tag: {},
            id: {}
          },

          "Melee": {
            tag: {},
            id: {}
          },

          "Special": {
            tag: {},
            id: {}
          }

        }
      },

      throwables: {
        tag: {},
        id: {},
        categories: {

          "Standard": {
            tag: {},
            id: {}
          },

          "Special": {
            tag: {},
            id: {}
          }

        }
      },

      stratagems: {
        tag: {},
        id: {},
        categories: {

          // Offensive
          "Offensive/Eagle Airstrikes": {
            tag: {},
            id: {}
          },

          "Offensive/Orbitals": {
            tag: {},
            id: {}
          },

          // Defensive
          "Defensive/Sentries": {
            tag: {},
            id: {}
          },

          "Defensive/Mines": {
            tag: {},
            id: {}
          },

          "Defensive/Emplacements": {
            tag: {},
            id: {}
          },

          // Supply
          "Supply/Weapons": {
            tag: {},
            id: {}
          },

          "Supply/Backpacks": {
            tag: {},
            id: {}
          },

          "Supply/Vehicles": {
            tag: {},
            id: {}
          }

        }
      }

    },

  },
};
