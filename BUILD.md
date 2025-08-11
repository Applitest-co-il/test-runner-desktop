# Test Runner Desktop - Build Instructions

## 📦 Building Windows Distribution

### ✅ Build Status: WORKING

The build configuration has been optimized to work on Windows without administrator privileges. Code signing has been disabled to avoid permission issues.

**Latest Fixes**:

- Resolved the "spawn node ENOENT" error in portable builds by integrating the Express server directly into the Electron main process instead of spawning a separate Node.js process.
- Fixed environment variable loading in portable builds - the app now correctly uses port 8282 from .env file instead of defaulting to 3000.
- Fixed logging system: Removed duplicate server messages, captured console.log output from server operations, and cleaned up UI log display.

### Prerequisites

- Node.js installed
- All dependencies installed (`npm install`)

### Build Commands

#### 🚀 Quick Build (Both Installer & Portable)

```bash
npm run build:win
```

#### 📋 Build Options

1. **Portable Version** (No installation required)

   ```bash
   npm run build:win-portable
   ```

   - Creates a portable executable
   - No installation needed - just run the .exe
   - Output: `dist/Test Runner Desktop-1.0.0-portable.exe`

2. **Development Package** (For testing)

   ```bash
   npm run pack
   ```

   - Creates unpacked app directory
   - Useful for testing before final build
   - Output: `dist/win-unpacked/`

### 📁 Output Directory

All built files will be in the `dist/` folder:

dist/
├── Test Runner Desktop Setup 1.0.0.exe # Installer
├── Test Runner Desktop-1.0.0-portable.exe # Portable
└── win-unpacked/ # Unpacked (if using pack)

### 🔧 Build Configuration

The build configuration is in `package.json` under the `build` section:

- **Target**: Windows x64
- **Icon**: Uses official Applitest favicon from applitest.co.il
- **Publisher**: Applitest
- **Installation**: User-level installation (no admin required)

### 🎯 Distribution

- **Portable**: Best for testing or users who prefer portable apps

### 📝 Notes

- The app includes all necessary Node.js runtime and dependencies
- First run may take a moment as it initializes the embedded Node.js environment
- The `downloads` folder is included in the build for file storage
- The `reports` folder is included in the build for report storage
- Environment variables are loaded from the bundled `.env` file

### 🐛 Troubleshooting

**"spawn node ENOENT" Error (FIXED):**

- This error occurred when the portable app tried to spawn a separate Node.js process
- **Solution**: The server now runs directly within the Electron process, eliminating the need for external Node.js
- No action required - latest build includes the fix

**Missing Dependencies Error (FIXED):**

- **Problem**: "Cannot find module 'archiver-utils'" error in portable version
- **Cause**: Some transitive dependencies weren't being properly bundled in the asar archive
- **Solution**: Added explicit dependencies and configured asarUnpack to extract problematic modules
- **Added dependencies**: archiver-utils, zip-stream, readable-stream
- **Result**: Dependencies are now properly unpacked and accessible

**Server Logging Issues (FIXED):**

- **Problem**: Console output from server operations wasn't appearing in the UI logs after removing spawn
- **Problem**: Duplicate "Server started" messages were being displayed
- **Problem**: Unwanted "Express server is listening" message was showing
- **Solution**: Implemented console.log interception to capture server output and display it in the UI
- **Result**: All server operations (test runs, API calls, etc.) now show their logs in the UI log panel

**Server Starting on Wrong Port (FIXED):**

- The portable app was starting on port 3000 instead of the configured port 8282 from .env
- **Cause**: Environment variables weren't being loaded correctly in packaged apps
- **Solution**: Updated .env file loading to work in both development and packaged environments
- The app now correctly uses port 8282 as specified in the .env file

**If portable build takes too long:**

1. Use directory build for testing: `npm run pack`
2. Run from: `dist/win-unpacked/Test Runner Desktop.exe`
3. Directory build has all fixes and dependencies included
4. For distribution, manually zip the win-unpacked folder if needed

**If build fails:**

1. Ensure all dependencies are installed: `npm install`
2. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
3. Run `npm run postinstall` to rebuild native dependencies
