# Gym Timer Python Bridge

Hardware → keyboard events, buzzer API for the React gym timer.

## Wiring

| Component       | Pin  | Raspberry Pi        | GPIO   |
|----------------|------|---------------------|--------|
| **Encoder CLK**| CLK  | Pin 11              | GPIO 17|
| **Encoder DT** | DT   | Pin 12              | GPIO 18|
| **Encoder SW** | SW   | Pin 13              | GPIO 27|
| **Encoder**    | VCC  | Pin 1 or 17         | 3.3V   |
| **Encoder**    | GND  | Pin 6, 9, 14, 20, 25| GND    |
| **Buzzer**     | S    | Pin 16              | GPIO 23|
| **Buzzer**     | V    | Pin 2 or 4          | 5V     |
| **Buzzer**     | G    | Pin 6 or 14         | GND    |

## Install

```bash
cd bridge
pip install -r requirements.txt
```

Or: `pip3 install RPi.GPIO pynput`

## Run

1. Start the bridge (run with `sudo` if GPIO fails):
   ```bash
   python3 gym_bridge.py
   ```

2. Open the React app in Chromium in kiosk mode and give it focus. The bridge sends ArrowUp/ArrowDown/Space to the active window.

3. The app calls `http://127.0.0.1:8765/beep?type=short` or `?type=long` to trigger the buzzer.

## Permissions

If GPIO access fails, either:
- Run with `sudo python3 gym_bridge.py`, or
- Add your user to the `gpio` group: `sudo usermod -aG gpio $USER` (then log out/in)
