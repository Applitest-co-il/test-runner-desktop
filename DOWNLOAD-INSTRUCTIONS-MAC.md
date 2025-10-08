# macOS Download Instructions for ApplitestLocalRunner

## Expected Security Warning

When downloading and running ApplitestLocalRunner on macOS, you may see these warnings:

```text
"ApplitestLocalRunner.dmg" can't be opened because it was not downloaded from the Mac App Store.
```

Or after mounting the DMG:

```text
"ApplitestLocalRunner" can't be opened because it's from an unidentified developer.
```

**This is normal and expected.** The application is properly signed but uses an ad-hoc signature, not an Apple Developer certificate.

## How to Install and Run on macOS

### Step 1: Download the DMG File

1. Download `ApplitestLocalRunner-mac.dmg`
2. If blocked, go to **System Preferences** → **Security & Privacy** → **General**
3. Click **"Allow anyway"** next to the blocked download message

### Step 2: Mount and Install

1. Double-click the `.dmg` file to mount it
2. If blocked, **Control+Click** the DMG file → **Open** → **Open**
3. Drag `ApplitestLocalRunner.app` to the **Applications** folder

### Step 3: First Run (Bypass Gatekeeper)

Since the app is not from the Mac App Store or a verified developer:

#### Method 1: Control+Click (Recommended)

1. **Control+Click** (or right-click) on `ApplitestLocalRunner.app`
2. Select **"Open"** from the context menu
3. Click **"Open"** in the security dialog
4. The app will run and be trusted for future launches

#### Method 2: System Preferences

1. Try to run the app normally (it will be blocked)
2. Go to **System Preferences** → **Security & Privacy** → **General**
3. Click **"Open Anyway"** next to the blocked app message
4. Confirm by clicking **"Open"**

#### Method 3: Terminal (Advanced Users)

```bash
# Remove quarantine attribute
xattr -d com.apple.quarantine /Applications/ApplitestLocalRunner.app

# Or run directly
open /Applications/ApplitestLocalRunner.app
```

## One-Time Setup Commands (Optional)

For advanced users who want to bypass Gatekeeper globally (not recommended for security):

```bash
# Disable Gatekeeper (requires admin password)
sudo spctl --master-disable

# Re-enable Gatekeeper later
sudo spctl --master-enable
```

**Warning**: Disabling Gatekeeper reduces security. Only do this if you fully understand the risks.

## Why These Warnings Appear

- **Ad-hoc Signature**: We use free ad-hoc signing instead of Apple Developer Program ($99/year)
- **Gatekeeper Protection**: macOS protects users from unidentified developers
- **App Store Preference**: macOS prefers apps from the Mac App Store or verified developers

## Verify App Integrity

You can verify the application is properly signed:

```bash
# Check signature
codesign -dv --verbose=4 /Applications/ApplitestLocalRunner.app

# Verify signature
codesign -v /Applications/ApplitestLocalRunner.app
```

Look for:

- **Authority**: `(adhoc)` or developer name
- **Valid**: No errors in verification

## For IT Administrators

To deploy in managed environments:

```bash
# Remove quarantine for all users
sudo xattr -r -d com.apple.quarantine /Applications/ApplitestLocalRunner.app

# Allow specific app through Gatekeeper
sudo spctl --add /Applications/ApplitestLocalRunner.app
```

## macOS Versions

These instructions work for:

- ✅ macOS 10.15 Catalina and later
- ✅ macOS 11 Big Sur
- ✅ macOS 12 Monterey
- ✅ macOS 13 Ventura
- ✅ macOS 14 Sonoma
- ✅ macOS 15 Sequoia

## Upgrading to Apple Developer Certificate

To eliminate these warnings completely:

1. **Join Apple Developer Program** ($99/year)
2. **Generate certificates** in Apple Developer Portal
3. **Configure code signing** with real Apple certificates
4. **Notarize the app** through Apple's notarization service

This provides the same trust level as Mac App Store apps.
