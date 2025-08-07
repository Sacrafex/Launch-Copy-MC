# Launch Copy MC

A utility program that bundles and packages Minecraft profiles to be used on another computer.

## Features

- **Package Minecraft Profiles**: Create `.lcmc` files containing complete Minecraft profiles with mods, configs, resource packs, and more
- **Profile Information**: Automatically detects and stores useful information like creator, mod count, version, and creation date
- **Easy Import**: Simple drag-and-drop interface to import profiles into any Minecraft installation
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Launcher Integration**: Automatically adds imported profiles to your Minecraft launcher

## What's in a .lcmc file?

Each `.lcmc` file contains:
- Profile metadata (creator, creation date, Minecraft version, mod count)
- All mods in the `mods` folder
- Configuration files from the `config` folder
- Resource packs from the `resourcepacks` folder
- Shader packs from the `shaderpacks` folder
- World saves from the `saves` folder (optional)
- Profile settings and launcher configuration

## Installation

1. Download the latest release for your platform
2. Install the application
3. Launch Launch Copy MC

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/Launch-Copy-MC.git
cd Launch-Copy-MC
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run dev
```

### Building

To build the application for distribution:

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Usage

### Packaging a Profile

1. Click "Browse" to select your Minecraft directory
2. Choose the profile you want to package
3. Click "Package Profile"
4. Choose where to save the `.lcmc` file

### Importing a Profile

1. Switch to the "Import Profile" tab
2. Click "Select LCMC File" and choose your `.lcmc` file
3. Review the profile information
4. Click "Install Profile" to add it to your Minecraft launcher

## File Structure

```
Launch-Copy-MC/
├── src/
│   ├── main.js              # Main Electron process
│   ├── preload.js           # Preload script for secure IPC
│   ├── services/
│   │   ├── ProfileManager.js # Minecraft profile management
│   │   └── LCMCManager.js   # .lcmc file creation/extraction
│   └── renderer/
│       ├── index.html       # Main UI
│       ├── styles.css       # Application styles
│       └── renderer.js      # Frontend logic
├── assets/                  # Application icons
├── package.json            # Node.js project configuration
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
