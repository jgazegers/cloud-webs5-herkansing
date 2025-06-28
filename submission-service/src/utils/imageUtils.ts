import fs from "fs";
import { ImageInfo } from "../types";

// Helper function to validate base64 image
export function isValidBase64Image(base64String: string): boolean {
  // Check if it's a valid base64 data URL for images
  const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp|bmp);base64,([A-Za-z0-9+/=]+)$/;
  return base64Regex.test(base64String);
}

// Helper function to get image info from base64
export function getImageInfo(base64String: string): ImageInfo | null {
  if (!isValidBase64Image(base64String)) return null;
  
  const matches = base64String.match(/^data:image\/([^;]+);base64,(.+)$/);
  if (!matches) return null;
  
  const [, type, data] = matches;
  const size = Math.ceil(data.length * 0.75); // Approximate size in bytes
  
  return { type, size };
}

// Helper function to convert file to base64
export function fileToBase64(filePath: string, mimeType: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const base64String = fileBuffer.toString('base64');
  return `data:${mimeType};base64,${base64String}`;
}

// Helper function to extract base64 data from data URL
function extractBase64Data(dataUrl: string): string {
  const matches = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
  return matches ? matches[1] : dataUrl;
}

// Helper function to compare two base64 images
export function areImagesIdentical(image1: string, image2: string): boolean {
  if (!image1 || !image2) return false;
  
  // Extract just the base64 data (without the data:image/... prefix)
  const base64Data1 = extractBase64Data(image1);
  const base64Data2 = extractBase64Data(image2);
  
  return base64Data1 === base64Data2;
}
