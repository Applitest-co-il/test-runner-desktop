# Self-Signed Certificate Code Signing

This project is configured to use self-signed certificates for Windows code signing. This approach provides basic code signing without the cost of commercial certificates.

## How It Works

1. **Certificate Generation**: Creates a self-signed code signing certificate
2. **Application Signing**: Signs the Windows executable during build
3. **Local Trust**: Optionally installs the certificate to the local trusted store

## Quick Start

### For Local Development

1. **Generate a self-signed certificate (requires Administrator privileges):**

    ```bash
    npm run create-enhanced-cert
    ```

    **Note:** You'll need to run PowerShell as Administrator. The script will:
    - Detect if you're running as admin
    - Automatically attempt to restart with admin privileges
    - Provide clear instructions if manual elevation is needed
    - Handle PowerShell environments that don't have the Cert: drive

2. Build and sign the application:

    ```bash
    npm run build:win:signed
    ```

    Or build without automatic certificate creation:

    ```bash
    npm run build:win
    ```

### For GitHub Actions

1. **Create certificate for GitHub Secrets (one-time setup):**

    ```bash
    npm run create-github-cert
    ```

    This creates a certificate and provides Base64 encoded content for GitHub Secrets.

2. **Add to GitHub Secrets:**
    - Go to your repository → Settings → Secrets and variables → Actions
    - Create a new secret named: `WINDOWS_CERTIFICATE`
    - Paste the Base64 content from `build/certificate-base64.txt`

3. **Automatic signing:**
    - The workflow automatically detects the certificate secret
    - Signs the Windows executable during CI/CD
    - Falls back to unsigned build if no certificate is provided

## Certificate Details

- **Location**: `build/applitest-cert.p12`
- **Password**: Empty (no password)
- **Type**: Code signing certificate
- **Algorithm**: RSA 2048-bit
- **Validity**: 1-2 years (depending on script used)
- **Subject**: `CN=Applitest, O=Applitest, C=IL`

## Available Certificate Scripts

The project includes a single, comprehensive certificate creation script:

### `create-enhanced-cert`

- ✅ Extended Key Usage (EKU) for code signing
- ✅ Fallback methods for different PowerShell environments
- ✅ Handles "Cert drive not found" errors automatically
- ✅ Detailed certificate verification
- ✅ Advanced error handling and troubleshooting

## Security Considerations

### Advantages

- ✅ Free (no certificate authority costs)
- ✅ Works immediately
- ✅ Provides basic code integrity
- ✅ Prevents most tampering

### Limitations

- ⚠️ Users will see "Unknown Publisher" warnings
- ⚠️ Not trusted by default on other machines
- ⚠️ Requires manual trust installation for full trust
- ⚠️ Certificate must be renewed annually

## User Experience

When users download and run the signed application:

1. **First Run**: Windows may show "Windows protected your PC" warning
2. **User Action**: Click "More info" → "Run anyway"
3. **After Trust**: If certificate is installed to trusted store, no warnings appear

## Manual Certificate Installation (For Users)

To avoid warnings on user machines, users can install the certificate:

1. Right-click the `.exe` file → Properties
2. Go to "Digital Signatures" tab
3. Select signature → "Details" → "View Certificate"
4. Click "Install Certificate"
5. Choose "Local Machine" → "Place all certificates in the following store"
6. Browse → "Trusted Root Certification Authorities" → OK

## Upgrading to Commercial Certificate

To upgrade to a commercial certificate later:

1. Purchase a code signing certificate from a CA (Sectigo, DigiCert, etc.)
2. Replace `build/applitest-cert.p12` with your commercial certificate
3. Update `certificatePassword` in package.json if needed
4. Remove the certificate creation step from GitHub Actions

## Troubleshooting

### Certificate Creation Fails

**"Cannot find drive. A drive with the name 'Cert' does not exist"**

- Use `npm run create-enhanced-cert` (includes fallback methods)
- This error occurs with certain PowerShell configurations
- The enhanced script automatically handles this limitation

**Administrator Rights Required**

- Certificate creation requires PowerShell to run as Administrator
- Right-click PowerShell → "Run as Administrator" → run the script
- Scripts will attempt to automatically restart with admin privileges where possible

**Other Certificate Issues**

- Close any applications that might be using certificates
- Try disabling antivirus temporarily
- Ensure PowerShell 5.0+ on Windows 10/11

### Signing Fails

**"After EKU filter, 0 certs were left"**

- This error indicates missing Extended Key Usage for code signing
- The enhanced certificate script automatically includes proper EKU
- Run `npm run create-enhanced-cert` to create a properly configured certificate

**Certificate File Issues**

- Verify certificate exists at `build/applitest-cert.p12`
- Check that `signAndEditExecutable` is set to `true` in package.json
- Ensure certificate contains private key (scripts verify this)
- Match `certificateSubjectName` in package.json with certificate subject

### Users Still See Warnings

- Self-signed certificates always show warnings initially
- Consider upgrading to a commercial certificate for production
- Provide installation instructions to users

## Files Modified

- `package.json`: Added signing configuration and certificate creation scripts
- `scripts/create-enhanced-cert.ps1`: Comprehensive certificate generation script
- `scripts/create-github-cert.ps1`: Certificate for GitHub Secrets with Base64 output
- `.github/workflows/build-and-deploy.yml`: GitHub Actions with certificate handling
- `.gitignore`: Excludes certificate files and Base64 exports from version control
- `SIGNING.md`: This documentation file

## Commands

### Certificate Creation

```bash
# Create enhanced self-signed certificate with proper EKU
npm run create-enhanced-cert

# Create certificate for GitHub Secrets (includes Base64 conversion)
npm run create-github-cert
```

### Building

```bash
# Build with automatic certificate creation and signing
npm run build:win:signed

# Build with existing certificate (signing enabled)
npm run build:win

# Build without signing (if no certificate available)
# Modify package.json to set signAndEditExecutable: false
```

### Troubleshooting Commands

```bash
# Check if certificate file exists
ls build/applitest-cert.p12

# View certificate details (PowerShell)
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2("build/applitest-cert.p12", "")
$cert | Format-List Subject, Thumbprint, HasPrivateKey, NotAfter
```
