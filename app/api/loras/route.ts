import { NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ErrorResponseFactory } from '@/app/models/errors';

const errorResponseFactory = new ErrorResponseFactory();

// 定义输出JSON的结构
interface LoraMetadata {
  model_name: string;
  preview_url: string;
  trainedWords: string[];
  base_model?: string;
}

export async function GET() {
  try {
    // 获取loras目录的路径
    const lorasDir = path.join(process.cwd(), 'public', 'loras');
    
    // 读取目录下的所有文件
    const files = await fs.readdir(lorasDir);
    
    // 筛选出.metadata.json文件
    const metadataFiles = files.filter(file => file.endsWith('.metadata.json'));
    
    const lorasData: LoraMetadata[] = [];
    
    // 处理每个元数据文件
    for (const metadataFile of metadataFiles) {
      try {
        // 构建完整的文件路径
        const metadataPath = path.join(lorasDir, metadataFile);
        
        // 读取元数据文件内容
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);
        
        // 提取模型名称 (去除.metadata.json后缀)，并添加.safetensors后缀
        const modelName = metadataFile.replace('.metadata.json', '') + '.safetensors';
        
        // 检查是否存在同名的.webp文件
        const webpFileName = metadataFile.replace('.metadata.json', '') + '.webp';
        const webpFilePath = path.join(lorasDir, webpFileName);
        let previewUrl = '';
        
        if (await fileExists(webpFilePath)) {
          // 构建webp文件的URL路径，相对于public目录
          previewUrl = `/loras/${webpFileName}`;
        }
        
        // 从civitai.trainedWords提取训练词，如果不存在则为空数组
        let trainedWords: string[] = [];
        if (metadata.civitai && metadata.civitai.trainedWords) {
          trainedWords = Array.isArray(metadata.civitai.trainedWords) 
            ? metadata.civitai.trainedWords 
            : [metadata.civitai.trainedWords];
        }
        
        const baseModel = typeof metadata.base_model === 'string' ? metadata.base_model : '';
        lorasData.push({
          model_name: modelName,
          preview_url: previewUrl,
          trainedWords: trainedWords,
          base_model: baseModel
        });
      } catch (err) {
        console.error(`处理文件 ${metadataFile} 时出错:`, err);
        // 继续处理下一个文件
      }
    }
    
    // 将处理后的数据写入到JSON文件
    const outputDir = path.join(process.cwd(), 'app', 'api', 'loars');
    await fs.mkdir(outputDir, { recursive: true });  // 确保目录存在
    
    // const outputPath = path.join(outputDir, 'loras.json');
    // await fs.writeFile(outputPath, JSON.stringify(lorasData, null, 2), 'utf-8');
    
    // 返回JSON数据
    return NextResponse.json(lorasData);
    
  } catch (error) {
    console.error('处理loras数据时出错:', error);
    const errorResponse = errorResponseFactory.getErrorResponse(error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// 检查文件是否存在的辅助函数
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
