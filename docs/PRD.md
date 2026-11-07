# PRD — Zombie Đại Chiến: Thành Trì Cuối Cùng (v1.0)

## User promise
LIVE viewer can participate for free in under 5 seconds: comment JOIN spawns or assigns a named soldier; comments BẮN SỬA CỨU contribute to defense; optional gifts trigger mapped, fixed, clearly explained effects. Round concludes in 5 minutes or earlier on defeat; outcomes and missions persist. Watch-only users can understand the game without reading a long manual.

## Modes
- **mock**: offline simulator; synthetic events for full E2E without TikTok.
- **connected**: only once an authorized, supported LIVE integration is available; detect unavailable and fall back to clearly labeled disconnected mode, not synthetic engagement posing as real.
- **replay**: deterministic recorded event stream for QA.

## Match timeline in seconds
- 0–20: preparation; JOIN allowed.
- 20–80: wave 1
- 80–140: wave 2
- 140–200: wave 3
- 200–240: wave 4
- 240–280: wave 5 including Boss (boss enters at 240).
- 280–300: results, then next round. Defeat early => results state and then next scheduled round; never silently leave an unwinnable level running.
- Boss phase must remain achievable without gifts at target normal participation.
- Each wave offers distinct zombie types; all zombie parameters loaded from config.

## Player identity and progression
- Identify via provider + stable platform_user_id, NOT display username. Mock mode uses stable fake IDs (e.g., mock-001). Username is mutable and safe-rendered.
- JOIN once per player per match; rejoining should not duplicate soldier. Max 40 visually rendered soldiers; excess grouped as reserve squads with full server-side participation.
- Unrecognized viewer can join mid-match; respawn policy configurable; no automated fake viewer count.
- XP from participation, measured damage, kill assist, repairs, mission outcomes. Daily progress resets using Asia/Ho_Chi_Minh local calendar.
- Persistent seasons, mission tracking and inventory may follow after MVP, but basic XP and achievements must persist from phase 05.

## Free commands
- **JOIN**: Add active participant / soldier (cooldown: once per round)
- **BẮN / BAN**: Personal special shot (cooldown: 10s)
- **SỬA / SUA**: 15 repair progress toward restore, cap per player/time (cooldown: 15s)
- **CỨU / CUU**: Add support energy toward revive/regen (cooldown: 20s)
- **SKILL**: Spend 100 energy on player skill (cooldown: 30s)
- **BOSS**: Request boss targeting priority (cooldown: 15s)

## Likes
Optional; only if trusted supported source exposes increments. Aggregate per-user/per-time and cap contribution; never infer likes from missing events.

## Gift skills (6 configurable IDs, placeholder IDs until verified)
- **A (reinforcements)**: +2 support soldiers, 12s, max 12 support soldiers.
- **B (machinegun)**: machinegun turret 15s, max 3 turrets.
- **C (shield)**: shield 30% less base damage, 10s, no additive stacking.
- **D (airstrike)**: airstrike 3 fixed AOE pulses over 5s; cooldown 20s.
- **E (mech)**: mech 15s, single instance.
- **F (honor)**: visual 3s (no gameplay advantage).

## Gameplay success/failure
- Win = base HP > 0 at end of boss phase and boss HP == 0; when boss remains after phase, extend at most bounded time within round rules or declare defeat. Recommended: boss guaranteed spawn by 240s; finish win once boss dies; at 280s if boss alive, defeat (display as "không đánh bại boss"). Base HP<=0 always defeat.

## UI 1080×1920
- HUD: wave, timer, HP, active players.
- 55% central viewport: map, paths, base near bottom, attack / bullet visual; sprites and animated state.
- Lower middle: player highlights, mission progress, top MVP.
- Bottom: comment instructions; account for app overlay safe margins; verify in live preview.
- Gift alert appears <=3 seconds, queue overflow; text readable on phones, avoid seizure-triggering flash / gore.

## Explicit non-goals V1
TikTok Mini Game inside app; automated account creation; bot comments/likes; fake gifts; cash prizes; gift-driven roulette, lotteries or financial reward; uncontrolled 24/7 LIVE deployment.
