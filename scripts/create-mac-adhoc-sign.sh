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

# Create temporary keychain
KEYCHAIN_PATH="$HOME/Library/Keychains/applitest-codesign.keychain-db"
KEYCHAIN_PASSWORD="temp123"

echo "Creating keychain..."
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH" 2>/dev/null || true
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security set-keychain-settings -t 3600 -l "$KEYCHAIN_PATH"

# Add to keychain search list
security list-keychains -d user -s "$KEYCHAIN_PATH" $(security list-keychains -d user | sed s/\"//g)

echo "Generating certificate using openssl..."

# Create a certificate using OpenSSL (more compatible approach)
cat > cert.conf << EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = Applitest Developer
OU = Applitest
O = Applitest
C = US

[v3_req]
keyUsage = keyEncipherment, dataEncipherment, digitalSignature
extendedKeyUsage = codeSigning
EOF

# Generate private key and certificate
openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 -keyout cert.key -out cert.crt -config cert.conf

# Convert to P12 format
openssl pkcs12 -export -out "build/applitest-mac-cert.p12" -inkey cert.key -in cert.crt -passout pass:

# Import the certificate into the keychain
security import "build/applitest-mac-cert.p12" -k "$KEYCHAIN_PATH" -P "" -T /usr/bin/codesign -T /usr/bin/security

# Set the certificate to be trusted for code signing
security set-key-partition-list -S apple-tool:,apple: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH" 2>/dev/null || true

# Clean up temporary files
rm cert.key cert.crt cert.conf

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

echo "Certificate created and installed in keychain"
echo "Certificate backup: build/applitest-mac-cert.p12"
echo ""
echo "To use this certificate:"
echo "1. Run: npm run build:mac"
echo "2. The certificate is now available in your keychain as 'Applitest Developer'"
echo ""
echo "Note: This is an ad-hoc signature. Users will still see warnings."
echo "For production, consider Apple Developer Program ($99/year)"