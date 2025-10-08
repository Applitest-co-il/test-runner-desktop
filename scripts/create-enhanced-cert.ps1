# Enhanced PowerShell script to create a proper code signing certificate
# This script ensures the certificate has the correct Extended Key Usage for code signing

Write-Host "Creating enhanced self-signed code signing certificate..." -ForegroundColor Green

# Certificate details
$certSubject = "CN=Applitest, O=Applitest, C=IL"
$certPath = "build/applitest-cert.p12"
$certPassword = ""

# Ensure build directory exists
if (!(Test-Path "build")) {
    New-Item -ItemType Directory -Force -Path "build"
}

# Check if certificate already exists
if (Test-Path $certPath) {
    Write-Host "Certificate already exists at $certPath" -ForegroundColor Yellow
    Write-Host "Deleting existing certificate to create a new one..." -ForegroundColor Yellow
    Remove-Item $certPath -Force
}

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "Certificate creation requires administrator privileges." -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    exit 1
}

try {
    Write-Host "Creating code signing certificate with proper EKU..." -ForegroundColor Blue
    
    # Calculate expiration date (2 years from now)
    $notAfter = (Get-Date).AddYears(2)
    
    # Clean up any existing certificates with the same subject (if Cert: drive is available)
    Write-Host "Cleaning up any existing certificates..." -ForegroundColor Gray
    try {
        Get-ChildItem -Path "Cert:\LocalMachine\My" -ErrorAction Stop | Where-Object { $_.Subject -eq $certSubject } | Remove-Item -Force -ErrorAction SilentlyContinue
        Get-ChildItem -Path "Cert:\CurrentUser\My" -ErrorAction Stop | Where-Object { $_.Subject -eq $certSubject } | Remove-Item -Force -ErrorAction SilentlyContinue
        Write-Host "Certificate cleanup completed." -ForegroundColor Gray
    }
    catch {
        Write-Host "Certificate drive not available, skipping cleanup..." -ForegroundColor Gray
    }
    
    # Create certificate with proper code signing EKU - try different store locations
    Write-Host "Creating certificate..." -ForegroundColor Blue
    $cert = $null
    
    # Try CurrentUser store first (more reliable)
    try {
        $cert = New-SelfSignedCertificate `
            -Subject $certSubject `
            -KeyAlgorithm RSA `
            -KeyLength 2048 `
            -KeyExportPolicy Exportable `
            -KeyUsage DigitalSignature `
            -NotAfter $notAfter `
            -HashAlgorithm SHA256 `
            -KeySpec Signature `
            -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3") `
            -CertStoreLocation "Cert:\CurrentUser\My"
        Write-Host "Certificate created in CurrentUser store" -ForegroundColor Green
    }
    catch {
        Write-Host "CurrentUser store failed, trying without Cert: drive..." -ForegroundColor Yellow
        
        # Alternative method without explicit store location
        try {
            $cert = New-SelfSignedCertificate `
                -Subject $certSubject `
                -KeyAlgorithm RSA `
                -KeyLength 2048 `
                -KeyExportPolicy Exportable `
                -KeyUsage DigitalSignature `
                -NotAfter $notAfter `
                -HashAlgorithm SHA256 `
                -KeySpec Signature `
                -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3")
            Write-Host "Certificate created using alternative method" -ForegroundColor Green
        }
        catch {
            throw "Failed to create certificate with any method: $($_.Exception.Message)"
        }
    }
    
    if ($cert -eq $null) {
        throw "Certificate creation failed - no certificate object returned"
    }

    Write-Host "Certificate created successfully!" -ForegroundColor Green
    Write-Host "Certificate thumbprint: $($cert.Thumbprint)" -ForegroundColor Cyan
    Write-Host "Certificate subject: $($cert.Subject)" -ForegroundColor Cyan
    Write-Host "Certificate valid until: $($cert.NotAfter)" -ForegroundColor Cyan

    # Export certificate to .p12 file with private key
    Write-Host "Exporting certificate with private key to $certPath..." -ForegroundColor Blue
    
    $fullCertPath = Join-Path (Get-Location) $certPath
    
    # Try different export methods
    $exportSuccess = $false
    
    # Method 1: Direct export using .NET
    try {
        Write-Host "Attempting direct export..." -ForegroundColor Gray
        $certBytes = $cert.Export("Pkcs12", $certPassword)
        [System.IO.File]::WriteAllBytes($fullCertPath, $certBytes)
        $exportSuccess = $true
        Write-Host "Direct export successful!" -ForegroundColor Green
    }
    catch {
        Write-Host "Direct export failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    # Method 2: PowerShell cmdlet export (if direct method failed)
    if (-not $exportSuccess) {
        try {
            Write-Host "Attempting PowerShell cmdlet export..." -ForegroundColor Gray
            $securePwd = ConvertTo-SecureString -String $certPassword -Force -AsPlainText
            Export-PfxCertificate -Cert $cert -FilePath $fullCertPath -Password $securePwd -Force | Out-Null
            $exportSuccess = $true
            Write-Host "PowerShell cmdlet export successful!" -ForegroundColor Green
        }
        catch {
            Write-Host "PowerShell cmdlet export failed: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    
    if (-not $exportSuccess) {
        throw "Failed to export certificate with any method"
    }

    # Verify the exported certificate
    Write-Host "Verifying exported certificate..." -ForegroundColor Blue
    $exportedCert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($fullCertPath, $certPassword)
    
    if ($exportedCert.HasPrivateKey) {
        Write-Host "Certificate contains private key" -ForegroundColor Green
    } else {
        Write-Host "Warning: Exported certificate missing private key" -ForegroundColor Red
        throw "Certificate export failed - no private key"
    }

    Write-Host ""
    Write-Host "SUCCESS: Code signing certificate created!" -ForegroundColor Green
    Write-Host "Certificate file: $certPath" -ForegroundColor Cyan
    Write-Host "Certificate password: (empty)" -ForegroundColor Cyan
    Write-Host "Valid until: $($cert.NotAfter)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can now build with: npm run build:win" -ForegroundColor White

}
catch {
    Write-Host "Error creating certificate: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Ensure you are running as Administrator" -ForegroundColor White
    Write-Host "2. Close any applications that might be using certificates" -ForegroundColor White
    Write-Host "3. Try disabling antivirus temporarily" -ForegroundColor White
    Write-Host "4. Ensure Windows certificate store is accessible" -ForegroundColor White
    exit 1
}