#!/usr/bin/env python3
"""
Gym Timer Python Bridge
Wiring:
  Rotary Encoder: CLK→GPIO17, DT→GPIO18, SW→GPIO27, VCC→3.3V, GND→GND
  Passive Buzzer: S→GPIO23, V→5V, G→GND
"""
import threading
import time
import http.server
import urllib.parse
import sys

try:
    import RPi.GPIO as GPIO
except ImportError:
    print("RPi.GPIO not found. Install: pip install RPi.GPIO")
    sys.exit(1)

try:
    from pynput.keyboard import Key, Controller
except ImportError:
    print("pynput not found. Install: pip install pynput")
    sys.exit(1)

# === Wiring (BCM numbering) ===
ENCODER_CLK = 17
ENCODER_DT  = 18
ENCODER_SW  = 27
BUZZER_PIN  = 23

# === Setup ===
GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)

# Encoder
GPIO.setup(ENCODER_CLK, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(ENCODER_DT,  GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.setup(ENCODER_SW,  GPIO.IN, pull_up_down=GPIO.PUD_UP)

# Buzzer (PWM for passive buzzer)
GPIO.setup(BUZZER_PIN, GPIO.OUT)
pwm = GPIO.PWM(BUZZER_PIN, 0)
pwm.start(0)

keyboard = Controller()
last_clk = GPIO.input(ENCODER_CLK)
last_sw = GPIO.input(ENCODER_SW)


def beep_short():
    """Beep at 3, 2, 1 seconds."""
    pwm.ChangeFrequency(2200)
    pwm.ChangeDutyCycle(50)
    time.sleep(0.1)
    pwm.ChangeDutyCycle(0)


def beep_long():
    """Beep at 0 seconds."""
    pwm.ChangeFrequency(1200)
    pwm.ChangeDutyCycle(50)
    time.sleep(0.4)
    pwm.ChangeDutyCycle(0)


def on_encoder_tick(channel):
    global last_clk
    clk = GPIO.input(ENCODER_CLK)
    dt = GPIO.input(ENCODER_DT)
    if clk != last_clk and clk == 1:
        if dt == 1:
            keyboard.press(Key.up)
            keyboard.release(Key.up)
        else:
            keyboard.press(Key.down)
            keyboard.release(Key.down)
    last_clk = clk


def on_button_press(channel):
    global last_sw
    sw = GPIO.input(ENCODER_SW)
    if sw == 0 and last_sw == 1:
        keyboard.press(Key.space)
        keyboard.release(Key.space)
    last_sw = sw


class BeepHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/beep":
            params = urllib.parse.parse_qs(parsed.query)
            t = params.get("type", ["short"])[0]
            if t == "long":
                beep_long()
            else:
                beep_short()
            self.send_response(200)
            self.end_headers()
        else:
            self.send_response(404)
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
        pwm.stop()
        GPIO.cleanup()


if __name__ == "__main__":
    main()
