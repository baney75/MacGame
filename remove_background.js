const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Lime green chroma key color (typical green screen values)
const CHROMA_KEY_COLOR = { r: 0, g: 255, b: 0 }; // Pure lime green
const TOLERANCE = 60; // Color matching tolerance

async function removeGreenScreen(inputPath, outputPath) {
  try {
    // Read the image
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    // Extract raw pixel data
    const { data, info } = await image
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });
    
    // Process pixels to remove green
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Check if this pixel is green (within tolerance)
      const isGreen = g > (r + TOLERANCE) && g > (b + TOLERANCE);
      
      if (isGreen) {
        // Make it transparent
        data[i + 3] = 0;
      }
    }
    
    // Save the processed image
    await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    })
    .png()
    .toFile(outputPath);
    
    console.log(`✓ Processed: ${path.basename(inputPath)}`);
    return true;
  } catch (error) {
    console.error(`✗ Error processing ${path.basename(inputPath)}:`, error.message);
    return false;
  }
}

async function processDirectory(inputDir, outputDir) {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Get all files in input directory
  const files = fs.readdirSync(inputDir);
  
  console.log(`Processing ${files.length} files from ${inputDir}...\n`);
  
  let processed = 0;
  let failed = 0;
  
  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const ext = path.extname(file).toLowerCase();
    
    // Only process image files
    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      const outputPath = path.join(outputDir, path.basename(file, ext) + '.png');
      const success = await removeGreenScreen(inputPath, outputPath);
      
      if (success) {
        processed++;
      } else {
        failed++;
      }
    }
  }
  
  console.log(`\n✅ Complete! Processed: ${processed}, Failed: ${failed}`);
}

// Process Mac sprites
const spritesDir = path.join(__dirname, 'sprites');
const outputSpritesDir = path.join(__dirname, 'sprites_processed');

// Process main sprites directory
processDirectory(spritesDir, outputSpritesDir);

// Also process magnus folder if it exists
const magnusDir = path.join(__dirname, 'sprites', 'magnus');
const magnusOutputDir = path.join(__dirname, 'sprites_processed', 'magnus');

if (fs.existsSync(magnusDir)) {
  processDirectory(magnusDir, magnusOutputDir);
}