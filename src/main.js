const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const ProfileManager = require('./services/ProfileManager');
const LCMCManager = require('./services/LCMCManager');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    width: 800,
    height: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  mainWindow.loadFile('src/renderer/index.html');

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('select-minecraft-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Minecraft Directory'
  });
  
  if (!result.canceled) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('get-minecraft-profiles', async (event, minecraftDir) => {
  try {
    const profileManager = new ProfileManager(minecraftDir);
    return await profileManager.getProfiles();
  } catch (error) {
    console.error('Error getting profiles:', error);
    throw error;
  }
});

ipcMain.handle('package-profile', async (event, profileData) => {
  try {
    const lcmcManager = new LCMCManager();
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${profileData.name}.lcmc`,
      filters: [
        { name: 'Launch Copy MC Files', extensions: ['lcmc'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled) {
      await lcmcManager.packageProfile(profileData, result.filePath);
      return { success: true, path: result.filePath };
    }
    return { success: false, cancelled: true };
  } catch (error) {
    console.error('Error packaging profile:', error);
    throw error;
  }
});

ipcMain.handle('import-profile', async (event) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Launch Copy MC Files', extensions: ['lcmc'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled) {
      const lcmcManager = new LCMCManager();
      const profileInfo = await lcmcManager.extractProfile(result.filePaths[0]);
      return { success: true, profile: profileInfo };
    }
    return { success: false, cancelled: true };
  } catch (error) {
    console.error('Error importing profile:', error);
    throw error;
  }
});

ipcMain.handle('install-profile', async (event, profilePath, minecraftDir, options = {}) => {
  try {
    const profileManager = new ProfileManager(minecraftDir);
    await profileManager.installProfile(profilePath, options);
    return { success: true };
  } catch (error) {
    console.error('Error installing profile:', error);
    throw error;
  }
});
