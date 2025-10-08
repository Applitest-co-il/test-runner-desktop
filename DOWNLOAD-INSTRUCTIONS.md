# Download Instructions for ApplitestLocalRunner

## Expected Security Warning

When downloading ApplitestLocalRunner, you may see this Microsoft Defender SmartScreen warning:

```
Microsoft Defender SmartScreen couldn't verify if this file is safe because it isn't commonly downloaded.
Publisher: Unknown
```

**This is normal and expected.** The application is properly code-signed but uses a self-signed certificate.

## How to Download Safely

### Step 1: Download the File

1. Click the download link
2. When the SmartScreen warning appears, click **"Keep"** or **"Download anyway"**

### Step 2: Before Running

1. Right-click the downloaded file → **Properties**
2. Go to the **"Digital Signatures"** tab
3. Verify the signature shows:
    - **Signer**: Applitest
    - **Timestamp**: (current date)
    - **Status**: Valid

### Step 3: Run the Application

1. Double-click the `.exe` file
2. If Windows shows "Windows protected your PC":
    - Click **"More info"**
    - Click **"Run anyway"**

### Step 4: (Optional) Trust the Certificate

To avoid future warnings:

1. Right-click the `.exe` → Properties → Digital Signatures
2. Select the signature → **Details** → **View Certificate**
3. Click **"Install Certificate"**
4. Choose **"Local Machine"** → **"Trusted Root Certification Authorities"**

## Why These Warnings Appear

- **Self-Signed Certificate**: We use a self-signed certificate (free) instead of a commercial one ($300+/year)
- **New Application**: SmartScreen warns about applications that aren't widely downloaded
- **Security Feature**: Windows is being cautious about unknown publishers

## Verify Authenticity

You can verify the download is authentic by:

1. Checking the digital signature (should show "Applitest")
2. Downloading only from official sources
3. Comparing file hash if provided

## Alternative: Disable SmartScreen (Not Recommended)

**Warning**: Only do this if you fully trust the source.

1. Windows Security → App & browser control
2. Reputation-based protection settings
3. Turn off "Check apps and files"

We recommend keeping SmartScreen enabled and following the steps above instead.
