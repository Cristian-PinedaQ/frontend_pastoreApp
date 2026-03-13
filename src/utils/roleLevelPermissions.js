// config/roleLevelPermissions.js
export const FULL_ACCESS_ROLES = ["ROLE_PASTORES", "ROLE_ECONOMICO"];

export const ROLE_LEVEL_MAP = {
  ROLE_CONEXION: ["PREENCUENTRO"],
  ROLE_CIMIENTO: ["ENCUENTRO", "POST_ENCUENTRO", "BAUTIZOS"],
  ROLE_ESENCIA: [
    "ESENCIA_1",
    "ESENCIA_2",
    "ESENCIA_3",
    "SANIDAD_INTEGRAL_RAICES",
    "ESENCIA_4",
    "ADIESTRAMIENTO",
    "GRADUACION",
  ],
};

// Helper function para usar en cualquier componente
export const filterLevelsByRole = (userRoles, allLevels) => {
  const normalized = userRoles.map((r) =>
    typeof r === "object" && r.name ? r.name.toUpperCase() : String(r).toUpperCase()
  );

  if (normalized.some((r) => FULL_ACCESS_ROLES.includes(r))) {
    return allLevels;
  }

  const allowedCodes = new Set();
  
  normalized.forEach((role) => {
    const matchingRole = Object.keys(ROLE_LEVEL_MAP).find(
      r => r.toUpperCase() === role || r === role
    );
    
    if (matchingRole) {
      ROLE_LEVEL_MAP[matchingRole].forEach(code => allowedCodes.add(code));
    }
  });

  return allLevels.filter((level) => allowedCodes.has(level.code));
};