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
echo "Importing certificate into keychain..."
security import "build/applitest-mac-cert.p12" -k "$KEYCHAIN_PATH" -P "" -T /usr/bin/codesign -T /usr/bin/security -T /usr/bin/productbuild

# Check if import was successful
if [ $? -ne 0 ]; then
    echo "Failed to import certificate, trying alternative method..."
    
    # Alternative method: import cert and key separately
    security import cert.crt -k "$KEYCHAIN_PATH" -T /usr/bin/codesign -T /usr/bin/security
    security import cert.key -k "$KEYCHAIN_PATH" -T /usr/bin/codesign -T /usr/bin/security
fi

# Set the certificate to be trusted for code signing
security set-key-partition-list -S apple-tool:,apple: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH" 2>/dev/null || true

# Also try to set trust settings for the certificate
security add-trusted-cert -d -r trustRoot -k "$KEYCHAIN_PATH" cert.crt 2>/dev/null || true

# Clean up temporary files
rm cert.key cert.crt cert.conf

# Verify certificate was created
echo "Verifying certificate creation..."
CERT_COUNT=$(security find-identity -v -p codesigning -s "Applitest Developer" | grep -c "Applitest Developer" || echo "0")

if [ "$CERT_COUNT" -gt 0 ]; then
    echo "✅ Certificate 'Applitest Developer' created successfully"
    security find-identity -v -p codesigning -s "Applitest Developer"
else
    echo "❌ Failed to create certificate 'Applitest Developer'"
    echo "Available certificates:"
    security find-identity -v -p codesigning
    echo "Checking all certificates in keychain:"
    security find-identity -v -p codesigning "$KEYCHAIN_PATH"
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