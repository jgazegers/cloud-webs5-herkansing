// src/services/imaggaService.ts
import axios from 'axios';
import FormData from 'form-data';

export interface ImaggaSimilarityResponse {
  score: number;
  // Add more fields as needed based on Imagga API response
}

export class ImaggaService {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string = 'https://api.imagga.com/v2';

  constructor() {
    this.apiKey = process.env.IMAGGA_API_KEY || '';
    this.apiSecret = process.env.IMAGGA_API_SECRET || '';
    
    if (!this.apiKey || !this.apiSecret) {
      console.warn('⚠️ Imagga API credentials not configured. Set IMAGGA_API_KEY and IMAGGA_API_SECRET environment variables.');
    }
  }

  /**
   * Compare two base64 images using Imagga API
   */
  async compareImages(targetImage: string, submissionImage: string): Promise<ImaggaSimilarityResponse> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Imagga API credentials not configured');
    }

    if (!targetImage || !submissionImage) {
      throw new Error('Both target and submission images are required');
    }

    try {
      console.log('🔄 Starting image comparison with Imagga API...');
      
      // Clean and validate base64 images
      const cleanTargetImage = this.cleanBase64Image(targetImage);
      const cleanSubmissionImage = this.cleanBase64Image(submissionImage);
      
      // Detect image formats
      const targetFormat = this.detectImageFormat(targetImage);
      const submissionFormat = this.detectImageFormat(submissionImage);
      
      console.log(`📷 Target image format: ${targetFormat}, Submission image format: ${submissionFormat}`);
      
      // Create basic auth header
      // TODO: Remove
      console.log(`${this.apiKey}:${this.apiSecret}`)
      const auth = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
      
      // Use the images-similarity endpoint with general_v3 categorizer
      const url = `${this.baseUrl}/images-similarity/categories/general_v3`;
      
      // Prepare form data for the POST request
      const formData = new FormData();
      
      // Convert base64 images to buffers and append to form data
      const targetBuffer = Buffer.from(cleanTargetImage, 'base64');
      const submissionBuffer = Buffer.from(cleanSubmissionImage, 'base64');
      
      formData.append('image', targetBuffer, `target.${targetFormat}`);
      
      formData.append('image2', submissionBuffer, `submission.${submissionFormat}`);

      console.log('📤 Sending images to Imagga API for similarity comparison...');
      
      const response = await axios.post(url, formData, {
        headers: {
          'Authorization': `Basic ${auth}`,
          ...formData.getHeaders()
        },
        timeout: 30000 // 30 second timeout
      });

      if (response.data.status.type === 'success') {
        const distance = response.data.result.distance;
        
        // Convert distance to similarity score (0-100)
        // Lower distance means higher similarity
        // We'll use an inverse relationship: score = 100 - (distance * scale_factor)
        // Adjust scale factor based on typical distance ranges from Imagga
        const score = Math.max(0, Math.min(100, 100 - (distance * 20)));
        
        console.log(`✅ Image comparison successful - Distance: ${distance}, Score: ${score.toFixed(2)}%`);
        
        return {
          score: Math.round(score * 100) / 100 // Round to 2 decimal places
        };
      } else {
        throw new Error(`Imagga API error: ${response.data.status.text}`);
      }
      
    } catch (error) {
      console.error('❌ Error calling Imagga API:', error);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
          throw new Error(`Imagga API request failed: ${error.response.status} - ${error.response.data?.status?.text || error.message}`);
        } else if (error.request) {
          throw new Error('Imagga API request failed: No response received');
        }
      }
      throw error;
    }
  }

  /**
   * Detect image format from base64 string
   */
  private detectImageFormat(base64Image: string): string {
    // Check for data URL prefix
    if (base64Image.startsWith('data:image/')) {
      const match = base64Image.match(/data:image\/([^;]+)/);
      return match ? match[1] : 'jpeg';
    }
    
    // Check magic bytes at the beginning of the base64 decoded data
    const firstBytes = base64Image.substring(0, 20);
    const decoded = Buffer.from(firstBytes, 'base64');
    
    // Check for common image signatures
    if (decoded[0] === 0xFF && decoded[1] === 0xD8) return 'jpeg';
    if (decoded[0] === 0x89 && decoded[1] === 0x50 && decoded[2] === 0x4E && decoded[3] === 0x47) return 'png';
    if (decoded[0] === 0x47 && decoded[1] === 0x49 && decoded[2] === 0x46) return 'gif';
    if (decoded[0] === 0x42 && decoded[1] === 0x4D) return 'bmp';
    if (decoded[0] === 0x52 && decoded[1] === 0x49 && decoded[2] === 0x46 && decoded[3] === 0x46) return 'webp';
    
    // Default to jpeg
    return 'jpeg';
  }

  /**
   * Clean base64 image string (remove data URL prefix if present)
   */
  private cleanBase64Image(base64Image: string): string {
    if (base64Image.startsWith('data:image/')) {
      return base64Image.split(',')[1];
    }
    return base64Image;
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.apiSecret);
  }
}
