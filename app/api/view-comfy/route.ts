import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  const workflowsDir = path.join(process.cwd(), 'workflows');
  const indexPath = path.join(workflowsDir, 'index.json');
  
  try {
    // Read the main index file
    const indexContent = await fs.readFile(indexPath, 'utf-8');
    const indexData = JSON.parse(indexContent);
    
    // Load each workflow's configuration and API data
    const viewComfys = [];
    
    for (const workflow of indexData.workflows) {
      const workflowDir = path.join(workflowsDir, workflow.folder);
      const configPath = path.join(workflowDir, 'config.json');
      const workflowApiPath = path.join(workflowDir, 'workflow.json');
      
      try {
        const [configContent, workflowApiContent] = await Promise.all([
          fs.readFile(configPath, 'utf-8'),
          fs.readFile(workflowApiPath, 'utf-8')
        ]);
        
        const config = JSON.parse(configContent);
        const workflowApi = JSON.parse(workflowApiContent);
        
        viewComfys.push({
          viewComfyJSON: config,
          workflowApiJSON: workflowApi
        });
      } catch (workflowError) {
        console.error(`Failed to load workflow ${workflow.folder}:`, workflowError);
        // Continue loading other workflows even if one fails
      }
    }
    
    // Return data in the same format as the original view_comfy.json
    const result = {
      appTitle: indexData.appTitle,
      appImg: indexData.appImg,
      viewComfys: viewComfys
    };
    
    return NextResponse.json(result);
  } catch (error) {
    // Fallback to original file if workflows directory doesn't exist
    const fallbackPath = path.join(process.cwd(), 'view_comfy.json');
    try {
      const fileContent = await fs.readFile(fallbackPath, 'utf-8');
      const json = JSON.parse(fileContent);
      return NextResponse.json(json);
    } catch (fallbackError) {
      return NextResponse.json({ 
        error: 'Failed to load workflow configuration', 
        details: `Could not load from workflows directory: ${error}. Fallback to view_comfy.json also failed: ${fallbackError}` 
      }, { status: 500 });
    }
  }
}

export async function POST(request: Request) {
  const workflowsDir = path.join(process.cwd(), 'workflows');
  const indexPath = path.join(workflowsDir, 'index.json');
  
  try {
    const updatedData = await request.json();
    
    // Ensure workflows directory exists
    await fs.mkdir(workflowsDir, { recursive: true });
    
    // Update index.json
    const indexData = {
      appTitle: updatedData.appTitle,
      appImg: updatedData.appImg,
      workflows: []
    };
    
    // Process each workflow
    for (let i = 0; i < updatedData.viewComfys.length; i++) {
      const viewComfy = updatedData.viewComfys[i];
      const config = viewComfy.viewComfyJSON;
      const workflowApi = viewComfy.workflowApiJSON;
      
      // Generate folder name from title, handling special characters
      const folderName = config.title.replace(/[<>:"/\\|?*]/g, '_').trim();
      const workflowDir = path.join(workflowsDir, folderName);
      
      // Create workflow directory
      await fs.mkdir(workflowDir, { recursive: true });
      
      // Write config.json and workflow.json
      await Promise.all([
        fs.writeFile(path.join(workflowDir, 'config.json'), JSON.stringify(config, null, 2), 'utf-8'),
        fs.writeFile(path.join(workflowDir, 'workflow.json'), JSON.stringify(workflowApi, null, 2), 'utf-8')
      ]);
      
      // Add to index
      indexData.workflows.push({
        title: config.title,
        folder: folderName,
        id: `workflow_${i + 1}`
      });
    }
    
    // Write updated index.json
    await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');
    
    return NextResponse.json({ message: 'Workflow configuration saved successfully' });
  } catch (error) {
    // Fallback to original file format
    const fallbackPath = path.join(process.cwd(), 'view_comfy.json');
    try {
      const updatedData = await request.json();
      await fs.writeFile(fallbackPath, JSON.stringify(updatedData, null, 2), 'utf-8');
      return NextResponse.json({ message: 'Configuration saved to view_comfy.json (fallback)' });
    } catch (fallbackError) {
      return NextResponse.json({ 
        error: 'Failed to save workflow configuration', 
        details: `Could not save to workflows directory: ${error}. Fallback to view_comfy.json also failed: ${fallbackError}` 
      }, { status: 500 });
    }
  }
}