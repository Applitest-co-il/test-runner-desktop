const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const dotenv = require('dotenv');

// Load .env file from the correct location based on whether we're in development or packaged
const envPath = app.isPackaged
  ? path.join(process.resourcesPath, '.env')
  : path.join(__dirname, '..', '.env');

console.log('Loading .env from:', envPath);
const envResult = dotenv.config({ path: envPath, debug: true });

// If .env file wasn't loaded, try alternative locations
if (envResult.error && app.isPackaged) {
  console.log(
    'Failed to load .env from resources, trying alternative location...'
  );
  const altEnvPath = path.join(path.dirname(process.execPath), '.env');
  console.log('Trying .env from:', altEnvPath);
  const altResult = dotenv.config({ path: altEnvPath, debug: true });

  if (altResult.error) {
    console.log('Failed to load .env file, using default values');
    // Set default values if no .env file is found
    process.env.TR_PORT = process.env.TR_PORT || '8282';
    process.env.VIDEOS_PATH = process.env.VIDEOS_PATH || './report/videos';
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  }
}

let mainWindow;
let serverProcess = null;
let serverModule = null;
let originalConsoleLog = null;
let originalConsoleError = null;

// Appium process management
let appiumProcess = null;
let emulatorProcess = null;

// Get PORT after environment is loaded
const PORT = parseInt(process.env.TR_PORT) || 8282;
console.log('Using port:', PORT, 'from TR_PORT:', process.env.TR_PORT);

// Reusable function to kill server process gracefully
async function killServerProcess(timeoutMs = 3000) {
  if (!serverProcess) {
    return { success: true, message: 'Server is not running' };
  }

  try {
    if (serverModule && serverModule.stopServer) {
      // Use the server module's stop function
      serverModule.stopServer();
      serverProcess = null;
      serverModule = null;

      // Restore original console methods
      if (originalConsoleLog && originalConsoleError) {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        originalConsoleLog = null;
        originalConsoleError = null;
      }

      if (mainWindow) {
        mainWindow.webContents.send('server-status', { running: false });
        mainWindow.webContents.send('server-log', {
          type: 'info',
          message: 'Test Runner server stopped',
        });
      }

      return { success: true, message: 'Server stopped successfully' };
    } else {
      // Fallback for process-based server (shouldn't happen in packaged app)
      if (serverProcess.kill) {
        serverProcess.kill('SIGTERM');

        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            if (serverProcess && serverProcess.kill) {
              serverProcess.kill('SIGKILL');
            }
            resolve();
          }, timeoutMs);

          if (serverProcess && serverProcess.on) {
            serverProcess.on('close', () => {
              clearTimeout(timeout);
              resolve();
            });
          } else {
            clearTimeout(timeout);
            resolve();
          }
        });
      }

      serverProcess = null;
      return { success: true, message: 'Server stopped successfully' };
    }
  } catch (error) {
    console.error('Error stopping server:', error);
    serverProcess = null;
    serverModule = null;

    // Restore original console methods on error
    if (originalConsoleLog && originalConsoleError) {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      originalConsoleLog = null;
      originalConsoleError = null;
    }

    return {
      success: false,
      message: `Error stopping server: ${error.message}`,
    };
  }
}

function createWindow() {
  // Use icon from src folder for better reliability in packaged apps
  const iconPath = path.join(__dirname, 'icon.png');

  console.log('App is packaged:', app.isPackaged);
  console.log('Icon path:', iconPath);
  console.log('Icon exists:', require('fs').existsSync(iconPath));

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Allow network requests in portable build
      allowRunningInsecureContent: true, // Allow mixed content
    },
    icon: iconPath, // Applitest icon
    title: 'ApplitestLocalRunner',
    autoHideMenuBar: true, // Hide the menu bar
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close event to kill server first
  mainWindow.on('close', async (event) => {
    if (serverProcess) {
      event.preventDefault(); // Prevent immediate close

      const result = await killServerProcess(3000);
      if (!result.success) {
        console.error(
          'Failed to stop server during window close:',
          result.message
        );
      }

      // Now close the window
      mainWindow.destroy();
    }
  });
}

// Configure app for network access
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');

app.whenReady().then(createWindow);

