"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Play,
  Info,
  Upload,
  Save,
  Download,
  Settings,
  Layers
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { MappingConfig, UIComponent } from "@/types/features/mapping-editor";
import { WorkflowApiJSON } from "@/lib/workflow-api-parser";
import { localStorageManager } from "@/lib/local-storage-manager";
import { WorkflowAnalyzer } from "@/components/features/mapping-editor/workflow-analyzer";
import { ParameterMappingPanel } from "@/components/features/mapping-editor/parameter-mapping-panel";
import { NodeConfigurationDialog } from "@/components/features/mapping-editor/node-configuration-dialog";
import { MappingList } from "@/components/features/mapping-editor/mapping-list";
import WorkflowSelectorDialog from "@/components/features/playground-v2/WorkflowSelectorDialog";
import type { IViewComfy } from "@/lib/providers/view-comfy-provider";

interface MappingEditorPageProps {
  onNavigate?: (tab: string) => void;
}

interface LocalEditorState {
  currentConfig: MappingConfig | null;
  selectedNode: string | null;
  selectedParameter: string | null;
  selectedComponent: string | null;
  editingComponentIndex: number | null;
  isDirty: boolean;
  isLoading: boolean;
}

export function MappingEditorPage({ onNavigate }: MappingEditorPageProps) {
  const [editorState, setEditorState] = useState<LocalEditorState>({
    currentConfig: null,
    selectedNode: null,
    selectedParameter: null,
    selectedComponent: null,
    editingComponentIndex: null,
    isDirty: false,
    isLoading: false
  });

  const [workflowFile, setWorkflowFile] = useState<File | null>(null);
  const [configTitle, setConfigTitle] = useState("");
  const [isWorkflowSelectorOpen, setIsWorkflowSelectorOpen] = useState(false);
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [workflows, setWorkflows] = useState<IViewComfy[]>([]);

  useEffect(() => {
    // 初始化编辑器
    initializeEditor();
    // 加载工作流列表
    fetchWorkflows();
  }, []);


  const fetchWorkflows = async () => {
    try {
      const res = await fetch('/api/view-comfy');
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.viewComfys || []);
      }
    } catch (error) {
      console.error("Failed to fetch workflows", error);
    }
  };

  const initializeEditor = async () => {
    try {
      setEditorState(prev => ({ ...prev, isLoading: true }));

      // 加载编辑器设置
      const settings = await localStorageManager.getEditorSettings();
      console.log("编辑器设置已加载:", settings);

      // Check for pending workflow from Playground
      const pendingWorkflowStr = localStorage.getItem("MAPPING_EDITOR_INITIAL_WORKFLOW");
      if (pendingWorkflowStr) {
        try {
          const workflow = JSON.parse(pendingWorkflowStr);
          // Assuming workflow has workflowApiJSON
          if (workflow.workflowApiJSON) {
            const newConfig: MappingConfig = {
              id: `config_${Date.now()}`,
              title: workflow.viewComfyJSON?.id || "Untitled Workflow",
              description: "Imported from Playground",
              workflowApiJSON: workflow.workflowApiJSON,
              uiConfig: {
                layout: { type: "grid", columns: 2, gap: 16 },
                theme: { primaryColor: "#3b82f6", backgroundColor: "#ffffff" },
                components: []
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            setEditorState(prev => ({
              ...prev,
              currentConfig: newConfig,
              isDirty: true
            }));
            setConfigTitle(newConfig.title);
            toast.success("已加载选中的工作流");
            localStorage.removeItem("MAPPING_EDITOR_INITIAL_WORKFLOW");
          }
        } catch (e) {
          console.error("Failed to parse pending workflow", e);
        }
      }

      setEditorState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error("初始化编辑器失败:", error);
      toast.error("初始化编辑器失败");
      setEditorState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleWorkflowUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setEditorState(prev => ({ ...prev, isLoading: true }));

      const text = await file.text();
      const workflowApiJSON: WorkflowApiJSON = JSON.parse(text);

      // 验证工作流格式
      if (!workflowApiJSON || typeof workflowApiJSON !== 'object') {
        throw new Error('无效的工作流文件格式');
      }

      setWorkflowFile(file);

      // 创建新的映射配置
      const newConfig: MappingConfig = {
        id: `config_${Date.now()}`,
        title: configTitle || file.name.replace('.json', ''),
        description: `从 ${file.name} 导入的工作流配置`,
        workflowApiJSON,
        uiConfig: {
          layout: {
            type: "grid",
            columns: 2,
            gap: 16
          },
          theme: {
            primaryColor: "#3b82f6",
            backgroundColor: "#ffffff"
          },
          components: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setEditorState(prev => ({
        ...prev,
        currentConfig: newConfig,
        isDirty: true,
        isLoading: false
      }));

      toast.success("工作流文件上传成功");
    } catch (error) {
      console.error("上传工作流失败:", error);
      toast.error("上传工作流失败：" + (error as Error).message);
      setEditorState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleSelectWorkflow = (workflow: IViewComfy) => {
    try {
      if (!workflow.workflowApiJSON) {
        toast.error("该工作流没有包含 API 定义");
        return;
      }

      const existingComponents = (workflow.viewComfyJSON as any).mappingConfig?.components || [];

      const newConfig: MappingConfig = {
        id: workflow.viewComfyJSON.id || `config_${Date.now()}`,
        title: workflow.viewComfyJSON.title || "Untitled Workflow",
        description: workflow.viewComfyJSON.description || "",
        workflowApiJSON: workflow.workflowApiJSON as WorkflowApiJSON,
        uiConfig: {
          layout: { type: "grid", columns: 2, gap: 16 },
          theme: { primaryColor: "#3b82f6", backgroundColor: "#ffffff" },
          components: existingComponents
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setEditorState(prev => ({
        ...prev,
        currentConfig: newConfig,
        isDirty: false
      }));
      setConfigTitle(newConfig.title);
      toast.success(`已加载工作流: ${newConfig.title}`);
    } catch (error) {
      console.error("加载工作流失败:", error);
      toast.error("加载工作流失败");
    }
  };

  const handleSaveConfig = useCallback(async () => {
    if (!editorState.currentConfig) {
      toast.error("没有可保存的配置");
      return;
    }

    try {
      setEditorState(prev => ({ ...prev, isLoading: true }));

      // 1. Save to local storage (backup)
      await localStorageManager.saveConfig(editorState.currentConfig);

      // 2. Save to server
      const updatedWorkflows = workflows.map(wf => {
        if (wf.viewComfyJSON.title === editorState.currentConfig!.title) {
          return {
            ...wf,
            viewComfyJSON: {
              ...wf.viewComfyJSON,
              mappingConfig: {
                components: editorState.currentConfig!.uiConfig.components
              }
            }
          };
        }
        return wf;
      });

      // Check if it's a new workflow
      const exists = workflows.some(w => w.viewComfyJSON.title === editorState.currentConfig!.title);
      if (!exists) {
        // Create basic ViewComfy structure
        const newWorkflow: IViewComfy = {
          viewComfyJSON: {
            id: editorState.currentConfig.id,
            title: editorState.currentConfig.title,
            description: editorState.currentConfig.description || "",
            inputs: [], // Should ideally be parsed from API
            advancedInputs: [],
            previewImages: [],
            mappingConfig: {
              components: editorState.currentConfig.uiConfig.components
            }
          } as any, // using any to bypass strict type check if needed
          workflowApiJSON: editorState.currentConfig.workflowApiJSON
        };
        updatedWorkflows.push(newWorkflow);
      }

      const payload = {
        appTitle: "ViewComfy",
        appImg: "",
        viewComfys: updatedWorkflows
      };

      const res = await fetch('/api/view-comfy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Failed to save to server");
      }

      setEditorState(prev => ({
        ...prev,
        isDirty: false,
        isLoading: false
      }));

      toast.success("配置已保存到服务器");

      // Refresh list
      fetchWorkflows();

    } catch (error) {
      console.error("保存配置失败:", error);
      toast.error("保存配置失败");
      setEditorState(prev => ({ ...prev, isLoading: false }));
    }
  }, [editorState.currentConfig, editorState.isDirty, workflows, fetchWorkflows]);

  // Auto-save effect
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (editorState.isDirty && editorState.currentConfig) {
      timer = setTimeout(() => {
        handleSaveConfig();
      }, 30000); // 30 seconds auto-save
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [editorState.isDirty, editorState.currentConfig, handleSaveConfig]);

  const handleGoToGeneration = () => {
    if (!editorState.currentConfig) {
      toast.error("请先保存配置");
      return;
    }

    if (editorState.isDirty) {
      toast.error("请先保存当前配置");
      return;
    }

    // 跳转到生成界面
    if (onNavigate) {
      // TODO: 这里的参数需要根据实际 TabValue 调整，假设生成界面是 'custom-ui' 或其他
      // 目前先提示
      toast.info("跳转功能待集成");
    }
  };

  const handleExportConfig = async () => {
    if (!editorState.currentConfig) {
      toast.error("没有可导出的配置");
      return;
    }

    try {
      const blob = await localStorageManager.exportConfig(editorState.currentConfig.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${editorState.currentConfig.title}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("配置导出成功");
    } catch (error) {
      console.error("导出配置失败:", error);
      toast.error("导出配置失败");
    }
  };

  const handleNodeSelect = (nodeId: string) => {
    setEditorState(prev => ({
      ...prev,
      selectedNode: nodeId,
      selectedParameter: null
    }));
    // setIsNodeDialogOpen(true); // Removed dialog
  };

  const handleParameterSelect = (nodeId: string, parameterKey: string) => {
    setEditorState(prev => ({
      ...prev,
      selectedNode: nodeId,
      selectedParameter: parameterKey
    }));
  };

  const handleComponentCreate = (component: UIComponent) => {
    if (!editorState.currentConfig) return;

    const updatedComponents = [...editorState.currentConfig.uiConfig.components, component];

    const updatedConfig = {
      ...editorState.currentConfig,
      uiConfig: {
        ...editorState.currentConfig.uiConfig,
        components: updatedComponents
      },
      updatedAt: new Date().toISOString()
    };

    setEditorState(prev => ({
      ...prev,
      currentConfig: updatedConfig,
      isDirty: true
    }));

    toast.success("组件映射创建成功");
  };

  const handleComponentUpdate = (index: number, component: UIComponent) => {
    if (!editorState.currentConfig) return;

    const updatedComponents = [...editorState.currentConfig.uiConfig.components];
    updatedComponents[index] = component;

    const updatedConfig = {
      ...editorState.currentConfig,
      uiConfig: {
        ...editorState.currentConfig.uiConfig,
        components: updatedComponents
      },
      updatedAt: new Date().toISOString()
    };

    setEditorState(prev => ({
      ...prev,
      currentConfig: updatedConfig,
      isDirty: true
    }));

    toast.success("组件映射更新成功");
  };

  const handleComponentDelete = (index: number) => {
    if (!editorState.currentConfig) return;

    const updatedComponents = editorState.currentConfig.uiConfig.components.filter((_, i) => i !== index);

    const updatedConfig = {
      ...editorState.currentConfig,
      uiConfig: {
        ...editorState.currentConfig.uiConfig,
        components: updatedComponents
      },
      updatedAt: new Date().toISOString()
    };

    setEditorState(prev => ({
      ...prev,
      currentConfig: updatedConfig,
      isDirty: true
    }));

    toast.success("组件映射删除成功");
  };

  const handleNodeValueUpdate = (nodeId: string, paramKey: string, value: any) => {
    if (!editorState.currentConfig) return;

    const updatedWorkflow = {
      ...editorState.currentConfig.workflowApiJSON,
      [nodeId]: {
        ...editorState.currentConfig.workflowApiJSON[nodeId],
        inputs: {
          ...editorState.currentConfig.workflowApiJSON[nodeId].inputs,
          [paramKey]: value
        }
      }
    };

    const updatedConfig = {
      ...editorState.currentConfig,
      workflowApiJSON: updatedWorkflow,
      updatedAt: new Date().toISOString()
    };

    setEditorState(prev => ({
      ...prev,
      currentConfig: updatedConfig,
      isDirty: true
    }));
  };

  if (editorState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 h-full overflow-y-auto text-white selection:bg-white/20">
      {/* 页面标题和操作栏 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-[48px] text-white tracking-tight" style={{ fontFamily: 'InstrumentSerif-Regular, sans-serif' }}>
            Mapping Editor
          </h1>
          <p className="text-white/40 mt-1 text-lg">
            Bridge ComfyUI parameters to a premium user interface.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white hover:bg-white/5 transition-all"
            onClick={handleSaveConfig}
            disabled={!editorState.currentConfig || !editorState.isDirty}
          >
            <Save className="w-4 h-4 mr-2" />
            <span>Save</span>
            {editorState.isDirty && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white hover:bg-white/5 transition-all"
            onClick={handleExportConfig}
            disabled={!editorState.currentConfig}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Button
            onClick={handleGoToGeneration}
            disabled={!editorState.currentConfig || editorState.isDirty}
            size="sm"
            className="bg-white text-black hover:bg-white/90 font-medium px-4 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4 mr-2" />
            Go to App
          </Button>

          <Button variant="ghost" size="icon" className="text-white/40 hover:text-white transition-all">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Workflow Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full"
      >
        <Tabs
          value={editorState.currentConfig?.title || "default"}
          onValueChange={(val) => {
            if (val === "default") {
              setEditorState(prev => ({ ...prev, currentConfig: null }));
            } else {
              const wf = workflows.find(w => w.viewComfyJSON.title === val);
              if (wf) handleSelectWorkflow(wf);
            }
          }}
          className="w-full"
        >
          <TabsList className="w-full justify-start h-auto flex-wrap gap-2 bg-transparent p-0">
            <TabsTrigger
              value="default"
              className="rounded-full bg-white/5 data-[state=active]:bg-white/10 data-[state=active]:text-white border border-white/5 px-6 py-2 text-white/40 hover:text-white/70 transition-all data-[state=active]:border-white/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Configuration
            </TabsTrigger>
            {workflows.map(wf => (
              <TabsTrigger
                key={wf.viewComfyJSON.id}
                value={wf.viewComfyJSON.title}
                className="rounded-full bg-white/5 data-[state=active]:bg-white/10 data-[state=active]:text-white border border-white/5 px-6 py-2 text-white/40 hover:text-white/70 transition-all data-[state=active]:border-white/20"
              >
                {wf.viewComfyJSON.title || "Untitled"}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </motion.div>

      {/* 工作流上传区域 */}
      <AnimatePresence mode="wait">
        {!editorState.currentConfig && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="bg-white/[0.02] backdrop-blur-3xl border-white/5 text-white overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl font-medium tracking-tight">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <Upload className="w-5 h-5 text-white/80" />
                  </div>
                  Upload ComfyUI Workflow
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="config-title" className="text-white/40 text-xs uppercase tracking-wider">Configuration Title</Label>
                    <Input
                      id="config-title"
                      placeholder="e.g. Portrait Master V1"
                      value={configTitle}
                      onChange={(e) => setConfigTitle(e.target.value)}
                      className="bg-white/5 border-white/5 text-white placeholder:text-white/20 focus:border-white/20 focus:ring-0 transition-all h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workflow-file" className="text-white/40 text-xs uppercase tracking-wider">Workflow JSON File</Label>
                    <div className="relative group/input">
                      <Input
                        id="workflow-file"
                        type="file"
                        accept=".json"
                        onChange={handleWorkflowUpload}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-20"
                      />
                      <div className="h-12 bg-white/5 border-white/5 rounded-md flex items-center px-4 text-white/40 group-hover/input:border-white/10 transition-all border border-dashed">
                        {workflowFile ? workflowFile.name : "Select or drop JSON file..."}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-white/10">
                  <div className="h-px bg-white/5 flex-1" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-medium">OR</span>
                  <div className="h-px bg-white/5 flex-1" />
                </div>

                <Button
                  variant="ghost"
                  className="w-full bg-white/5 border border-white/5 text-white hover:bg-white/10 h-12 transition-all"
                  onClick={() => setIsWorkflowSelectorOpen(true)}
                >
                  <Layers className="w-4 h-4 mr-2 text-white/60" />
                  Browse Server Templates
                </Button>

                <div className="flex items-start gap-3 p-4 bg-white/[0.02] rounded-xl border border-white/5">
                  <Info className="w-4 h-4 text-white/20 mt-0.5" />
                  <div className="text-sm text-white/30 leading-relaxed">
                    Upload a ComfyUI workflow exported in <strong>API format</strong>.
                    This will allow you to map internal nodes to a custom interface.
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主编辑区域 */}
      {editorState.currentConfig && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-280px)] min-h-[600px]"
        >
          <div className="lg:col-span-8 h-full flex flex-col overflow-hidden gap-6">
            <div className="flex-shrink-0">
              <MappingList
                components={editorState.currentConfig.uiConfig.components}
                onEdit={(index) => {
                  setEditorState(prev => ({
                    ...prev,
                    editingComponentIndex: index,
                    selectedParameter: null,
                    selectedNode: null
                  }));
                }}
                onDelete={handleComponentDelete}
                className="bg-white/[0.02] border-white/5"
              />
            </div>

            <div className="flex-1 overflow-hidden">
              <WorkflowAnalyzer
                workflowApiJSON={editorState.currentConfig.workflowApiJSON}
                onNodeSelect={handleNodeSelect}
                onParameterSelect={handleParameterSelect}
                selectedNode={editorState.selectedNode}
                selectedParameter={editorState.selectedParameter}
                existingComponents={editorState.currentConfig.uiConfig.components}
              />
            </div>
          </div>

          <div className="lg:col-span-4 h-full">
            <ParameterMappingPanel
              workflowApiJSON={editorState.currentConfig.workflowApiJSON}
              selectedNode={editorState.selectedNode}
              selectedParameter={editorState.selectedParameter}
              existingComponents={editorState.currentConfig.uiConfig.components}
              onComponentCreate={handleComponentCreate}
              onComponentUpdate={handleComponentUpdate}
              onComponentDelete={handleComponentDelete}
              onParameterSelect={handleParameterSelect}
              editingComponentIndex={editorState.editingComponentIndex}
              onCancelEdit={() => setEditorState(prev => ({ ...prev, editingComponentIndex: null }))}
            />
          </div>
        </motion.div>
      )}

      <WorkflowSelectorDialog
        open={isWorkflowSelectorOpen}
        onOpenChange={setIsWorkflowSelectorOpen}
        onSelect={handleSelectWorkflow}
      />

      <NodeConfigurationDialog
        open={isNodeDialogOpen}
        onOpenChange={setIsNodeDialogOpen}
        nodeId={editorState.selectedNode}
        workflowApiJSON={editorState.currentConfig?.workflowApiJSON || null}
        mappingConfig={editorState.currentConfig}
        onUpdateValue={handleNodeValueUpdate}
        onParameterSelect={handleParameterSelect}
      />
    </div>
  );
}

