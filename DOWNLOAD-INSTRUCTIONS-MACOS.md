# macOS Download Instructions

## If you see "ApplitestLocalRunner is damaged" error

This error occurs due to macOS Gatekeeper security checks. Follow these steps to resolve it:

### Remove Quarantine Attribute

1. Open Terminal
2. Navigate to your Downloads folder:

    ```bash
    cd ~/Downloads
    ```

3. Remove the quarantine attribute:

    ```bash
    xattr -cr ApplitestLocalRunner-macos13.dmg
    ```

4. Open the DMG file and install the app
5. If the app still shows the error after installation, run:

    ```bash
    xattr -cr /Applications/ApplitestLocalRunner.app
    ```

## Why does this happen?

macOS Gatekeeper checks downloaded apps for valid code signatures and notarization. Since this app is built in CI/CD without a paid Apple Developer certificate, it requires manual approval to run.

## Security Note

This app is safe to use. The "damaged" message is misleading - it actually means the app hasn't been notarized by Apple, not that it's actually damaged or malicious.
