#!/bin/bash

# Ad-hoc signing script for macOS
# This creates a self-signed certificate for local development

echo "Creating ad-hoc signing certificate for macOS..."

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "This script must be run on macOS"
    exit 1
fi

# Create build directory if it doesn't exist
mkdir -p build

# Create a self-signed certificate for code signing
echo "Creating self-signed certificate..."

# Create temporary keychain
KEYCHAIN_PATH="$HOME/Library/Keychains/applitest-codesign.keychain-db"
KEYCHAIN_PASSWORD="temp123"

cat > cert-template.xml << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>keyUsage</key>
    <integer>5</integer>
    <key>subject</key>
    <string>CN=Applitest Developer,OU=Applitest,O=Applitest,C=US</string>
    <key>keySize</key>
    <integer>2048</integer>
    <key>publicKeyIsPermanent</key>
    <false/>
    <key>certType</key>
    <integer>1</integer>
    <key>serialNumber</key>
    <string>1</string>
    <key>subjectAltName</key>
    <string>DNS:localhost</string>
    <key>C</key>
    <string>US</string>
    <key>keychain</key>
    <string>$KEYCHAIN_PATH</string>
</dict>
</plist>
EOF

echo "Creating keychain..."
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security set-keychain-settings -t 3600 -l "$KEYCHAIN_PATH"

# Add to keychain search list
security list-keychains -d user -s "$KEYCHAIN_PATH" $(security list-keychains -d user | sed s/\"//g)

echo "Generating certificate..."
security create-certificate -c cert-template.xml -k "$KEYCHAIN_PATH"

# Verify certificate was created
echo "Verifying certificate creation..."
security find-identity -v -p codesigning -s "Applitest Developer"

if security find-identity -v -p codesigning -s "Applitest Developer" | grep -q "Applitest Developer"; then
    echo "✅ Certificate 'Applitest Developer' created successfully"
else
    echo "❌ Failed to create certificate 'Applitest Developer'"
    echo "Available certificates:"
    security find-identity -v -p codesigning
    exit 1
fi

# Export certificate for backup (optional)
echo "Exporting certificate..."
security export -k "$KEYCHAIN_PATH" -t identities -f pkcs12 -o "build/applitest-mac-cert.p12" -P ""

# Clean up
rm cert-template.xml

echo "Certificate created and installed in keychain"
echo "Certificate backup: build/applitest-mac-cert.p12"
echo ""
echo "To use this certificate:"
echo "1. Run: npm run build:mac"
echo "2. The certificate is now available in your keychain as 'Applitest Developer'"
echo ""
echo "Note: This is an ad-hoc signature. Users will still see warnings."
echo "For production, consider Apple Developer Program ($99/year)"