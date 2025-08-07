class LaunchCopyMC {
    constructor() {
        this.currentMinecraftDir = null;
        this.profiles = [];
        this.importedProfile = null;
        this.init();
    }

    init() {
        this.setupTabs();
        this.setupEventListeners();
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                
                // Remove active class from all tabs and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                button.classList.add('active');
                document.getElementById(`${tabName}-tab`).classList.add('active');
            });
        });
    }

    setupEventListeners() {
        // Package profile tab
        document.getElementById('select-dir-btn').addEventListener('click', () => {
            this.selectMinecraftDirectory();
        });

        // Import profile tab
        document.getElementById('import-btn').addEventListener('click', () => {
            this.importProfile();
        });

        document.getElementById('install-btn').addEventListener('click', () => {
            this.installProfile();
        });

        document.getElementById('cancel-import-btn').addEventListener('click', () => {
            this.cancelImport();
        });

        // Notification close
        document.getElementById('notification-close').addEventListener('click', () => {
            this.hideNotification();
        });
    }

    async selectMinecraftDirectory() {
        try {
            this.showLoading('Selecting Minecraft directory...');
            
            const directory = await window.electronAPI.selectMinecraftDirectory();
            
            if (directory) {
                this.currentMinecraftDir = directory;
                document.getElementById('minecraft-dir').value = directory;
                await this.loadProfiles();
            }
        } catch (error) {
            this.showNotification('Error selecting directory: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadProfiles() {
        try {
            this.showLoading('Loading Minecraft profiles...');
            
            this.profiles = await window.electronAPI.getMinecraftProfiles(this.currentMinecraftDir);
            this.renderProfiles();
            
            document.getElementById('profiles-section').style.display = 'block';
        } catch (error) {
            this.showNotification('Error loading profiles: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    renderProfiles() {
        const profilesList = document.getElementById('profiles-list');
        profilesList.innerHTML = '';

        if (this.profiles.length === 0) {
            profilesList.innerHTML = '<p>No profiles found in the selected directory.</p>';
            return;
        }

        this.profiles.forEach(profile => {
            const profileCard = this.createProfileCard(profile);
            profilesList.appendChild(profileCard);
        });
    }

    createProfileCard(profile) {
        const card = document.createElement('div');
        card.className = 'profile-card';

        const modLoader = this.detectModLoader(profile.mods);
        const totalSize = this.calculateProfileSize(profile);

        card.innerHTML = `
            <div class="profile-header">
                <div class="profile-name">${profile.name}</div>
                <div class="profile-version">${profile.lastVersionId || 'Unknown Version'}</div>
            </div>
            <div class="profile-details">
                <div class="profile-detail">
                    <div class="profile-detail-label">Mods</div>
                    <div class="profile-detail-value">${profile.mods.length} mod(s)</div>
                </div>
                <div class="profile-detail">
                    <div class="profile-detail-label">Mod Loader</div>
                    <div class="profile-detail-value">${modLoader}</div>
                </div>
                <div class="profile-detail">
                    <div class="profile-detail-label">Estimated Size</div>
                    <div class="profile-detail-value">${this.formatBytes(totalSize)}</div>
                </div>
                <div class="profile-detail">
                    <div class="profile-detail-label">Created</div>
                    <div class="profile-detail-value">${this.formatDate(profile.created)}</div>
                </div>
                <div class="profile-detail">
                    <div class="profile-detail-label">Last Used</div>
                    <div class="profile-detail-value">${this.formatDate(profile.lastUsed)}</div>
                </div>
                <div class="profile-detail">
                    <div class="profile-detail-label">Type</div>
                    <div class="profile-detail-value">${profile.type}</div>
                </div>
            </div>
            ${profile.mods.length > 0 ? this.createModsList(profile.mods) : ''}
            <div class="profile-actions">
                <button onclick="app.packageProfile('${profile.id}')" class="primary">Package Profile</button>
            </div>
        `;

        return card;
    }

    createModsList(mods) {
        if (mods.length === 0) return '';

        const modItems = mods.slice(0, 10).map(mod => 
            `<div class="mod-item">
                <span class="mod-name">${mod.name}</span>
                <span class="mod-size">${this.formatBytes(mod.size)}</span>
            </div>`
        ).join('');

        const moreText = mods.length > 10 ? `<div class="mod-item more-mods">... and ${mods.length - 10} more</div>` : '';

        return `
            <div class="profile-detail">
                <div class="profile-detail-label">Mods (${mods.length})</div>
                <div class="mod-list">
                    ${modItems}
                    ${moreText}
                </div>
            </div>
        `;
    }

    async packageProfile(profileId) {
        try {
            this.showLoading('Packaging profile...');
            
            const profile = this.profiles.find(p => p.id === profileId);
            if (!profile) {
                throw new Error('Profile not found');
            }

            const result = await window.electronAPI.packageProfile(profile);
            
            if (result.success) {
                this.showNotification(`Profile packaged successfully: ${result.path}`, 'success');
            } else if (result.cancelled) {
                this.showNotification('Packaging cancelled', 'warning');
            }
        } catch (error) {
            this.showNotification('Error packaging profile: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async importProfile() {
        try {
            this.showLoading('Importing profile...');
            
            const result = await window.electronAPI.importProfile();
            
            if (result.success) {
                this.importedProfile = result.profile;
                this.renderImportPreview();
                document.getElementById('import-preview').style.display = 'block';
                this.showNotification('Profile imported successfully', 'success');
            } else if (result.cancelled) {
                this.showNotification('Import cancelled', 'warning');
            }
        } catch (error) {
            this.showNotification('Error importing profile: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    renderImportPreview() {
        if (!this.importedProfile) return;

        const { metadata, profile } = this.importedProfile;
        const detailsContainer = document.getElementById('import-details');

        detailsContainer.innerHTML = `
            <div class="import-details">
                <div class="profile-summary">
                    <h3>${profile.name}</h3>
                    <span class="profile-version">${profile.version}</span>
                </div>
                
                <div class="detail-grid">
                    <div class="detail-row">
                        <span class="detail-label">Creator:</span>
                        <span class="detail-value">${metadata.creator}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Created:</span>
                        <span class="detail-value">${this.formatDate(metadata.created)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Minecraft Version:</span>
                        <span class="detail-value">${profile.version}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Mod Loader:</span>
                        <span class="detail-value">${metadata.compatibility?.modLoader || 'Unknown'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Total Size:</span>
                        <span class="detail-value">${this.formatBytes(metadata.totalSize || 0)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Mod Count:</span>
                        <span class="detail-value">${metadata.modCount}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Included Content:</span>
                        <span class="detail-value">${metadata.directories.join(', ')}</span>
                    </div>
                    ${metadata.compatibility?.requiredMods?.length > 0 ? `
                    <div class="detail-row">
                        <span class="detail-label">Required Mods:</span>
                        <span class="detail-value">${metadata.compatibility.requiredMods.join(', ')}</span>
                    </div>
                    ` : ''}
                </div>

                ${metadata.directoryInfo ? this.createDirectoryInfo(metadata.directoryInfo) : ''}
                
                ${metadata.mods.length > 0 ? `
                <div class="mods-section">
                    <h4>Included Mods (${metadata.mods.length})</h4>
                    <div class="mod-list">
                        ${metadata.mods.slice(0, 10).map(mod => 
                            `<div class="mod-item">
                                <span class="mod-name">${mod.name}</span>
                                <span class="mod-size">${this.formatBytes(mod.size)}</span>
                            </div>`
                        ).join('')}
                        ${metadata.mods.length > 10 ? `<div class="mod-item more-mods">... and ${metadata.mods.length - 10} more mods</div>` : ''}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    async installProfile() {
        if (!this.importedProfile || !this.currentMinecraftDir) {
            this.showNotification('Please select a Minecraft directory first', 'warning');
            return;
        }

        try {
            this.showLoading('Installing profile...');
            const options = {
                installMods: document.getElementById('install-mods').checked,
                installConfigs: document.getElementById('install-configs').checked,
                installResources: document.getElementById('install-resources').checked,
                installSaves: document.getElementById('install-saves').checked
            };
            
            const result = await window.electronAPI.installProfile(
                this.importedProfile.extractPath,
                this.currentMinecraftDir,
                options
            );
            
            if (result.success) {
                this.showNotification('Profile installed successfully! You can now use it in your Minecraft launcher.', 'success');
                this.cancelImport();
            }
        } catch (error) {
            this.showNotification('Error installing profile: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    cancelImport() {
        document.getElementById('import-preview').style.display = 'none';
        this.importedProfile = null;

        document.getElementById('install-mods').checked = true;
        document.getElementById('install-configs').checked = true;
        document.getElementById('install-resources').checked = false;
        document.getElementById('install-saves').checked = false;
    }

    showLoading(text) {
        document.getElementById('loading-text').textContent = text;
        document.getElementById('loading-overlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notification-text');
        
        notificationText.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'flex';

        setTimeout(() => {
            this.hideNotification();
        }, 5000);
    }

    hideNotification() {
        document.getElementById('notification').style.display = 'none';
    }

    formatDate(dateString) {
        if (!dateString) return 'Never';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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
        
        return 'Vanilla';
    }

    calculateProfileSize(profile) {

        const modCount = profile.mods.length;
        const avgModSize = 2 * 1024 * 1024; // 2MB average per mod
        const configSize = 50 * 1024; // 50KB for configs
        const baseSize = 10 * 1024 * 1024; // 10MB base size
        
        return (modCount * avgModSize) + configSize + baseSize;
    }

    createDirectoryInfo(directoryInfo) {
        if (!directoryInfo) return '';
        
        const dirs = Object.entries(directoryInfo);
        if (dirs.length === 0) return '';
        
        return `
            <div class="directory-info">
                <h4>Content Breakdown</h4>
                <div class="directory-grid">
                    ${dirs.map(([name, info]) => `
                        <div class="directory-item">
                            <span class="dir-name">${name}</span>
                            <span class="dir-count">${info.fileCount} files</span>
                            <span class="dir-size">${info.sizeFormatted}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
}

const app = new LaunchCopyMC();
