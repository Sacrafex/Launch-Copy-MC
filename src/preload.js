const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectMinecraftDirectory: () => ipcRenderer.invoke('select-minecraft-directory'),
  getMinecraftProfiles: (minecraftDir) => ipcRenderer.invoke('get-minecraft-profiles', minecraftDir),
  packageProfile: (profileData) => ipcRenderer.invoke('package-profile', profileData),
  importProfile: () => ipcRenderer.invoke('import-profile'),
  installProfile: (profilePath, minecraftDir, options) => ipcRenderer.invoke('install-profile', profilePath, minecraftDir, options)
});
