export interface GenerationConfig {
  prompt: string;
  img_width: number;
  image_height: number;
  gen_num: number;
  base_model: string;
  image_size?: '1K' | '2K' | '4K';
  lora?: string;
  ref_image?: string;
}

export interface GenerationResult {
  id: string;
  imageUrl?: string;
  imageUrls?: string[];

  config: GenerationConfig;
  timestamp: string;
  isLoading?: boolean;
  savedPath?: string;
}

export interface UploadedImage {
  file: File;
  base64: string;
  previewUrl: string;
  path?: string;
}
