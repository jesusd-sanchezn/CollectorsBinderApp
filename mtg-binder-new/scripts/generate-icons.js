/**
 * Icon Generation Script
 * 
 * This script helps generate PNG icons from the SVG source.
 * 
 * Prerequisites:
 * - Install sharp: npm install --save-dev sharp
 * 
 * Usage:
 * node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('❌ Error: sharp is not installed.');
  console.log('\n📦 To install sharp, run:');
  console.log('   npm install --save-dev sharp');
  console.log('\n💡 Alternative: Use an online SVG to PNG converter:');
  console.log('   https://cloudconvert.com/svg-to-png');
  console.log('   Upload assets/icon-source.svg and set size to 1024x1024');
  process.exit(1);
}

const svgPath = path.join(__dirname, '../assets/icon-source.svg');
const iconPath = path.join(__dirname, '../assets/icon.png');
const adaptiveIconPath = path.join(__dirname, '../assets/adaptive-icon.png');

async function generateIcons() {
  try {
    // Check if SVG exists
    if (!fs.existsSync(svgPath)) {
      console.error(`❌ SVG file not found: ${svgPath}`);
      process.exit(1);
    }

    console.log('🎨 Generating icons from SVG...');

    // Generate standard icon (1024x1024)
    await sharp(svgPath)
      .resize(1024, 1024)
      .png()
      .toFile(iconPath);
    console.log('✅ Generated: assets/icon.png (1024x1024)');

    // Generate adaptive icon (1024x1024)
    await sharp(svgPath)
      .resize(1024, 1024)
      .png()
      .toFile(adaptiveIconPath);
    console.log('✅ Generated: assets/adaptive-icon.png (1024x1024)');

    console.log('\n✨ Icon generation complete!');
    console.log('📱 Your icons are ready for Google Play Store.');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    console.log('\n💡 Alternative: Use an online SVG to PNG converter:');
    console.log('   https://cloudconvert.com/svg-to-png');
    process.exit(1);
  }
}

generateIcons();

