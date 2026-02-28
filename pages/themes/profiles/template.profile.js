
// ============================================================
// EXCLUDES (TRUE BLACKLISTING)
// ============================================================
// These exclusions apply BEFORE theme filters and ALSO apply during fallback.
// Keys:
// - primaryIds / primaryTagsAny
// - secondaryIds / secondaryTagsAny
// - throwableIds / throwableTagsAny
// - stratagemIds / stratagemTagsAny
exclude: {
  primaryIds: [],
  primaryTagsAny: [],

  secondaryIds: [],
  secondaryTagsAny: [],

  throwableIds: [],
  throwableTagsAny: [],

  stratagemIds: [],
  stratagemTagsAny: [],
},

/**
 * template.profile.js — HD2 Loadout Generator
 *
 * Copy this file, rename it (e.g., "my_custom.profile.js"), then:
 *   1) Edit the knobs below
 *   2) Add an import + switch-case entry in:
 *        /pages/randomizer/profiles/index.js
 *
 * How weights combine (high level):
 *   - Macro weights bias WHICH subcategory/top-type gets picked
 *   - Micro weights bias WHICH item inside the pool gets picked
 *   - Scoped micro (micro.pools.*) lets you override micro weights per pool
 *
 * Effective item weight (simplified):
 *   weight =
 *     macro (top/subcategory) *
 *     micro.tag (for each tag the item has) *
 *     micro.id (if present) *
 *     micro.pools[pool].tag (per-tag overrides for that pool) *
 *     micro.pools[pool].id  (per-id overrides for that pool) *
 *     micro.pools[pool].categories (optional per-category overrides)
 *
 * Notes:
 * - Unknown tags default to 1.00 in the picker (recommended).
 * - Keep weights > 0.  Use 0.01 instead of 0 to "almost never pick" something.
 */

