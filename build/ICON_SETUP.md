# Icon Setup Guide

## What You Need

A `.ico` file named `icon.ico` in this folder for your Windows app icon.

## Steps to Create Your Icon

### Option 1: Use Your Logo.png (Quick)

1. Go to https://www.icoconverter.com/
2. Upload your `Logo.png` file
3. Select "Custom sizes" and choose: 256x256, 128x128, 64x64, 48x48, 32x32, 16x16
4. Click "Convert ICO"
5. Download the generated `icon.ico`
6. Place it in this `build/` folder

### Option 2: Create Custom Icon

1. Design a 512x512 PNG image (square, transparent background recommended)
2. Use https://www.icoconverter.com/ to convert to .ico
3. Download and place in this `build/` folder as `icon.ico`

## After Adding Icon

The icon will be used for:
- ✅ Installed app icon (desktop shortcut, start menu, taskbar)
- ✅ Running window icon
- ✅ Installer icon

Just rebuild the app:
```bash
npm run build:win
```

## Icon File Requirements

- **Name**: Must be exactly `icon.ico`
- **Location**: Must be in `build/` folder
- **Format**: Windows ICO format
- **Recommended sizes**: Multiple sizes (16x16 to 256x256)

## Tips

- Use a simple, recognizable design
- Avoid fine details (they won't show at small sizes)
- Use your HomeCare Montana logo for brand consistency
- Test how it looks at 16x16 and 32x32 (common sizes)
