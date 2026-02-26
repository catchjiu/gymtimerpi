#!/usr/bin/env python3
"""
Gym Timer Python Bridge
Wiring:
  Rotary Encoder: CLK→Pin11/GPIO17, DT→Pin12/GPIO18, SW→Pin13/GPIO27, VCC→Pin1, GND→Pin6
  Buzzer: S→Pin16/GPIO23, V→Pin2/5V, G→Pin14/GND (set ACTIVE_BUZZER for type)
"""
import threading
import time
import http.server
import urllib.parse
import sys
import subprocess

try:
    import RPi.GPIO as GPIO
except ImportError:
    print("RPi.GPIO not found. Install: pip install RPi.GPIO")
    sys.exit(1)

# === Config ===
ACTIVE_BUZZER = True   # True = active buzzer (on/off), False = passive (PWM)
SWAP_ENCODER = False   # Set True if rotation direction is reversed

# === Wiring (BCM numbering) ===
ENCODER_CLK = 17
ENCODER_DT  = 18
ENCODER_SW  = 27
BUZZER_PIN  = 23

# === Key injection: try xdotool first (reliable on Pi), fall back to pynput ===
def send_key(key_name):
    try:
        subprocess.run(["xdotool", "key", key_name], capture_output=True, timeout=1)
        return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    try:
        from pynput.keyboard import Key, Controller
        ctrl = Controller()
        km = {"Up": Key.up, "Down": Key.down, "space": Key.space}
        k = km.get(key_name, Key.space)
        ctrl.press(k)
        ctrl.release(k)
        return True
    except Exception:
        pass
    return False

# === Setup ===
GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)

# Encoder
GPIO.setup(ENCODER_CLK, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(ENCODER_DT,  GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(ENCODER_SW,  GPIO.IN, pull_up_down=GPIO.PUD_UP)

# Buzzer
GPIO.setup(BUZZER_PIN, GPIO.OUT)
if ACTIVE_BUZZER:
    pwm = None
else:
    pwm = GPIO.PWM(BUZZER_PIN, 0)
    pwm.start(0)

last_clk = GPIO.input(ENCODER_CLK)
last_sw = GPIO.input(ENCODER_SW)


def beep_short():
    """Beep at 3, 2, 1 seconds."""
    if ACTIVE_BUZZER:
        GPIO.output(BUZZER_PIN, GPIO.HIGH)
        time.sleep(0.1)
        GPIO.output(BUZZER_PIN, GPIO.LOW)
    else:
        pwm.ChangeFrequency(2200)
        pwm.ChangeDutyCycle(50)
        time.sleep(0.1)
        pwm.ChangeDutyCycle(0)


def beep_long():
    """Beep at 0 seconds."""
    if ACTIVE_BUZZER:
        GPIO.output(BUZZER_PIN, GPIO.HIGH)
        time.sleep(0.4)
        GPIO.output(BUZZER_PIN, GPIO.LOW)
    else:
        pwm.ChangeFrequency(1200)
        pwm.ChangeDutyCycle(50)
        time.sleep(0.4)
        pwm.ChangeDutyCycle(0)


def on_encoder_tick(channel):
    global last_clk
    clk = GPIO.input(ENCODER_CLK)
    dt = GPIO.input(ENCODER_DT)
    if clk != last_clk and clk == 1:
        up = (dt == 1) != SWAP_ENCODER
        send_key("Up" if up else "Down")
        print("[ENCODER]", "Up" if up else "Down")
    last_clk = clk


def on_button_press(channel):
    global last_sw
    sw = GPIO.input(ENCODER_SW)
    if sw == 0 and last_sw == 1:
        send_key("space")
        print("[BUTTON] Space")
    last_sw = sw


class BeepHandler(http.server.BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/beep":
            params = urllib.parse.parse_qs(parsed.query)
            t = params.get("type", ["short"])[0]
            if t == "long":
                beep_long()
                print("[BEEP] LONG")
            else:
                beep_short()
                print("[BEEP] SHORT")
            self.send_response(200)
            self._send_cors_headers()
            self.end_headers()
        else:
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()

    def log_message(self, format, *args):
        pass


def run_http_server():
    server = http.server.HTTPServer(("127.0.0.1", 8765), BeepHandler)
    server.serve_forever()


def main():
    GPIO.add_event_detect(ENCODER_CLK, GPIO.BOTH, callback=on_encoder_tick, bouncetime=5)
    GPIO.add_event_detect(ENCODER_SW,  GPIO.BOTH, callback=on_button_press, bouncetime=200)

    http_thread = threading.Thread(target=run_http_server, daemon=True)
    http_thread.start()

    print("Gym bridge running. Encoder: ↑↓ ±5s, SW: Space.")
    print("Buzzer API: http://127.0.0.1:8765/beep?type=short or type=long")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        if pwm is not None:
            pwm.stop()
        GPIO.cleanup()


if __name__ == "__main__":
    main()
