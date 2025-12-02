export interface GenerationConfig {
  text: string;
  width: number;
  height: number;
  batch_size: number;
  seed?: number;
  model?: string;
}

export interface GenerationResult {
  imageUrl: string;
  config: GenerationConfig;
  timestamp: string;
  isLoading?: boolean;
}

export interface UploadedImage {
  file: File;
  base64: string;
  previewUrl: string;
}
