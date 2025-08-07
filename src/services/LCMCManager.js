const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const extractZip = require('extract-zip');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

class LCMCManager {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'lcmc');
  }

  async packageProfile(profileData, outputPath) {
    const tempPackageDir = path.join(this.tempDir, uuidv4());
    await fs.ensureDir(tempPackageDir);

    try {
      const profileDirs = await this.getProfileDirectoriesInfo(profileData.gameDir);
      const totalSize = await this.calculateProfileSize(profileData.gameDir);

      const lcmcData = {
        version: '1.0.0',
        name: profileData.name,
        creator: os.userInfo().username,
        created: new Date().toISOString(),
        mcVersion: profileData.lastVersionId,
        modCount: profileData.mods.length,
        description: `Minecraft profile: ${profileData.name}`,
        totalSize: totalSize,
        mods: profileData.mods.map(mod => ({
          name: mod.name,
          fileName: mod.fileName,
          size: mod.size,
          modified: mod.modified
        })),
        directories: [],
        directoryInfo: profileDirs,
        compatibility: {
          minecraftVersions: [profileData.lastVersionId],
          modLoader: this.detectModLoader(profileData.mods),
          requiredMods: this.getRequiredMods(profileData.mods)
        }
      };
      const gameDir = profileData.gameDir;
      const directories = ['mods', 'config', 'resourcepacks', 'saves', 'shaderpacks'];

      for (const dir of directories) {
        const sourceDir = path.join(gameDir, dir);
        const targetDir = path.join(tempPackageDir, dir);

        if (await fs.pathExists(sourceDir)) {
          await fs.copy(sourceDir, targetDir);
          lcmcData.directories.push(dir);
        }
      }
      await fs.writeJson(path.join(tempPackageDir, 'profile.json'), {
        name: profileData.name,
        version: profileData.lastVersionId,
        id: profileData.id,
        created: profileData.created,
        lastUsed: profileData.lastUsed,
        type: profileData.type,
        gameDir: profileData.gameDir
      }, { spaces: 2 });

      await fs.writeJson(path.join(tempPackageDir, 'lcmc.json'), lcmcData, { spaces: 2 });

      await this.createZipArchive(tempPackageDir, outputPath);

      await fs.remove(tempPackageDir);

      return lcmcData;
    } catch (error) {
      console.error('Error packaging profile:', error);
      await fs.remove(tempPackageDir);
      throw error;
    }
  }

  async createZipArchive(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      output.on('close', () => {
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  async extractProfile(lcmcPath) {
    const tempExtractDir = path.join(this.tempDir, uuidv4());
    await fs.ensureDir(tempExtractDir);

    try {
      await extractZip(lcmcPath, { dir: tempExtractDir });
      const lcmcDataPath = path.join(tempExtractDir, 'lcmc.json');
      if (!await fs.pathExists(lcmcDataPath)) {
        throw new Error('Invalid LCMC file: missing metadata');
      }

      const lcmcData = await fs.readJson(lcmcDataPath);
      const profileDataPath = path.join(tempExtractDir, 'profile.json');

      if (!await fs.pathExists(profileDataPath)) {
        throw new Error('Invalid LCMC file: missing profile data');
      }

      const profileData = await fs.readJson(profileDataPath);

      return {
        metadata: lcmcData,
        profile: profileData,
        extractPath: tempExtractDir
      };
    } catch (error) {
      await fs.remove(tempExtractDir);
      throw error;
    }
  }

  async validateLCMCFile(lcmcPath) {
    try {
      const profileInfo = await this.extractProfile(lcmcPath);
      await fs.remove(profileInfo.extractPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getProfileSize(profileData) {
    let totalSize = 0;
    const gameDir = profileData.gameDir;
    const directories = ['mods', 'config', 'resourcepacks', 'saves', 'shaderpacks'];

    for (const dir of directories) {
      const dirPath = path.join(gameDir, dir);
      if (await fs.pathExists(dirPath)) {
        totalSize += await this.getDirectorySize(dirPath);
      }
    }

    return totalSize;
  }

  async getDirectorySize(dirPath) {
    let size = 0;
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

    return size;
  }

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  async getProfileDirectoriesInfo(gameDir) {
    const directories = ['mods', 'config', 'resourcepacks', 'saves', 'shaderpacks'];
    const dirInfo = {};

    for (const dir of directories) {
      const dirPath = path.join(gameDir, dir);
      if (await fs.pathExists(dirPath)) {
        const files = await fs.readdir(dirPath);
        const size = await this.getDirectorySize(dirPath);
        dirInfo[dir] = {
          fileCount: files.length,
          size: size,
          sizeFormatted: this.formatBytes(size)
        };
      }
    }

    return dirInfo;
  }

  async calculateProfileSize(gameDir) {
    const directories = ['mods', 'config', 'resourcepacks', 'saves', 'shaderpacks'];
    let totalSize = 0;

    for (const dir of directories) {
      const dirPath = path.join(gameDir, dir);
      if (await fs.pathExists(dirPath)) {
        totalSize += await this.getDirectorySize(dirPath);
      }
    }

    return totalSize;
  }

  detectModLoader(mods) {
    const forgeIndicators = ['forge', 'fml', 'minecraftforge'];
    const fabricIndicators = ['fabric', 'fabricloader', 'quilt'];
    
    for (const mod of mods) {
      const modName = mod.name.toLowerCase();
      if (forgeIndicators.some(indicator => modName.includes(indicator))) {
        return 'Forge';
      }
      if (fabricIndicators.some(indicator => modName.includes(indicator))) {
        return 'Fabric';
      }
    }
    
    return 'Unknown';
  }

  getRequiredMods(mods) {
    const requiredMods = [];
    const commonRequiredMods = [
      'forge', 'fabric', 'quilt', 'architectury', 'cloth-config', 
      'jei', 'rei', 'emi', 'optifine', 'sodium', 'iris'
    ];

    for (const mod of mods) {
      const modName = mod.name.toLowerCase();
      for (const required of commonRequiredMods) {
        if (modName.includes(required) && !requiredMods.includes(required)) {
          requiredMods.push(required);
        }
      }
    }

    return requiredMods;
  }
}

module.exports = LCMCManager;
