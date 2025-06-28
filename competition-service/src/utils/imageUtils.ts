import fs from "fs";

// Helper function to validate base64 image
export function isValidBase64Image(base64String: string): boolean {
  // Check if it's a valid base64 data URL for images
  const base64Regex =
    /^data:image\/(jpeg|jpg|png|gif|webp|bmp);base64,([A-Za-z0-9+/=]+)$/;
  return base64Regex.test(base64String);
}

// Helper function to get image info from base64
export function getImageInfo(
  base64String: string
): { type: string; size: number } | null {
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
  const base64String = fileBuffer.toString("base64");
  return `data:${mimeType};base64,${base64String}`;
}
