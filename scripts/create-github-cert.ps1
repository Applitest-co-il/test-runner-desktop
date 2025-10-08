# Script to create a self-signed certificate and prepare it for GitHub Secrets
# Run this script as Administrator to create a certificate for GitHub Actions

Write-Host "Creating self-signed certificate for GitHub Secrets..." -ForegroundColor Green

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "This script requires administrator privileges." -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    Write-Host "`nRight-click PowerShell and 'Run as Administrator'" -ForegroundColor Cyan
    exit 1
}

# Certificate details
$certSubject = "CN=Applitest, O=Applitest, C=IL"
$certPath = "build/applitest-cert.p12"
$certPassword = ""

# Ensure build directory exists
if (!(Test-Path "build")) {
    New-Item -ItemType Directory -Force -Path "build"
}

try {
    # Calculate expiration date (2 years for GitHub usage)
    $notAfter = (Get-Date).AddYears(2)
    
    Write-Host "Creating self-signed certificate..." -ForegroundColor Blue
    
    # Create the certificate using the working method (no Cert: drive dependency)
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

    Write-Host "Certificate created with thumbprint: $($cert.Thumbprint)" -ForegroundColor Green

    # Export certificate to .p12 file
    Write-Host "Exporting certificate to $certPath..." -ForegroundColor Blue
    
    $fullCertPath = Join-Path (Get-Location) $certPath
    $certBytes = $cert.Export("Pkcs12", $certPassword)
    [System.IO.File]::WriteAllBytes($fullCertPath, $certBytes)
    
    Write-Host "Certificate exported successfully!" -ForegroundColor Green

    # Convert to Base64 for GitHub Secrets
    Write-Host "`nConverting certificate to Base64 for GitHub Secrets..." -ForegroundColor Blue
    $base64Cert = [System.Convert]::ToBase64String($certBytes)
    
    # Save Base64 to a text file
    $base64Path = "build/certificate-base64.txt"
    $base64Cert | Out-File -FilePath $base64Path -Encoding UTF8
    
    Write-Host "`n" + "="*80 -ForegroundColor Cyan
    Write-Host "GITHUB SECRETS SETUP INSTRUCTIONS" -ForegroundColor Cyan
    Write-Host "="*80 -ForegroundColor Cyan
    
    Write-Host "`n1. Go to your GitHub repository" -ForegroundColor Yellow
    Write-Host "2. Navigate to Settings → Secrets and variables → Actions" -ForegroundColor Yellow
    Write-Host "3. Click 'New repository secret'" -ForegroundColor Yellow
    Write-Host "4. Create a secret named: WINDOWS_CERTIFICATE" -ForegroundColor Green
    Write-Host "5. Copy the content from: $base64Path" -ForegroundColor Green
    Write-Host "`nOr copy this Base64 value:" -ForegroundColor Yellow
    Write-Host "`n$base64Cert" -ForegroundColor Gray
    
    Write-Host "`n" + "="*80 -ForegroundColor Cyan
    Write-Host "VERIFICATION" -ForegroundColor Cyan
    Write-Host "="*80 -ForegroundColor Cyan
    Write-Host "Certificate file: $certPath" -ForegroundColor Green
    Write-Host "Base64 file: $base64Path" -ForegroundColor Green
    Write-Host "Certificate valid until: $($cert.NotAfter)" -ForegroundColor Green
    Write-Host "Certificate thumbprint: $($cert.Thumbprint)" -ForegroundColor Green
    
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Add the WINDOWS_CERTIFICATE secret to GitHub" -ForegroundColor White
    Write-Host "2. Push your code to trigger the GitHub Actions workflow" -ForegroundColor White
    Write-Host "3. The workflow will automatically sign your Windows executable" -ForegroundColor White

}
catch {
    Write-Host "Error creating certificate: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Ensure you're running as Administrator" -ForegroundColor Yellow
    Write-Host "2. Check if antivirus is blocking certificate creation" -ForegroundColor Yellow
    Write-Host "3. Try running on Windows 10/11 with PowerShell 5.0+" -ForegroundColor Yellow
    exit 1
}