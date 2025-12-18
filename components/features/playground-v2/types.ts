export interface GenerationConfig {
  text: string;
  width: number;
  height: number;
  batch_size: number;
  seed?: number;
  model?: string;
  prompt: string;
  img_width: number;
  image_height: number;
  gen_num: number;
  base_model: string;
  lora: string;
  ref_image?: string;
}

export interface GenerationResult {
  imageUrl: string;
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
