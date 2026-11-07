/**
 * Unified Game Fonts Configuration
 * Eliminates Vietnamese diacritic fallback glitch ("chữ to chữ nhỏ, chữ dày chữ mỏng")
 * by using Google Fonts with full Vietnamese Latin-Extended support:
 * - Montserrat (Bold / Black 800/900)
 * - Be Vietnam Pro (Bold / ExtraBold 700/800)
 */

export const GAME_FONTS = {
  // Heavy display font for titles, HUD headers, and alerts
  DISPLAY: "'Montserrat', 'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif",
  
  // Tactical UI font for stats, nameplates, and badges
  TACTICAL: "'Montserrat', 'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif",
  
  // High-legibility body font
  BODY: "'Be Vietnam Pro', 'Montserrat', 'Segoe UI', Arial, sans-serif",
  
  // Monospace font for telemetry, FPS, and timestamps
  MONO: "'Courier New', Courier, monospace",
};
