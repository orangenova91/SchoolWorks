/**
 * Teacher dashboard banner grid limits (editor, grid, API).
 * Single source of truth — change row/column caps here only.
 */
export const BANNER_MAX_ROWS = 5;
export const BANNER_COLUMNS = 7;
export const BANNER_MAX_SLOTS = BANNER_MAX_ROWS * BANNER_COLUMNS;

/** Default row count when creating or resetting banner state (API + client fallbacks). */
export const BANNER_DEFAULT_ROWS = 3;
