export const MELEE_THEME = {
  id: "melee",
  label: "Melee",

  // Goal:
  // - Secondary MUST be melee (if any exist in owned pool)
  // - Guaranteed support should be a melee support weapon (Defoliation / One True Flag / Breaching Hammer)
  // - Remaining stratagems should come ONLY from the allowed pool (smoke + mobility packs + a few allowed utilities)
  //
  // This profile uses a STRATAGEM ID WHITELIST so the theme cannot wander into Cluster Bomb / Guard Dogs / Exos / Vehicles.

  rules: {
    requireSupportWeapon: true,
    maxCarriedSupportWeapons: 1,
    maxExpendableSupportWeapons: 1,  // max expendable-tagged support weapons, must increase maxSupplyStratagems
    maxBackpackSlot: 1,
    maxSupplyStratagems: 2,
    maxVehicles: 1,
    preventDoubleExosuit: true,
    soloSiloCannotBeOnlySupport: true,
    enforceOneHandedIfRequired: false,
    ALLOW_EXPENDABLE_AS_GUARANTEED_SUPPORT: false,
    allowFallback: true,
  },


  slotTheme: {
    primary:    { enabled: true,  chance: 100 }, // melee theme doesn't constrain primary
    secondary:  { enabled: true,  chance: 100 }, // MUST be melee when possible
    throwable:  { enabled: true,  chance: 100 }, // not constrained
    stratagems: { enabled: true,  chance: 100 }
  },

  // Force the first themed stratagem pick toward melee-tagged support weapons
  forcedFirstPick: { tagsAny: ["melee"] },

  requiredPools: {
      // Must be a melee secondary every time (if you have melee-tagged secondaries in the pool)
    primaryAny: { tagsAny: ["melee"] },
    secondaryAny: { tagsAny: ["melee"] },
    throwableAny: { tagsAny: ["melee", "stun", "smoke"] },
    throwableIds: ["tm_1_lure_mine"],

    // Stratagem whitelist (ONLY these are allowed for this theme)
    stratagemIds: [
      // Melee support weapons (guaranteed support should come from these via forcedFirstPick)
      "cqc_9_defoliation_tool",
      "cqc_1_one_true_flag",
      "cqc_20_breaching_hammer",

      // Smoke (only 2)
      "eagle_smoke_strike",
      "orbital_smoke_strike",

      // Mobility packs (exclude vehicle by not listing it)
      "lift_182_warp_pack",
      "lift_850_jump_pack",
      "lift_860_hover_pack",

      // Allowed utility / objective tools
      "b_100_portable_hellbomb",
      "ms_11_solo_silo",

      // Optional: shields / sustain (still backpacks; maxBackpackSlot=1)
      "sh_32_shield_generator_pack",
      "sh_20_ballistic_shield_backpack",
      "sh_51_directional_shield",
      "b_1_supply_pack"
    ]
  }
};
