/**
 * Script to generate favicon with white background
 * Requires: sharp (npm install sharp)
 * 
 * Run: node scripts/generate-favicon.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFavicon() {
  try {
    const logoPath = path.join(__dirname, '../public/images/Marketing-malindtech (1).png');
    const faviconPath = path.join(__dirname, '../public/favicon.png');
    const appIconPath = path.join(__dirname, '../app/icon.png');

    // Check if logo exists
    if (!fs.existsSync(logoPath)) {
      console.error('❌ Logo not found at:', logoPath);
      process.exit(1);
    }

    console.log('🖼️  Generating favicon with white background...');

    // Create favicon sizes
    const sizes = [
      { size: 32, output: faviconPath },
      { size: 192, output: appIconPath }, // For Next.js app directory
      { size: 512, output: path.join(__dirname, '../public/icon-512.png') },
    ];

    for (const { size, output } of sizes) {
      // Create a white background
      const whiteBackground = sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      });

      // Composite the logo on white background
      await whiteBackground
        .composite([
          {
            input: await sharp(logoPath)
              .resize(size - 4, size - 4, { 
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
              })
              .toBuffer(),
            top: 2,
            left: 2,
          }
        ])
        .png()
        .toFile(output);

      console.log(`✅ Created ${size}x${size} icon: ${path.basename(output)}`);
    }

    console.log('\n🎉 Favicon generation complete!');
    console.log('📝 Next.js will automatically use app/icon.png as favicon');
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ Error: sharp is not installed');
      console.log('💡 Install it with: npm install sharp');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

generateFavicon();