export default {
  name: "Template (Copy Me)",

  // ============================================================
  // RULES (STRUCTURE / VALIDATION)
  // ============================================================
  rules: {
    // If true, non-guaranteed strat slots try to be 33/33/33 across:
    // Offensive / Defensive / Supply (using macro.stratagemTop).
    useEvenStratagemTop: true,

    // Core constraints:
    maxSupportWeapons: 1,         // max stratagems with tag `support_weapon`
    maxBackpackSlot: 1,           // max stratagems with tag `uses_backpack_slot`
    maxSupplyStratagems: 2,       // prevent 3–4 Supply rolls (unless Chaos Mode later)
    preventDoubleExosuit: true,   // don't roll both Exosuits in same loadout
    soloSiloCannotBeOnlySupport: true, // MS-11 Solo Silo cannot be the only support option

    // If any stratagem has requires_one_handed_primary, force one-handed primary
    enforceOneHandedIfRequired: true,

    // If true, an "expendable-only" stratagem can satisfy the guaranteed support slot
    // WITHOUT needing the `support_weapon` tag (your code supports this toggle).
    ALLOW_EXPENDABLE_AS_GUARANTEED_SUPPORT: false,

    // (Optional future rule you mentioned)
    // If you implement it: when a stratagem is tagged `defoliation_tool`,
    // prevent melee secondaries from being selected.
    // preventMeleeSecondaryIfDefoliationTool: false,
  },

  // ============================================================
  // MACRO (POOL / CATEGORY WEIGHTS)
  // ============================================================
  macro: {
    // Equipment subcategory weights
    primarySubcategory: {
      "Assault Rifle": 1.00,
      "Submachine Gun": 1.00,
      Shotgun: 1.00,
      "Marksmen Rifle": 1.00,
      "Energy-Based": 1.00,
      Explosive: 1.00,
      Special: 1.00,

      // Example: make Marksman rarer
      // "Marksmen Rifle": 0.70,
    },

    secondarySubcategory: {
      Pistol: 1.00,
      Melee: 1.00,
      Special: 1.00,

      // Example: heavily discourage melee secondaries
      // Melee: 0.35,
    },

    throwableSubcategory: {
      Standard: 1.00,
      Special: 1.00,
    },

    // Stratagem TOP-TYPE weights (used for non-guaranteed slots)
    stratagemTop: {
      Offensive: 1.00,
      Defensive: 1.00,
      Supply: 1.00,

      // Example: less Supply overall (common tuning request)
      // Supply: 0.60,
    },

    // Stratagem SUBCATEGORY weights (within each top-type)
    offensiveSub: {
      "Eagle Airstrikes": 1.00,
      Orbitals: 1.00,
      // Example: favor orbitals for bots
      // Orbitals: 1.25,
    },

    defensiveSub: {
      Sentries: 1.00,
      Mines: 1.00,
      Emplacements: 1.00,
      // Example: discourage mines a bit
      // Mines: 0.75,
    },

    supplySub: {
      Weapons: 1.00,
      Backpacks: 1.00,
      Vehicles: 1.00,
      // Example: keep Exos rare but not impossible
      // Vehicles: 0.35,
    },
  },

  // ============================================================
  // MICRO (ITEM / TAG WEIGHTS)
  // ============================================================
  micro: {
    // Global tag weights (apply in every pool unless overridden below)
    tag: {
      // crowd / control
      horde_control: 1.00,
      stun: 1.00,
      ems: 1.00,
      stagger: 1.00,

      // aiming / guidance
      guided: 1.00,

      // damage / pen
      light_pen: 1.00,
      medium_pen: 1.00,
      heavy_pen: 1.00,
      anti_tank: 1.00,

      // objectives
      demo: 1.00,
      bug_hole: 1.00,

      // elements / themes
      incendiary: 1.00,
      gas: 1.00,
      smoke: 1.00,
      stealth: 1.00,
      arc: 1.00,

      // general descriptors
      energy_based: 1.00,
      explosive: 1.00,
      expendable: 1.00,

      // stratagem meta tags (used for top/sub labeling and rules)
      offensive: 1.00,
      defensive: 1.00,
      supply: 1.00,
      sentry: 1.00,
      mine: 1.00,
      emplacement: 1.00,

      // rule tags
      support_weapon: 1.00,
      uses_backpack_slot: 1.00,
      requires_one_handed_primary: 1.00,

      // Example: buff demo, counter-buff exos by debuffing vehicles in macro OR id here
      // demo: 1.30,
    },

    // Global per-ID overrides (use sparingly; scoped is cleaner)
    id: {
      // Exact match the JSON item's "id"
      // Example: make one item slightly rarer everywhere
      // "patriot_exosuit": 0.70,
      example_item_id_here: 1.00,
    },

    /**
     * Scoped micro weights
     * These ONLY apply inside the specific pool, and multiply with global micro.
     *
     * Pools available:
     *   - primaries
     *   - secondaries
     *   - throwables
     *   - stratagems
     */
    pools: {
      primaries: {
        // Example: make one-handed primaries more common (only in primaries)
        tag: {
          // one_handed: 1.15,
        },
        id: {
          // "plas_1_scorcher": 0.90,
        },

        /**
         * Optional: category overrides by subcategory name (strings MUST match your data category names)
         * For primaries, these match folder/category names like:
         *   "Assault Rifle", "Shotgun", "Energy-Based", ...
         */
        categories: {
          // "Energy-Based": 1.10,
        },
      },

      secondaries: {
        tag: {
          // Example: discourage melee only in secondaries (instead of global)
          // melee: 0.50,  // only if your secondary items carry a "melee" tag
        },
        id: {},
        categories: {
          // "Melee": 0.50, // if you prefer category-level control
        },
      },

      throwables: {
        tag: {
          // Example: slightly favor anything tagged gas in throwables
          // gas: 1.25,
        },
        id: {},
        categories: {
          // "Special": 1.10,
        },
      },

      stratagems: {
        tag: {
          // Example: bots tuning (more demo)
          // demo: 1.15,
          // medium_pen: 1.10,
        },
        id: {
          // Example: counter demo buff by reducing a specific exosuit without scoped-level work
          // "patriot_exosuit": 0.70,
        },

        /**
         * Optional: category overrides
         * Common keys you may use (depending on how your picker labels categories):
         *   Top types: "Offensive", "Defensive", "Supply"
         *   Subs:      "Orbitals", "Eagle Airstrikes", "Sentries", "Mines", "Emplacements",
         *             "Weapons", "Backpacks", "Vehicles"
         *
         * If you’re not sure the exact string key, keep this empty and tune via macro first.
         */
        categories: {
          // "Orbitals": 1.10,
          // "Vehicles": 0.70,
        },
      },
    },
  },
};
