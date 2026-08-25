# Changelog

Registro de cambios relevantes de Ocean Pulse.

## Unreleased

### Added
- Configuración del entorno de testing con Vitest.
- Tests de seguridad backend:
  - createUser
  - updateAdminStatus
  - supabaseAdmin
- Tests unitarios de helpers compartidos (`colorFor`, `applyListFilters`,
  `formatMoney`, `oppositeStatus`, `lighten`).
- Tests unitarios del cálculo económico (`computeRateTotal`).

### Changed
- Extracción de `computeRateTotal` como única fuente de verdad para el
  cálculo de importes (tarifa fija vs. por persona).
- Reducción de duplicación de lógica de cálculo en `WorkLogTab`,
  `ComisionesTab`, `PaymentsTab`, `SummaryTab` y `HomeTab`.
