// medic_pacifist.profile.js
// Theme: Medic (Pacifist)
//
// Spec (from your notes):
// - Primary: SG-20 Halt
// - Secondary: P-11 Stim Pistol
// - Throwable: G/SH-39 Shield
// - Stratagems: Eagle Smoke Strike, Orbital Smoke Strike,
//   (Supply Pack OR Shield Generator Pack), Shield Generator Relay, EMS Mortar
//
// NOTE: This theme intentionally does NOT require a support weapon.

export const MEDIC_PACIFIST_PROFILE = {
  id: "medic_pacifist",
  label: "Medic (Pacifist)",

  slotTheme: {
    primary:   { enabled: true, chance: 100 },
    secondary: { enabled: true, chance: 100 },
    throwable: { enabled: true, chance: 100 },
    stratagems:{ enabled: true, chance: 100 },
  },

  requiredPools: {
    primaryIds:   ["sg_20_halt"],
    secondaryIds: ["p_11_stim_pistol"],
    throwableIds: ["g_sh_39_shield"],

    // We list 5 IDs so the engine can pick 4 uniques.
    stratagemIds: [
      "eagle_smoke_strike",
      "orbital_smoke_strike",
      "b_1_supply_pack",
      "sh_32_shield_generator_pack",
      "fx_12_shield_generator_relay",
      "a_m_23_ems_mortar_sentry"
    ],
  },

  rules: {
    // No support-weapon requirement for this theme
    requireSupportWeapon: false,
    maxSupportWeapons: 0,

    // Keep the other constraints sane
    maxBackpackSlot: 1,
    maxSupplyStratagems: 4,   // allow Supply-heavy (packs + etc)
    preventDoubleExosuit: true,
    soloSiloCannotBeOnlySupport: false,
    enforceOneHandedIfRequired: true,
  },

  macro: {
    // Strongly favor Supply/Defensive for this theme
    stratagemTop: { Supply: 1.0, Defensive: 1.0, Offensive: 0.5 },
  },

  fillPolicy: {
    mode: "degrade",
    maxRetries: 250,
    strictEquipment: false,
    strictStratagems: false,
  },
};
