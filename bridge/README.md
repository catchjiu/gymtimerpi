# Gym Timer Python Bridge

Hardware → keyboard events, buzzer API for the React gym timer.

## Wiring

| Component       | Pin  | Raspberry Pi        | GPIO   |
|----------------|------|---------------------|--------|
| **Encoder CLK**| CLK  | Pin 11              | GPIO 17|
| **Encoder DT** | DT   | Pin 12              | GPIO 18|
| **Encoder SW** | SW   | Pin 13              | GPIO 27|
| **Encoder**    | VCC  | Pin 1               | 3.3V   |
| **Encoder**    | GND  | Pin 6               | GND    |
| **Buzzer**     | S    | Pin 16              | GPIO 23|
| **Buzzer**     | V    | Pin 2               | 5V     |
| **Buzzer**     | G    | Pin 14              | GND    |

## Install

```bash
# Install xdotool for reliable key injection on Pi (recommended)
sudo apt install xdotool

# Python packages (use venv - see main README)
cd bridge
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Config (edit gym_bridge.py)

- `ACTIVE_BUZZER = True` – Most 3-pin modules (S/V/G) are active. Set `False` for passive buzzers.
- `SWAP_ENCODER = True` – If rotation direction is reversed.

## Run

1. Start the bridge (ensure browser/timer has focus for key injection):
   ```bash
   cd gymtimerpi/bridge
   source venv/bin/activate
   python gym_bridge.py
   ```

2. When you rotate or press the button, you should see `[ENCODER] Up/Down` or `[BUTTON] Space` in the terminal. When the timer beeps, you'll see `[BEEP] SHORT` or `[BEEP] LONG`.

3. If nothing appears when you rotate, install xdotool: `sudo apt install xdotool`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Buzzer silent | Set `ACTIVE_BUZZER = False` if you have a passive buzzer. Check wiring (S→GPIO23). |
| Encoder does nothing | Install xdotool. Ensure the browser window has focus. Try `SWAP_ENCODER = True`. |
| GPIO permission denied | Run with `sudo` or: `sudo usermod -aG gpio $USER` then log out/in. |