app.on('window-all-closed', async () => {
  // Ensure server is stopped when app is closing
  const serverResult = await killServerProcess(3000);
  if (!serverResult.success) {
    console.error(
      'Failed to stop server during app quit:',
      serverResult.message
    );
  }

  // Ensure Appium processes are stopped when app is closing
  const appiumResult = await stopAppiumProcess();
  if (!appiumResult.success) {
    console.error(
      'Failed to stop Appium during app quit:',
      appiumResult.message
    );
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for server control
ipcMain.handle('start-server', async () => {
  if (serverProcess) {
    return { success: false, message: 'Server is already running' };
  }

  try {
    // Intercept console.log for the server module
    originalConsoleLog = console.log;
    originalConsoleError = console.error;

    // Override console methods to capture server output
    console.log = (...args) => {
      const message = args.join(' ');
      // Don't log the port message as we'll send our own
      if (!message.includes('Server started on port')) {
        if (mainWindow) {
          mainWindow.webContents.send('server-log', {
            type: 'info',
            message: message,
          });
        }
      }
      // Still call original for main process logging
      originalConsoleLog(...args);
    };

    console.error = (...args) => {
      const message = args.join(' ');
      if (mainWindow) {
        mainWindow.webContents.send('server-log', {
          type: 'error',
          message: message,
        });
      }
      originalConsoleError(...args);
    };

    // Import and start the server module
    serverModule = require('./api/app.js');

    if (serverModule && serverModule.startServer) {
      // Start the server using the module's function
      const server = serverModule.startServer(PORT);
      serverProcess = server;

      // Set up logging for server events (only errors, not listening)
      if (server) {
        server.on('error', (error) => {
          if (mainWindow) {
            mainWindow.webContents.send('server-log', {
              type: 'error',
              message: `Server error: ${error.message}`,
            });
          }
          serverProcess = null;
          serverModule = null;

          // Restore original console methods
          if (originalConsoleLog && originalConsoleError) {
            console.log = originalConsoleLog;
            console.error = originalConsoleError;
            originalConsoleLog = null;
            originalConsoleError = null;
          }
        });
      }

      if (mainWindow) {
        mainWindow.webContents.send('server-status', {
          running: true,
          port: PORT,
        });
        // Send only one server started message
        mainWindow.webContents.send('server-log', {
          type: 'info',
          message: `Test Runner server started on port ${PORT}`,
        });
      }

      return { success: true, message: `Server started on port ${PORT}` };
    } else {
      // Restore original console methods on failure
      if (originalConsoleLog && originalConsoleError) {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        originalConsoleLog = null;
        originalConsoleError = null;
      }
      return { success: false, message: 'Failed to load server module' };
    }
  } catch (error) {
    console.error('Error starting server:', error);
    serverProcess = null;
    serverModule = null;

    // Restore original console methods on error
    if (originalConsoleLog && originalConsoleError) {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      originalConsoleLog = null;
      originalConsoleError = null;
    }

    return {
      success: false,
      message: `Error starting server: ${error.message}`,
    };
  }
});

// Appium process management functions
async function startAppiumProcess(deviceAvd) {
  try {
    // Check if ANDROID_HOME is set
    if (!process.env.ANDROID_HOME) {
      return {
        success: false,
        message:
          'ANDROID_HOME environment variable is not set. Please set it to your Android SDK path.',
      };
    }

    // Check if port 4723 is already in use and kill any processes using it
    const portFreed = await forceKillProcessOnPort(4723);
    if (portFreed) {
      if (mainWindow) {
        mainWindow.webContents.send('appium-log', {
          type: 'info',
          message: 'Cleared existing process from Appium port 4723',
        });
      }
      // Wait a moment for port to be fully released
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Start Appium server
    appiumProcess = spawn(
      'powershell.exe',
      ['-Command', 'appium --relaxed-security'],
      {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    appiumProcess.stdout.on('data', (data) => {
      const message = data.toString();
      console.log('Appium:', message);
      if (mainWindow) {
        mainWindow.webContents.send('appium-log', {
          type: 'info',
          message: message.trim(),
        });
      }
    });

    appiumProcess.stderr.on('data', (data) => {
      const message = data.toString();
      console.error('Appium Error:', message);
      if (mainWindow) {
        mainWindow.webContents.send('appium-log', {
          type: 'error',
          message: message.trim(),
        });
      }
    });

    appiumProcess.on('close', (code) => {
      console.log(`Appium process exited with code ${code}`);
      appiumProcess = null;
      if (mainWindow) {
        mainWindow.webContents.send('appium-status', {
          appiumRunning: false,
          emulatorRunning: emulatorProcess !== null,
        });
        mainWindow.webContents.send('server-log', {
          type: 'info',
          message: `Appium server stopped (exit code: ${code})`,
        });
      }
    });

    // Start Android Emulator
    const emulatorPath = path.join(
      process.env.ANDROID_HOME,
      'emulator',
      'emulator.exe'
    );
    emulatorProcess = spawn(emulatorPath, ['-avd', deviceAvd], {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    emulatorProcess.stdout.on('data', (data) => {
      const message = data.toString();
      console.log('Emulator:', message);
      if (mainWindow) {
        mainWindow.webContents.send('adb-log', {
          type: 'info',
          message: message.trim(),
        });
      }
    });

    emulatorProcess.stderr.on('data', (data) => {
      const message = data.toString();
      console.error('Emulator Error:', message);
      if (mainWindow) {
        mainWindow.webContents.send('adb-log', {
          type: 'warning',
          message: message.trim(),
        });
      }
    });

    emulatorProcess.on('close', (code) => {
      console.log(`Emulator process exited with code ${code}`);
      emulatorProcess = null;
      if (mainWindow) {
        mainWindow.webContents.send('appium-status', {
          appiumRunning: appiumProcess !== null,
          emulatorRunning: false,
        });
        mainWindow.webContents.send('server-log', {
          type: 'info',
          message: `Android emulator stopped (exit code: ${code})`,
        });
      }
    });

    // Notify UI of status change
    if (mainWindow) {
      mainWindow.webContents.send('appium-status', {
        appiumRunning: true,
        emulatorRunning: true,
      });
      mainWindow.webContents.send('server-log', {
        type: 'info',
        message: `Started Appium server and Android emulator (${deviceAvd})`,
      });
    }

    return {
      success: true,
      message: `Appium server and Android emulator (${deviceAvd}) started successfully`,
    };
  } catch (error) {
    console.error('Failed to start Appium:', error);
    return {
      success: false,
      message: `Failed to start Appium: ${error.message}`,
    };
  }
}

// Helper function to wait for process to exit
function waitForProcessExit(process, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false); // Process didn't exit in time
    }, timeoutMs);

    process.on('exit', () => {
      clearTimeout(timeout);
      resolve(true); // Process exited
    });

    process.on('close', () => {
      clearTimeout(timeout);
      resolve(true); // Process closed
    });
  });
}

// Helper function to force kill process on specific port
async function forceKillProcessOnPort(port) {
  try {
    // Find process using the port
    const findProcess = spawn('netstat', ['-ano'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let netstatOutput = '';
    findProcess.stdout.on('data', (data) => {
      netstatOutput += data.toString();
    });

    await new Promise((resolve) => {
      findProcess.on('close', resolve);
    });

    // Parse netstat output to find PID using the port
    const lines = netstatOutput.split('\n');
    const portLine = lines.find(
      (line) => line.includes(`:${port}`) && line.includes('LISTENING')
    );

    if (portLine) {
      const parts = portLine.trim().split(/\s+/);
      const pid = parts[parts.length - 1];

      if (pid && pid !== '0') {
        // Kill the process
        const killProcess = spawn('taskkill', ['/F', '/PID', pid], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        await new Promise((resolve) => {
          killProcess.on('close', resolve);
        });

        if (mainWindow) {
          mainWindow.webContents.send('appium-log', {
            type: 'info',
            message: `Force killed process ${pid} using port ${port}`,
          });
        }

        return true;
      }
    }

    return false;
  } catch (error) {
    console.warn(`Error force killing process on port ${port}:`, error);
    return false;
  }
}

// Helper function to force kill all Appium-related processes
async function forceKillAppiumProcesses() {
  try {
    // Kill any remaining appium processes
    const killAppium = spawn(
      'taskkill',
      ['/F', '/IM', 'node.exe', '/FI', 'WINDOWTITLE eq appium*'],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    await new Promise((resolve) => {
      killAppium.on('close', resolve);
    });

    // Also try killing by command line containing appium
    const killAppiumCmd = spawn(
      'powershell',
      [
        '-Command',
        'Get-Process | Where-Object {$_.ProcessName -eq "node" -and $_.CommandLine -like "*appium*"} | Stop-Process -Force',
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    await new Promise((resolve) => {
      killAppiumCmd.on('close', resolve);
    });

    if (mainWindow) {
      mainWindow.webContents.send('appium-log', {
        type: 'info',
        message: 'Force killed any remaining Appium processes',
      });
    }
  } catch (error) {
    console.warn('Error force killing Appium processes:', error);
  }
}

async function stopAppiumProcess() {
  let results = [];

  try {
    // First, try to gracefully shutdown emulator using ADB
    if (emulatorProcess && process.env.ANDROID_HOME) {
      try {
        const adbPath = path.join(
          process.env.ANDROID_HOME,
          'platform-tools',
          'adb.exe'
        );

        // Send graceful shutdown command to emulator
        const adbKillProcess = spawn(adbPath, ['emu', 'kill'], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        // Log ADB shutdown attempt
        if (mainWindow) {
          mainWindow.webContents.send('adb-log', {
            type: 'info',
            message: 'Sending graceful shutdown command to emulator...',
          });
        }

        adbKillProcess.stdout.on('data', (data) => {
          if (mainWindow) {
            mainWindow.webContents.send('adb-log', {
              type: 'info',
              message: data.toString().trim(),
            });
          }
        });

        adbKillProcess.stderr.on('data', (data) => {
          if (mainWindow) {
            mainWindow.webContents.send('adb-log', {
              type: 'warning',
              message: data.toString().trim(),
            });
          }
        });

        // Wait for graceful shutdown (max 3 seconds)
        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, 3000);
          adbKillProcess.on('close', () => {
            clearTimeout(timeout);
            resolve();
          });
        });

        results.push('Emulator gracefully shut down via ADB');
      } catch (adbError) {
        console.warn(
          'ADB graceful shutdown failed, proceeding with force kill:',
          adbError
        );
        if (mainWindow) {
          mainWindow.webContents.send('adb-log', {
            type: 'warning',
            message: 'ADB graceful shutdown failed, using force kill...',
          });
        }
      }
    }

    // Force kill any remaining Appium processes using port and process name
    await forceKillAppiumProcesses();

    // Stop our tracked processes
    if (appiumProcess) {
      try {
        appiumProcess.kill('SIGKILL'); // Use SIGKILL for forceful termination
        await waitForProcessExit(appiumProcess, 5000);
      } catch (error) {
        console.warn('Error killing Appium process:', error);
      }
      appiumProcess = null;
      results.push('Appium server stopped');
    }

    if (emulatorProcess) {
      try {
        emulatorProcess.kill('SIGKILL'); // Use SIGKILL for forceful termination
        await waitForProcessExit(emulatorProcess, 5000);
      } catch (error) {
        console.warn('Error killing emulator process:', error);
      }
      emulatorProcess = null;
      if (!results.some((r) => r.includes('gracefully'))) {
        results.push('Android emulator stopped');
      }
    }

    // Double-check that Appium port is free
    const portKilled = await forceKillProcessOnPort(4723);
    if (portKilled) {
      results.push('Freed Appium port 4723');
    }

    // Notify UI
    if (mainWindow) {
      mainWindow.webContents.send('appium-status', {
        appiumRunning: false,
        emulatorRunning: false,
      });

      const message =
        results.length > 0
          ? results.join(', ')
          : 'Appium and emulator were not running';
      mainWindow.webContents.send('server-log', {
        type: 'info',
        message: message,
      });
    }

    return {
      success: true,
      message:
        results.length > 0
          ? results.join(', ')
          : 'Appium and emulator were not running',
    };
  } catch (error) {
    console.error('Failed to stop Appium:', error);
    return {
      success: false,
      message: `Failed to stop Appium: ${error.message}`,
    };
  }
}

ipcMain.handle('stop-server', async () => {
  const result = await killServerProcess(5000); // Longer timeout for manual stop

  if (mainWindow && result.success) {
    mainWindow.webContents.send('server-status', { running: false });
  }

  return result;
});

ipcMain.handle('get-server-status', async () => {
  return { running: serverProcess !== null, port: PORT };
});

// Appium IPC handlers
ipcMain.handle('start-appium', async (event, deviceAvd) => {
  return await startAppiumProcess(deviceAvd);
});

ipcMain.handle('stop-appium', async () => {
  return await stopAppiumProcess();
});

ipcMain.handle('get-appium-status', async () => {
  return {
    appiumRunning: appiumProcess !== null,
    emulatorRunning: emulatorProcess !== null,
  };
});
