import { ComponentType } from "@/types/features/mapping-editor";

export const PLAYGROUND_TARGETS = [
  { key: 'prompt', label: '提示词 (Prompt)', type: 'text' as ComponentType, supportedTypes: ['string'], icon: '📝' },
  { key: 'width', label: '宽度 (Width)', type: 'number' as ComponentType, supportedTypes: ['number', 'string'], icon: '📏' },
  { key: 'height', label: '高度 (Height)', type: 'number' as ComponentType, supportedTypes: ['number', 'string'], icon: '📏' },
  { key: 'batch_size', label: '生成数量 (Batch Size)', type: 'number' as ComponentType, supportedTypes: ['number', 'string'], icon: '🔢' },
  { key: 'base_model', label: '基础模型 (Base Model)', type: 'text' as ComponentType, supportedTypes: ['string'], icon: '🤖' },
  { key: 'lora1', label: 'LoRA模型 1 (LoRA 1)', type: 'text' as ComponentType, supportedTypes: ['string'], icon: '🧩' },
  { key: 'lora2', label: 'LoRA模型 2 (LoRA 2)', type: 'text' as ComponentType, supportedTypes: ['string'], icon: '🧩' },
  { key: 'lora3', label: 'LoRA模型 3 (LoRA 3)', type: 'text' as ComponentType, supportedTypes: ['string'], icon: '🧩' },
  { key: 'lora1_strength', label: 'LoRA模型 1 强度 (LoRA 1 Strength)', type: 'number' as ComponentType, supportedTypes: ['number'], icon: '⚖️' },
  { key: 'lora2_strength', label: 'LoRA模型 2 强度 (LoRA 2 Strength)', type: 'number' as ComponentType, supportedTypes: ['number'], icon: '⚖️' },
  { key: 'lora3_strength', label: 'LoRA模型 3 强度 (LoRA 3 Strength)', type: 'number' as ComponentType, supportedTypes: ['number'], icon: '⚖️' },
];
