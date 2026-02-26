# Gym Timer Pi — Sports-Tech Raspberry Pi Kiosk

A professional gym countdown timer designed for Raspberry Pi, controlled via keyboard events from a Python hardware bridge (rotary encoder, buttons, IR remote).

## Quick Start

```bash
npm install
npm run dev
```

Build for production (kiosk deployment):

```bash
npm run build
```

Serve the `dist/` folder on your Pi.

## Keyboard Controls

| Key | Action |
|-----|--------|
| **Space** | Toggle Start/Stop |
| **↑ / ↓** | Add/Subtract 5 seconds (rotary simulation) |
| **0–9** | Keypad entry (e.g. 5-0-0 → 05:00) |
| **Enter** | Confirm keypad entry |
| **R** | Reset timer |

## Buzzer Integration (Python Bridge)

The app logs `BEEP_SHORT` at 3, 2, and 1 seconds, and `BEEP_LONG` at 0. Pipe console output to your Python bridge to trigger the passive buzzer.

## Tech Stack

- React + TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React
