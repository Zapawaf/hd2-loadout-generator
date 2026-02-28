// medic_support.profile.js
// Theme: Medic (Support)
//
// Spec:
// - Any Primary
// - Secondary: P-11 Stim Pistol
// - Throwable: Shield or Smoke
// - Stratagems: Eagle Smoke, Orbital Smoke, Supply Pack, Shield Relay, EMS Mortar
// - No support-weapon requirement.

export const MEDIC_SUPPORT_PROFILE = {
  id: "support",
  label: "Support",

  slotTheme: {
    primary:   { enabled: true, chance: 100 },
    secondary: { enabled: true, chance: 100 },
    throwable: { enabled: true, chance: 100 },
    stratagems:{ enabled: true, chance: 100 },
  },

  // Prefer smoke/shield throwables, fall back to anything if none
  forcedFirstPick:  { tagsAny: ["smoke", "shield"] },
  forcedSecondPick: { tagsAny: ["stealth", "self_defense"] },

  requiredPools: {
  // Secondary: Stim Pistol
  secondaryIds: ["p_11_stim_pistol"],

  // Throwable: prefer Shield or Smoke types (falls back if none match)
  throwableAny: { tagsAny: ["shield", "smoke"] },

  // Stratagems: the "support kit" set — plenty of uniques to fill 4 slots
  stratagemIds: [
    "eagle_smoke_strike",
    "orbital_smoke_strike",
    "b_1_supply_pack",
    "sh_32_shield_generator_pack",
    "fx_12_shield_generator_relay",
    "a_m_23_ems_mortar_sentry",
    "m_102_fast_recon_vehicle",
    "td_220_bastion_mk_xvi"

  ],

  // If you want to allow other defensive/support strats as backups, keep this:
  stratagemAny: { tagsAny: ["defensive", "ems", "smoke", "support"] },
},


  rules: {
    requireSupportWeapon: false,
    maxSupportWeapons: 0,
    maxVehicles: 1,
    maxBackpackSlot: 1,
    maxSupplyStratagems: 4,
    preventDoubleExosuit: true,
    soloSiloCannotBeOnlySupport: false,
    enforceOneHandedIfRequired: true,
  },

  macro: {
    stratagemTop: { Supply: 0.85, Defensive: 1.0, Offensive: 0.5 },
      supplySub: { Vehicles: 0.4 }  // reduce frequency
  },

  fillPolicy: {
    mode: "degrade",
    maxRetries: 250,
    strictEquipment: false,
    strictStratagems: false,
  },
};
