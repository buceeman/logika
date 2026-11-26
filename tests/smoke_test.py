import functools
import http.server
import json
import os
import re
import socketserver
import threading
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def start_server():
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    httpd = socketserver.TCPServer(("127.0.0.1", 0), handler)
    port = httpd.server_address[1]
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd, port


def verify_sw_assets(base_url: str):
    sw_text = (ROOT / "sw.js").read_text(encoding="utf-8")
    assets = re.findall(r"'([^']+)'", sw_text.split("const ASSETS = [")[1].split("];")[0])
    assert len(assets) >= 35, f"Expected >= 35 SW assets, got {len(assets)}"
    for asset in assets:
        url = f"{base_url}/{asset.lstrip('./')}"
        with urllib.request.urlopen(url) as resp:
            assert resp.status == 200, f"Asset {asset} returned {resp.status}"
    print(f"[PASS] Verified all {len(assets)} sw.js ASSETS return HTTP 200")


def run_tests():
    httpd, port = start_server()
    base_url = f"http://127.0.0.1:{port}"
    try:
        verify_sw_assets(base_url)

        with sync_playwright() as p:
            browser = p.chromium.launch()
            context = browser.new_context()
            page = context.new_page()

            errors = []
            page.on("pageerror", lambda err: errors.append(f"{page.url}: {err}"))
            page.on("console", lambda msg: errors.append(f"{page.url} console.error: {msg.text}") if msg.type == "error" else None)

            # 1. Test Hub (index.html)
            page.goto(f"{base_url}/index.html", wait_until="networkidle")
            assert page.locator(".app-card").count() == 11, "Expected 11 app cards on hub"
            assert page.locator("#daily-quest-items .daily-item").count() == 3, "Expected 3 daily quest items"

            # Global mute toggle on hub
            page.click("#btn-global-mute")
            assert page.evaluate("localStorage.getItem('logika_muted')") == "1", "Global mute did not persist '1'"
            assert "KI" in page.locator("#btn-global-mute").inner_text()

            # Badge Album modal
            page.click("#btn-open-album")
            assert page.locator("#album-modal-backdrop.is-open").count() == 1
            assert page.locator("#album-grid .album-tile").count() == 11
            page.click("#btn-close-album")

            # Teacher modal
            page.click("#btn-open-teacher")
            assert page.locator("#teacher-modal-backdrop.is-open").count() == 1
            assert page.locator("#teacher-rows .teacher-row").count() == 11
            page.click("#btn-close-teacher")

            # Simulate completing today's 3 daily quests via star increments
            daily_keys = page.evaluate("""() => {
                const d = window.LogikaCore.getDailyQuest();
                return d.apps.map(k => window.LogikaCore.APP_META.find(a => a.key === k).starKey);
            }""")
            for sk in daily_keys:
                page.evaluate("(sk) => localStorage.setItem(sk, '1')", sk)
            page.reload(wait_until="networkidle")
            assert "3 / 3" in page.locator("#daily-progress-pill").inner_text(), "Daily quest did not complete 3/3"
            assert page.locator("#daily-streak-value").inner_text().strip() == "1", "Streak did not increment to 1"
            print("[PASS] Hub: 11 cards, Daily 3-Quest & streak, Badge Album, Teacher modal, Global Mute")

            # 2. Test all 11 sub-apps
            apps = [
                ("kovacs", "kovacs-muhelye"),
                ("utveszto", "buvos-utveszto"),
                ("merleg", "merleg-vasar"),
                ("kameleon", "szabaly-kameleon"),
                ("tukor", "tukor-var"),
                ("nyomozo", "erdei-nyomozo"),
                ("suni", "postas-suni"),
                ("minta", "minta-vonat"),
                ("vakond", "kertesz-vakond"),
                ("gep", "varazsgep"),
                ("mano", "ido-mano"),
            ]

            for key, slug in apps:
                page.goto(f"{base_url}/{slug}/index.html", wait_until="networkidle")
                has_core = page.evaluate("Boolean(window.LogikaCore)")
                assert has_core, f"{slug} missing window.LogikaCore"

                # Verify global mute synced into sub-app
                pressed = page.locator("#btn-toggle-sound").get_attribute("aria-pressed")
                assert pressed == "false", f"{slug} did not sync global mute (aria-pressed={pressed})"

                # Verify difficulty persistence
                med_btn = page.locator("#difficulty-bar .diff-btn[data-diff='medium']")
                assert med_btn.count() == 1, f"{slug} missing medium difficulty button"
                med_btn.click()
                assert page.evaluate(f"localStorage.getItem('logika_diff_{key}')") == "medium", f"{slug} did not save medium diff"

                page.reload(wait_until="networkidle")
                is_active = page.evaluate("document.querySelector('#difficulty-bar .diff-btn[data-diff=\"medium\"]').classList.contains('is-active')")
                assert is_active, f"{slug} did not restore medium difficulty after reload"

            # Verify Idő-Manó 3 modes (calendar, clock, story)
            page.click("#tab-mode-clock")
            assert page.locator(".clock-svg").count() == 1, "Idő-Manó clock SVG did not render"
            page.click("#tab-mode-story")
            assert page.locator(".story-slot").count() == 4, "Idő-Manó medium story should have 4 slots"

            # Verify "Folytasd" button on hub points to last visited app (Idő-Manó)
            page.goto(f"{base_url}/index.html", wait_until="networkidle")
            hero_txt = page.locator("#hero-play-kovacs").inner_text()
            assert "Idő-Manó" in hero_txt, f"Expected hero CTA to continue Idő-Manó, got: {hero_txt}"

            assert not errors, f"Console/Page errors detected:\n" + "\n".join(errors)
            print("[PASS] All 11 sub-apps loaded with 0 console/page errors, synced mute & persisted difficulty")
            browser.close()
    finally:
        httpd.shutdown()


if __name__ == "__main__":
    run_tests()
