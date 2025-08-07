# Development Guide for Launch Copy MC

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run in Development Mode**
   ```bash
   npm run dev
   ```
   Or use the VS Code task: `Ctrl+Shift+P` → "Tasks: Run Task" → "Launch Copy MC - Development"

3. **Build the Application**
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── main.js              # Main Electron process
├── preload.js           # Preload script for secure IPC
├── services/
│   ├── ProfileManager.js # Minecraft profile management
│   └── LCMCManager.js   # .lcmc file creation/extraction
└── renderer/
    ├── index.html       # Main UI
    ├── styles.css       # Application styles
    └── renderer.js      # Frontend logic
```

## Key Features

### ProfileManager.js
- Detects Minecraft installations
- Reads launcher profiles
- Scans for mods and configurations
- Installs imported profiles

### LCMCManager.js
- Creates ZIP archives with profile data
- Generates metadata for .lcmc files
- Extracts and validates imported profiles
- Manages temporary files

### Main Process (main.js)
- Handles file dialogs
- Manages IPC communication
- Creates the main window

### Renderer Process (renderer.js)
- User interface logic
- Profile display and management
- Import/export workflows

## Development Tasks

### Available npm Scripts
- `npm start` - Run in production mode
- `npm run dev` - Run in development mode with DevTools
- `npm run build` - Build distributable packages
- `npm run build:win` - Build for Windows
- `npm run build:mac` - Build for macOS
- `npm run build:linux` - Build for Linux
- `npm run clean` - Clean build artifacts

### VS Code Tasks
- **Launch Copy MC - Development** - Run with DevTools open
- **Launch Copy MC - Production** - Run in production mode
- **Build Application** - Create distributable packages
- **Clean Build** - Remove build artifacts

## .lcmc File Format

The .lcmc files are ZIP archives containing:

```
profile.json         # Profile metadata
lcmc.json           # Package metadata
mods/               # Mod files
config/             # Configuration files
resourcepacks/      # Resource packs
saves/              # World saves (optional)
shaderpacks/        # Shader packs
```

### Metadata Structure

**lcmc.json:**
```json
{
  "version": "1.0.0",
  "name": "Profile Name",
  "creator": "Username",
  "created": "2024-01-01T12:00:00.000Z",
  "mcVersion": "1.20.1",
  "modCount": 42,
  "description": "Profile description",
  "mods": [...],
  "directories": [...]
}
```

## Adding New Features

### Adding a New Profile Directory
1. Update `ProfileManager.getProfileDirectories()`
2. Add directory to packaging in `LCMCManager.packageProfile()`
3. Update installation in `ProfileManager.installProfile()`

### Adding New Metadata Fields
1. Update `LCMCManager.packageProfile()` to include new fields
2. Update UI in `renderer.js` to display new information
3. Update validation in `LCMCManager.extractProfile()`

## Security Considerations

- File operations are restricted to selected directories
- IPC communication uses context isolation
- User input is validated before file operations
- Temporary files are cleaned up after operations

## Debugging

1. **Main Process**: Use VS Code debugger with "Debug Main Process" configuration
2. **Renderer Process**: Open DevTools in development mode (`npm run dev`)
3. **File Operations**: Check temp directory for extracted files during debugging

## Building for Distribution

The application uses electron-builder for creating distributable packages:

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win
npm run build:mac
npm run build:linux
```

Built packages will be in the `dist/` directory.

## Troubleshooting

### Common Issues

1. **"Minecraft directory not found"**
   - Ensure the selected directory contains `launcher_profiles.json`
   - Check that Minecraft has been run at least once

2. **"Profile packaging failed"**
   - Verify all profile directories exist and are readable
   - Check available disk space for temporary files

3. **"Profile installation failed"**
   - Ensure target Minecraft directory is writable
   - Check that no launcher processes are running

### Debug Mode Features

- DevTools automatically open
- Detailed console logging
- Error stack traces
- Performance monitoring
