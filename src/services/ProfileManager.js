const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class ProfileManager {
  constructor(minecraftDir) {
    this.minecraftDir = minecraftDir || this.getDefaultMinecraftDir();
  }

  getDefaultMinecraftDir() {
    const platform = os.platform();
    const homeDir = os.homedir();
    
    switch (platform) {
      case 'win32':
        return path.join(homeDir, 'AppData', 'Roaming', '.minecraft');
      case 'darwin':
        return path.join(homeDir, 'Library', 'Application Support', 'minecraft');
      case 'linux':
        return path.join(homeDir, '.minecraft');
      default:
        return path.join(homeDir, '.minecraft');
    }
  }

  async getProfiles() {
    const launcherProfilesPath = path.join(this.minecraftDir, 'launcher_profiles.json');
    
    if (!await fs.pathExists(launcherProfilesPath)) {
      throw new Error('Minecraft launcher profiles not found. Please select the correct Minecraft directory.');
    }

    const profilesData = await fs.readJson(launcherProfilesPath);
    const profiles = [];

    for (const [profileId, profile] of Object.entries(profilesData.profiles || {})) {
      const profileInfo = {
        id: profileId,
        name: profile.name,
        gameDir: profile.gameDir || this.minecraftDir,
        lastVersionId: profile.lastVersionId,
        created: profile.created,
        lastUsed: profile.lastUsed,
        icon: profile.icon,
        type: profile.type || 'custom'
      };
      profileInfo.mods = await this.getModsInfo(profileInfo.gameDir);
      
      profiles.push(profileInfo);
    }

    return profiles;
  }

  async getModsInfo(gameDir) {
    const modsDir = path.join(gameDir, 'mods');
    const mods = [];

    if (await fs.pathExists(modsDir)) {
      const modFiles = await fs.readdir(modsDir);
      
      for (const modFile of modFiles) {
        if (modFile.endsWith('.jar')) {
          const modPath = path.join(modsDir, modFile);
          const stats = await fs.stat(modPath);
          
          mods.push({
            name: modFile,
            fileName: modFile,
            size: stats.size,
            modified: stats.mtime,
            path: modPath
          });
        }
      }
    }

    return mods;
  }

  async getProfileDirectories(profile) {
    const gameDir = profile.gameDir;
    const directories = ['mods', 'config', 'resourcepacks', 'saves', 'shaderpacks', 'screenshots'];
    const profileDirs = {};

    for (const dir of directories) {
      const dirPath = path.join(gameDir, dir);
      if (await fs.pathExists(dirPath)) {
        const stats = await fs.stat(dirPath);
        const files = await fs.readdir(dirPath);
        profileDirs[dir] = {
          path: dirPath,
          exists: true,
          fileCount: files.length,
          size: await this.getDirectorySize(dirPath)
        };
      } else {
        profileDirs[dir] = {
          path: dirPath,
          exists: false,
          fileCount: 0,
          size: 0
        };
      }
    }

    return profileDirs;
  }

  async getDirectorySize(dirPath) {
    let size = 0;
    try {
      const items = await fs.readdir(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          size += await this.getDirectorySize(itemPath);
        } else {
          size += stats.size;
        }
      }
    } catch (error) {
      console.warn(`Could not access directory: ${dirPath}`, error.message);
    }

    return size;
  }

  async installProfile(extractedProfilePath, options = {}) {
    const profileData = await fs.readJson(path.join(extractedProfilePath, 'profile.json'));
    const targetGameDir = path.join(this.minecraftDir, 'profiles', profileData.name);
    await fs.ensureDir(targetGameDir);
    const directoryOptions = {
      mods: options.installMods !== false,
      config: options.installConfigs !== false,
      resourcepacks: options.installResources === true,
      shaderpacks: options.installResources === true,
      saves: options.installSaves === true,
      screenshots: false
    };
    for (const [dir, shouldInstall] of Object.entries(directoryOptions)) {
      if (shouldInstall) {
        const sourceDir = path.join(extractedProfilePath, dir);
        const targetDir = path.join(targetGameDir, dir);
        
        if (await fs.pathExists(sourceDir)) {
          await fs.copy(sourceDir, targetDir);
        }
      }
    }
    await this.addProfileToLauncher(profileData, targetGameDir);
  }

  async addProfileToLauncher(profileData, gameDir) {
    const launcherProfilesPath = path.join(this.minecraftDir, 'launcher_profiles.json');
    let launcherProfiles = {};

    if (await fs.pathExists(launcherProfilesPath)) {
      launcherProfiles = await fs.readJson(launcherProfilesPath);
    }

    if (!launcherProfiles.profiles) {
      launcherProfiles.profiles = {};
    }

    const profileId = `lcmc_${Date.now()}`;
    launcherProfiles.profiles[profileId] = {
      name: profileData.name,
      gameDir: gameDir,
      lastVersionId: profileData.version,
      created: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      type: 'custom'
    };

    await fs.writeJson(launcherProfilesPath, launcherProfiles, { spaces: 2 });
  }
}

module.exports = ProfileManager;
