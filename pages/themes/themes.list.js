// pages/themes/themes.list.js

import { ARC_THEME } from "./profiles/arc.profile.js";
import { GAS_THEME } from "./profiles/gas.profile.js";
import { INCENDIARY_THEME } from "./profiles/incendiary.profile.js";

import { ELEMENTAL_THEME } from "./profiles/elemental.profile.js";
import { EXPENDABLE_THEME } from "./profiles/expendable.profile.js";
import { GUIDED_LOCKON_THEME } from "./profiles/guided_lockon.profile.js";

import { MEDIC_PACIFIST_PROFILE } from "./profiles/medic_pacifist.profile.js";
import { MEDIC_SUPPORT_PROFILE } from "./profiles/support.profile.js"; // file name is support.profile.js in your upload
import { MELEE_THEME } from "./profiles/melee.profile.js";
import { STEALTH_THEME } from "./profiles/stealth.profile.js";

// Named export is required by themes.js in your setup:
export const THEMES = [
    ARC_THEME,
    GAS_THEME,
    INCENDIARY_THEME,

    ELEMENTAL_THEME,
    EXPENDABLE_THEME,
    GUIDED_LOCKON_THEME,

    MEDIC_PACIFIST_PROFILE,
    MEDIC_SUPPORT_PROFILE,
    MELEE_THEME,
    STEALTH_THEME,
];