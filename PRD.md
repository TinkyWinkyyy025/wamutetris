# Wamu Tetris PRD

## Overview

Wamu Tetris is a browser-friendly, single-screen Tetris-style game for Wamu Cafe play sessions. The app supports Individual play and local Multiplayer VS play with room-code entry UI.

Live site: https://wamutetris.vercel.app

## Goals

- Provide a cute, playful, soft pastel Tetris experience.
- Keep gameplay visible in one browser screen without scrolling.
- Support touch controls and keyboard controls.
- Let users choose Individual or Multiplayer from the home screen.
- Let Multiplayer users create or join a room by code.
- Allow Multiplayer games to start with 2 to 6 filled player slots.

## Non-Goals

- The current static web app does not synchronize gameplay across separate devices.
- True online room play requires a realtime backend such as Firebase, Supabase Realtime, or WebSockets.
- The current room code flow is a UI/game-start flow for local VS play.

## Audience

- Kids and families playing at Wamu Cafe.
- Casual players using desktop, tablet, or mobile browsers.
- Cafe event hosts who need a simple game that is easy to start.

## Platforms

- Static web app hosted on Vercel.
- Modern desktop and mobile browsers.
- Keyboard and touch input.

## Home Screen Requirements

- Show title and mode selection centered on all screen sizes.
- Modes:
  - Individual
  - Multiplayer
- Individual mode:
  - Show one player name/color field.
  - Show only `Start Game` at the bottom.
  - Do not show Multiplayer room buttons.
- Multiplayer mode:
  - Hide `Start Game`.
  - Show bottom buttons:
    - `Create Room`
    - `Join Room`
  - Do not show a player-count selector.
  - Show up to 6 player slots.
  - Filled player names become active players.
  - Blank slots are ignored.
  - Minimum active players: 2.
  - Maximum active players: 6.
- Join Room:
  - First click reveals a room code input.
  - Code must be 6 alphanumeric characters.
  - Code is normalized to uppercase.
- Create Room:
  - Generates a 6-character room code.
  - Code mixes alphabet and number characters.
  - Ambiguous characters are avoided where practical.

## Game Modes

### Individual

- One player board.
- No 2-player interface should be shown.
- Game ends when the player is eliminated.

### Multiplayer

- VS mode for 2 to 6 active players.
- Active players are based on filled room slots.
- Game shows the room code in the game header.
- Game ends when one player remains.
- Garbage attacks apply in VS mode based on line clears and combo state.

## Layout Requirements

- App must remain a single-page, single-screen experience without scrolling.
- Board must be fully visible at 100% browser zoom.
- In 2-player Multiplayer, boards should sit side by side.
- For 3 to 6 players, boards use compact sizing so active boards fit better on one screen.
- Hold and line clear display:
  - Hold block is on the left side of the grid.
  - Line clears appear below Hold.
- Upcoming pieces:
  - Two upcoming pieces appear on the right side of the grid.
- The grid has 20 rows and 10 columns.

## Visual Design

- Font: Fredoka.
- Overall style: cute, playful, soft minimalist pastel.
- Background: cream tone.
- Palette direction:
  - Soft cream
  - Pastel peach
  - Muted rose
  - Soft mint/sky
  - Warm off-white panels
- Avoid gradient backgrounds.

## Controls

### Player 1 Keyboard

- Move left: `Left Arrow`
- Move right: `Right Arrow`
- Rotate right: `Up Arrow`
- Rotate left: `Z`
- Soft drop: `Down Arrow`
- Hard drop: `Space`
- Hold: `C`

### Touch Controls

Bottom control order:

1. Left arrow
2. Right arrow
3. Rotate left icon
4. Rotate right icon
5. Pause icon for Hold
6. Normal down arrow for Soft Drop
7. Down arrow with underline for Hard Drop

### Additional Keyboard Maps

- Multiplayer includes keyboard maps for up to 6 players.
- Missing player slots are ignored during input handling.

## Gameplay Requirements

- Standard falling-block gameplay on a 10 x 20 grid.
- Show a ghost/shadow preview of where the current block will land.
- Support holding the current block.
- Show two next/upcoming blocks.
- Pause and menu buttons are available during play.
- Elimination state should visually dim eliminated players.

## Scoring

- Hard drop: `2 * drop distance`.
- Line clear scores are multiplied by current level:
  - Single: `40 * level`
  - Double: `100 * level`
  - Triple: `300 * level`
  - Tetris: `1200 * level`
- Soft drop currently scores 1 point per soft-drop step.
- Survival bonus currently adds 10 points every 10 seconds.

## Leveling

- Level starts at 1.
- Level increases over elapsed game time.
- Drop interval decreases as level increases.

## Deployment

- Source repository: https://github.com/TinkyWinkyyy025/wamutetris
- Production URL: https://wamutetris.vercel.app
- Pushes to `main` trigger Vercel redeployment.

## Future Requirements

- Add realtime multiplayer room synchronization.
- Persist room state on a backend.
- Allow players on separate devices to join the same room and play against each other live.
- Add room host controls for starting once 2 to 6 players have joined.
