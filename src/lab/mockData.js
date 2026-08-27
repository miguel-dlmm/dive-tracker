// Laboratorio visual — datos 100% inventados, sin relación con Supabase.
// Ninguna pantalla de src/lab/ importa useSupabaseTable, supabaseClient ni
// useSession: esto es una maqueta desconectada, pensada solo para comparar
// dirección visual. Ver src/lab/README.md para el resto de garantías de
// aislamiento.

export const mockSchools = [
  { name: "Blue Reef Diving", color: "#0F766E" },
  { name: "Atlantis Freedive", color: "#C2542F" },
];

export const mockActivities = [
  { name: "Bautismo", color: "#0D9488" },
  { name: "Curso Open Water", color: "#B45309" },
  { name: "Inmersión guiada", color: "#15803D" },
];

export const mockCurrency = { code: "EUR", symbol: "€" };

export const mockWorklog = [
  { id: "w1", date: "2026-08-25", school: "Blue Reef Diving", activity: "Curso Open Water", amount: 180, status: "Pagado" },
  { id: "w2", date: "2026-08-24", school: "Atlantis Freedive", activity: "Bautismo", amount: 65, status: "Pagado" },
  { id: "w3", date: "2026-08-23", school: "Blue Reef Diving", activity: "Inmersión guiada", amount: 90, status: "Pendiente" },
  { id: "w4", date: "2026-08-21", school: "Blue Reef Diving", activity: "Curso Open Water", amount: 180, status: "Pagado" },
  { id: "w5", date: "2026-08-19", school: "Atlantis Freedive", activity: "Bautismo", amount: 65, status: "Pendiente" },
];

export const mockComisiones = [
  { id: "c1", date: "2026-08-24", school: "Atlantis Freedive", client: "T. Alonso", amount: 24, status: "Pendiente" },
  { id: "c2", date: "2026-08-20", school: "Blue Reef Diving", client: "M. Ferreira", amount: 18, status: "Pagado" },
  { id: "c3", date: "2026-08-14", school: "Atlantis Freedive", client: "J. Nieto", amount: 30, status: "Pendiente" },
];

export const mockPayments = [
  { id: "p1", date: "2026-08-22", colleague: "Sara V.", concept: "Cobertura sábado", amount: 50, status: "Pendiente" },
  { id: "p2", date: "2026-08-16", colleague: "Iker L.", concept: "Cobertura curso", amount: 70, status: "Pagado" },
  { id: "p3", date: "2026-08-10", colleague: "Sara V.", concept: "Material compartido", amount: 22, status: "Pagado" },
];

export const mockEarningsTrend = [420, 505, 460, 610, 590, 705];

export const mockKpis = {
  earnedThisMonth: 705,
  pendingToCollect: 187,
  pendingCount: 3,
  entriesThisWeek: 4,
};

export const mockCalendarDays = [19, 21, 22, 23, 24, 25];

export const mockRates = [
  { school: "Blue Reef Diving", activity: "Curso Open Water", amount: 180, currency: "EUR" },
  { school: "Atlantis Freedive", activity: "Bautismo", amount: 65, currency: "EUR" },
];

export const mockConfigSections = ["Escuelas", "Actividades", "Tarifas", "Pagos", "Usuarios"];
