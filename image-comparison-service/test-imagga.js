// Simple test script for Imagga API integration
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Import the service (we'll use a compiled version)
async function testImaggaService() {
  try {
    // Check if we have test images
    const testImagesDir = path.join(__dirname, '..', 'rest', 'test-images');
    
    if (!fs.existsSync(testImagesDir)) {
      console.log('❌ Test images directory not found:', testImagesDir);
      return;
    }
    
    const targetImagePath = path.join(testImagesDir, 'target.jpg');
    const submissionImagePath = path.join(testImagesDir, 'submission-1.jpg');
    
    if (!fs.existsSync(targetImagePath) || !fs.existsSync(submissionImagePath)) {
      console.log('❌ Test images not found');
      console.log('Target:', fs.existsSync(targetImagePath) ? '✅' : '❌', targetImagePath);
      console.log('Submission:', fs.existsSync(submissionImagePath) ? '✅' : '❌', submissionImagePath);
      return;
    }
    
    // Read images and convert to base64
    const targetImage = fs.readFileSync(targetImagePath).toString('base64');
    const submissionImage = fs.readFileSync(submissionImagePath).toString('base64');
    
    console.log('📷 Target image size:', Math.round(targetImage.length / 1024), 'KB');
    console.log('📷 Submission image size:', Math.round(submissionImage.length / 1024), 'KB');
    
    // Check environment variables
    if (!process.env.IMAGGA_API_KEY || !process.env.IMAGGA_API_SECRET) {
      console.log('❌ Imagga API credentials not found in environment variables');
      console.log('Please set IMAGGA_API_KEY and IMAGGA_API_SECRET');
      return;
    }
    
    console.log('✅ Environment variables configured');
    console.log('✅ Test images loaded successfully');
    console.log('🔄 Ready to test Imagga service...');
    
    // We would test the actual service here, but we need to compile TypeScript first
    console.log('📝 To test the service:');
    console.log('1. Make sure your API keys are in the environment');
    console.log('2. Start the image-comparison-service');
    console.log('3. Send a test message via RabbitMQ or HTTP endpoint');
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
  }
}

testImaggaService();
