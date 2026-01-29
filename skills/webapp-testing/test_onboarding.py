#!/usr/bin/env python3
"""Test the onboarding feature on INrVO app."""

from playwright.sync_api import sync_playwright
import os

SCREENSHOTS_DIR = "/tmp/onboarding_test"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

def test_onboarding():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Test 1: Desktop viewport
        print("\n=== DESKTOP TEST (1280x800) ===")
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        # Navigate and wait for app to load
        print("1. Navigating to localhost:3000...")
        page.goto('http://localhost:3000')
        page.wait_for_load_state('networkidle')
        page.screenshot(path=f'{SCREENSHOTS_DIR}/01_initial_load.png')
        print(f"   Screenshot saved: {SCREENSHOTS_DIR}/01_initial_load.png")

        # Clear localStorage to simulate first-time user
        print("2. Clearing localStorage to simulate first-time user...")
        page.evaluate("localStorage.removeItem('inrvo_onboarding')")

        # Reload and wait for onboarding
        print("3. Reloading page and waiting for onboarding (2s delay expected)...")
        page.reload()
        page.wait_for_load_state('networkidle')

        # Wait for onboarding to appear (2s delay + buffer)
        page.wait_for_timeout(3000)
        page.screenshot(path=f'{SCREENSHOTS_DIR}/02_after_reload_waiting.png')
        print(f"   Screenshot saved: {SCREENSHOTS_DIR}/02_after_reload_waiting.png")

        # Check if onboarding modal appeared
        onboarding_visible = page.locator('[role="dialog"]').is_visible()
        print(f"4. Onboarding modal visible: {onboarding_visible}")

        if onboarding_visible:
            page.screenshot(path=f'{SCREENSHOTS_DIR}/03_welcome_modal.png')
            print(f"   Screenshot saved: {SCREENSHOTS_DIR}/03_welcome_modal.png")

            # Get welcome modal content
            title = page.locator('[role="dialog"] h2').text_content()
            print(f"   Welcome title: {title}")

            # Click Next to move to step 2
            print("5. Clicking 'Next' button...")
            page.locator('button:has-text("Next")').click()
            page.wait_for_timeout(500)
            page.screenshot(path=f'{SCREENSHOTS_DIR}/04_step2_agent_chat.png')
            print(f"   Screenshot saved: {SCREENSHOTS_DIR}/04_step2_agent_chat.png")

            # Check if spotlight overlay is visible
            overlay_visible = page.locator('.onboarding-overlay').is_visible()
            print(f"   Spotlight overlay visible: {overlay_visible}")

            # Click Next again to step 3
            print("6. Clicking 'Next' to step 3...")
            page.locator('button:has-text("Next")').click()
            page.wait_for_timeout(500)
            page.screenshot(path=f'{SCREENSHOTS_DIR}/05_step3_voice_toggle.png')
            print(f"   Screenshot saved: {SCREENSHOTS_DIR}/05_step3_voice_toggle.png")

            # Test Skip button
            print("7. Testing 'Skip' button...")
            skip_btn = page.locator('button[aria-label="Skip tour"]')
            if skip_btn.is_visible():
                skip_btn.click()
                page.wait_for_timeout(500)
                page.screenshot(path=f'{SCREENSHOTS_DIR}/06_after_skip.png')
                print(f"   Screenshot saved: {SCREENSHOTS_DIR}/06_after_skip.png")

                # Check if onboarding is gone
                onboarding_gone = not page.locator('[role="dialog"]').is_visible()
                print(f"   Onboarding dismissed: {onboarding_gone}")
            else:
                print("   Skip button not found - trying X button")
                page.screenshot(path=f'{SCREENSHOTS_DIR}/06_skip_button_not_found.png')
        else:
            print("   Onboarding did NOT appear - checking for errors")
            page.screenshot(path=f'{SCREENSHOTS_DIR}/03_no_onboarding.png')

        # Check localStorage for completion
        print("8. Checking localStorage for 'inrvo_onboarding'...")
        storage_value = page.evaluate("localStorage.getItem('inrvo_onboarding')")
        print(f"   localStorage value: {storage_value}")

        # Reload and verify onboarding doesn't show again
        print("9. Reloading to verify onboarding doesn't show again...")
        page.reload()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(3500)  # Wait longer than the 2s auto-start delay

        onboarding_after_reload = page.locator('[role="dialog"]').is_visible()
        print(f"   Onboarding shows after reload (should be false): {onboarding_after_reload}")
        page.screenshot(path=f'{SCREENSHOTS_DIR}/07_after_persistence_check.png')

        # Test Restart Tour from burger menu
        print("10. Testing 'Restart Tour' from burger menu...")
        # Find and click burger menu button
        burger_btn = page.locator('button:has(svg)').first
        if burger_btn.is_visible():
            burger_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path=f'{SCREENSHOTS_DIR}/08_burger_menu_open.png')
            print(f"    Screenshot saved: {SCREENSHOTS_DIR}/08_burger_menu_open.png")

            # Look for Restart Tour button
            restart_btn = page.locator('button:has-text("Restart Tour")')
            if restart_btn.is_visible():
                print("    Found 'Restart Tour' button, clicking...")
                restart_btn.click()
                page.wait_for_timeout(500)

                onboarding_restarted = page.locator('[role="dialog"]').is_visible()
                print(f"    Onboarding restarted: {onboarding_restarted}")
                page.screenshot(path=f'{SCREENSHOTS_DIR}/09_after_restart.png')
            else:
                print("    'Restart Tour' button not found in menu")
                page.screenshot(path=f'{SCREENSHOTS_DIR}/09_no_restart_button.png')

        context.close()

        # Test 2: Mobile viewport
        print("\n=== MOBILE TEST (375x812) ===")
        mobile_context = browser.new_context(viewport={"width": 375, "height": 812})
        mobile_page = mobile_context.new_page()

        # Clear storage and test mobile
        print("11. Testing mobile viewport...")
        mobile_page.goto('http://localhost:3000')
        mobile_page.wait_for_load_state('networkidle')
        mobile_page.evaluate("localStorage.removeItem('inrvo_onboarding')")
        mobile_page.reload()
        mobile_page.wait_for_load_state('networkidle')
        mobile_page.wait_for_timeout(3000)

        mobile_page.screenshot(path=f'{SCREENSHOTS_DIR}/10_mobile_onboarding.png')
        print(f"    Screenshot saved: {SCREENSHOTS_DIR}/10_mobile_onboarding.png")

        mobile_onboarding = mobile_page.locator('[role="dialog"]').is_visible()
        print(f"    Mobile onboarding visible: {mobile_onboarding}")

        if mobile_onboarding:
            # Click through a few steps to test positioning
            mobile_page.locator('button:has-text("Next")').click()
            mobile_page.wait_for_timeout(500)
            mobile_page.screenshot(path=f'{SCREENSHOTS_DIR}/11_mobile_step2.png')
            print(f"    Screenshot saved: {SCREENSHOTS_DIR}/11_mobile_step2.png")

            mobile_page.locator('button:has-text("Next")').click()
            mobile_page.wait_for_timeout(500)
            mobile_page.screenshot(path=f'{SCREENSHOTS_DIR}/12_mobile_step3.png')
            print(f"    Screenshot saved: {SCREENSHOTS_DIR}/12_mobile_step3.png")

        mobile_context.close()
        browser.close()

        print(f"\n=== TEST COMPLETE ===")
        print(f"All screenshots saved to: {SCREENSHOTS_DIR}/")
        print("Review the screenshots to verify visual appearance.")

if __name__ == "__main__":
    test_onboarding()
