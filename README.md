# Applitest Local Runner Desktop

A cross-platform desktop application for running automated tests locally using the Applitest test automation framework.

## 🚀 Overview

Applitest Local Runner Desktop provides a user-friendly graphical interface for the [@applitest/test-runner](https://www.npmjs.com/package/@applitest/test-runner) library. It allows developers and QA teams to run automated tests locally without needing command-line expertise.

### ✨ Features

- **Cross-Platform**: Runs on Windows, macOS, and Linux
- **User-Friendly Interface**: Simple start/stop controls with real-time status
- **Local Test Execution**: Run tests locally
- **Live Logs**: Real-time test execution logs and output

## 📦 Installation

### Download Pre-built Binaries

1. Go to the [Downloads](https://app.applitest.co.il/infra/downloads) page
2. Download the appropriate version for your operating system:
    - **Windows**: `ApplitestLocalRunner-win.exe`
    - **macOS**: `ApplitestLocalRunner-mac.dmg`

### System Requirements

- **Windows**: Windows 10 or later
- **macOS**: macOS 10.15 Catalina or later
- **Node.js**: 18.x or later (for development)

## 🔧 Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 18.x or later
- [Git](https://git-scm.com/)

### Local Development

```bash
# Clone the repository
git clone https://github.com/Applitest-co-il/test-runner-desktop.git
cd test-runner-desktop

# Install dependencies
npm install

# Start in development mode
npm run dev

# Debug mode with DevTools
npm run debug
```

### Building

```bash
# Build for current platform
npm run build:win    # Windows portable
npm run build:mac    # macOS DMG

```

## 📋 Usage

1. **Launch** the application
2. **Configure** your test settings using the configuration editor
3. **Start** the local runner by clicking the Start button
4. **Monitor** test execution through the real-time status and logs
5. **Download** test results and reports when complete

## 🛡️ Security Warnings

### Windows

Users may see "Windows protected your PC" warnings due to self-signed certificates. See [DOWNLOAD-INSTRUCTIONS.md](DOWNLOAD-INSTRUCTIONS.md) for bypass instructions.

### macOS

Users may see "unidentified developer" warnings. See [DOWNLOAD-INSTRUCTIONS-MAC.md](DOWNLOAD-INSTRUCTIONS-MAC.md) for bypass instructions.

## 🏗️ Project Structure

```
src/
├── main.js           # Electron main process
├── preload.js        # Preload script for renderer
├── api/              # Backend API handlers
│   ├── app.js        # Express server setup
│   └── download-file.js # File download handling
└── renderer/         # Frontend UI
    ├── index.html    # Main UI
    ├── renderer.js   # Frontend logic
    └── styles.css    # Styling

scripts/              # Build and signing scripts
build/               # Icons and certificates
.github/workflows/   # CI/CD automation
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Commands

```bash
npm run format:check    # Check code formatting
npm run format:write    # Fix code formatting
npm run lint:check      # Check for linting issues
npm run lint:fix        # Fix linting issues
```

## 📖 Documentation

- [Code Signing Setup](SIGNING.md)
- [Windows Download Instructions](DOWNLOAD-INSTRUCTIONS.md)
- [macOS Download Instructions](DOWNLOAD-INSTRUCTIONS-MAC.md)
- [Build Instructions](BUILD.md)

## 📄 License

See [LICENSE](LICENSE) for details.

---

**Built with ❤️ using [Electron](https://electronjs.org/)**
