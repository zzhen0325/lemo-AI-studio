"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowRight, 
  Plus, 
  Trash2, 
  Edit3,
  Save,
  X,
  Link,
  Settings
} from "lucide-react";

import { 
  UIComponent, 
  ComponentType,
} from "@/types/features/mapping-editor";
import { WorkflowApiJSON } from "@/lib/workflow-api-parser";

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface ParameterMappingPanelProps {
  workflowApiJSON: WorkflowApiJSON;
  selectedNode?: string | null;
  selectedParameter?: string | null;
  existingComponents: UIComponent[];
  onComponentCreate?: (component: UIComponent) => void;
  onComponentUpdate?: (index: number, component: UIComponent) => void;
  onComponentDelete?: (index: number) => void;
  onParameterSelect?: (nodeId: string, parameterKey: string) => void;
  editingComponentIndex?: number | null;
  onCancelEdit?: () => void;
}

const PLAYGROUND_TARGETS = [
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

export function ParameterMappingPanel({
  workflowApiJSON,
  selectedNode,
  selectedParameter,
  existingComponents,
  onComponentCreate,
  onComponentUpdate,
  onComponentDelete,
  onParameterSelect,
  editingComponentIndex,
  onCancelEdit
}: ParameterMappingPanelProps) {
  // Internal editing index only used for inline actions if needed, 
  // but we primarily use editingComponentIndex prop now for the main edit mode
  const [localEditingIndex, setLocalEditingIndex] = useState<number | null>(null); 
  const [newComponent, setNewComponent] = useState<Partial<UIComponent> | null>(null);
  
  // Determine effective editing index (prop has priority)
  const effectiveEditingIndex = editingComponentIndex !== undefined && editingComponentIndex !== null 
    ? editingComponentIndex 
    : localEditingIndex;

  // 获取当前选中节点的信息
  const selectedNodeInfo = useMemo(() => {
    if (!selectedNode || !workflowApiJSON[selectedNode]) {
      return null;
    }
    const node = workflowApiJSON[selectedNode];
    return {
      id: selectedNode,
      class_type: node.class_type,
      inputs: node.inputs || {}
    };
  }, [selectedNode, workflowApiJSON]);

  // 获取当前选中参数的信息
  const selectedParameterInfo = useMemo(() => {
    if (!selectedNode || !selectedParameter || !workflowApiJSON[selectedNode]) {
      return null;
    }

    const node = workflowApiJSON[selectedNode];
    const parameterValue = node.inputs?.[selectedParameter];
    
    if (parameterValue === undefined) {
      return null;
    }

    const isConnection = Array.isArray(parameterValue);
    const valueType = isConnection ? "connection" : typeof parameterValue;
    
    return {
      nodeId: selectedNode,
      parameterKey: selectedParameter,
      currentValue: parameterValue,
      valueType,
      isConnection,
      nodeClass: node.class_type
    };
  }, [selectedNode, selectedParameter, workflowApiJSON]);

  // 检查参数是否已经有映射
  const existingMappingIndex = useMemo(() => {
    if (!selectedNode || !selectedParameter) return -1;
    
    return existingComponents.findIndex(comp =>
      comp.mapping.workflowPath.includes(selectedNode) && 
      comp.mapping.parameterKey === selectedParameter
    );
  }, [selectedNode, selectedParameter, existingComponents]);

  const createPlaygroundMapping = (targetKey: string) => {
    if (!selectedParameterInfo) return;
    handleDirectMapping(
        selectedParameterInfo.nodeId, 
        selectedParameterInfo.parameterKey, 
        selectedParameterInfo.currentValue, 
        targetKey
    );
  };

  const handleDirectMapping = (nodeId: string, parameterKey: string, currentValue: any, targetKey: string) => {
    const target = PLAYGROUND_TARGETS.find(t => t.key === targetKey);
    if (!target) return;

    const component: UIComponent = {
      id: `pg_map_${Date.now()}`,
      type: target.type,
      label: target.label,
      properties: {
        defaultValue: currentValue,
        paramName: target.key, // 关键：用于标识这是 Playground 参数
        placeholder: `Mapped to ${target.label}`
      },
      validation: {},
      mapping: {
        workflowPath: [nodeId, "inputs", parameterKey],
        parameterKey: parameterKey,
        defaultValue: currentValue
      },
      orderIndex: existingComponents.length
    };

    onComponentCreate?.(component);
  };

  const saveNewMapping = () => {
    if (!newComponent) return;

    onComponentCreate?.(newComponent as UIComponent);
    setNewComponent(null);
  };

  const cancelNewMapping = () => {
    setNewComponent(null);
  };

  const startEditMapping = (index: number) => {
    setLocalEditingIndex(index);
  };

  const saveEditMapping = (index: number, component: UIComponent) => {
    onComponentUpdate?.(index, component);
    setLocalEditingIndex(null);
    onCancelEdit?.();
  };

  const cancelEditMapping = () => {
    setLocalEditingIndex(null);
    onCancelEdit?.();
  };

  const deleteMapping = (index: number) => {
    onComponentDelete?.(index);
  };

  const getValueTypeColor = (type: string) => {
    switch (type) {
      case "string": return "bg-green-100 text-green-800";
      case "number": return "bg-blue-100 text-blue-800";
      case "boolean": return "bg-purple-100 text-purple-800";
      case "connection": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getComponentTypeIcon = (component: UIComponent) => {
    // 优先查找 Playground 映射图标
    if (component.properties.paramName) {
      const target = PLAYGROUND_TARGETS.find(t => t.key === component.properties.paramName);
      if (target) return target.icon;
    }
    // 后备图标
    return "🔧";
  };

  return (
    <div className="space-y-4">
      {/* 当前选中参数信息 */}
      {selectedParameterInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">选中参数</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">节点 {selectedParameterInfo.nodeId}</Badge>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <Badge variant="outline">{selectedParameterInfo.parameterKey}</Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">节点类型:</span>
                <Badge variant="outline" className="text-xs">
                  {selectedParameterInfo.nodeClass}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">参数类型:</span>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getValueTypeColor(selectedParameterInfo.valueType)}`}
                >
                  {selectedParameterInfo.valueType}
                  {selectedParameterInfo.isConnection && <Link className="w-3 h-3 ml-1" />}
                </Badge>
              </div>
              
              <div className="text-sm">
                <span className="text-muted-foreground">当前值:</span>
                <div className="mt-1 p-2 bg-muted/30 rounded text-xs font-mono break-all">
                  {JSON.stringify(selectedParameterInfo.currentValue)}
                </div>
              </div>
            </div>

            {selectedParameterInfo.isConnection ? (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 text-orange-800">
                  <Link className="w-4 h-4" />
                  <span className="text-sm font-medium">连接参数</span>
                </div>
                <p className="text-xs text-orange-700 mt-1">
                  此参数连接到其他节点，无法直接映射为UI组件
                </p>
              </div>
            ) : existingMappingIndex >= 0 ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Settings className="w-4 h-4" />
                    <span className="text-sm font-medium">已有映射</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEditMapping(existingMappingIndex)}
                  >
                    <Edit3 className="w-3 h-3 mr-1" />
                    编辑
                  </Button>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  此参数已映射为UI组件，可以编辑现有映射
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-2">
                  <Label className="text-sm font-medium mb-2 block">映射到 Playground 参数</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    将此节点参数直接关联到 Playground 的标准输入（如提示词、尺寸等）
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {PLAYGROUND_TARGETS.filter(t => {
                      // 类型兼容性检查
                      const valueType = selectedParameterInfo.valueType;
                      // string 类型可以映射到 text
                      if (valueType === 'string' && t.supportedTypes.includes('string')) return true;
                      // number 类型可以映射到 number
                      if (valueType === 'number' && t.supportedTypes.includes('number')) return true;
                      // 特殊情况：有些 number 也可以作为 string 输入（如 seed）
                      return false;
                    }).map((target) => (
                      <Button
                        key={target.key}
                        variant="secondary"
                        size="sm"
                        className="justify-start"
                        onClick={() => createPlaygroundMapping(target.key)}
                      >
                        <span className="mr-2">{target.icon}</span>
                        {target.label}
                      </Button>
                    ))}
                  </div>
                  {PLAYGROUND_TARGETS.filter(t => {
                      const valueType = selectedParameterInfo.valueType;
                      if (valueType === 'string' && t.supportedTypes.includes('string')) return true;
                      if (valueType === 'number' && t.supportedTypes.includes('number')) return true;
                      return false;
                  }).length === 0 && (
                    <div className="text-xs text-muted-foreground italic p-2 bg-muted/30 rounded">
                      当前参数类型 ({selectedParameterInfo.valueType}) 没有可用的 Playground 映射目标
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 新建映射配置 */}
      {newComponent && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" />
              创建参数映射
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="component-label">组件标签</Label>
                <Input
                  id="component-label"
                  value={newComponent.label || ""}
                  onChange={(e) => setNewComponent(prev => prev ? {
                    ...prev,
                    label: e.target.value
                  } : null)}
                  placeholder="输入组件显示标签..."
                />
              </div>
              
              <div>
                <Label htmlFor="default-value">默认值</Label>
                <Input
                  id="default-value"
                  value={newComponent.properties?.defaultValue || ""}
                  onChange={(e) => setNewComponent(prev => prev ? {
                    ...prev,
                    properties: {
                      ...prev.properties!,
                      defaultValue: e.target.value
                    }
                  } : null)}
                  placeholder="输入默认值..."
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={saveNewMapping} size="sm">
                <Save className="w-3 h-3 mr-1" />
                保存映射
              </Button>
              <Button variant="outline" onClick={cancelNewMapping} size="sm">
                <X className="w-3 h-3 mr-1" />
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 现有映射列表 - 如果正在编辑中，显示编辑表单 */}
      {effectiveEditingIndex !== null && existingComponents[effectiveEditingIndex] && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">编辑映射</CardTitle>
          </CardHeader>
          <CardContent>
              <MappingEditor
                component={existingComponents[effectiveEditingIndex]}
                onSave={(updatedComponent) => saveEditMapping(effectiveEditingIndex, updatedComponent)}
                onCancel={cancelEditMapping}
              />
          </CardContent>
        </Card>
      )}

      {/* 空状态 */}
      {!selectedParameterInfo && existingComponents.length === 0 && !selectedNodeInfo && (
        <div className="text-center py-12 text-muted-foreground">
          <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="font-medium mb-2">开始创建参数映射</h3>
          <p className="text-sm">
            选择左侧工作流节点中的参数，然后为其创建UI组件映射
          </p>
        </div>
      )}

      {/* 选中节点但未选中参数：提示 */}
      {selectedNodeInfo && !selectedParameterInfo && effectiveEditingIndex === null && (
        <div className="text-center py-12 text-muted-foreground">
           <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
           <h3 className="font-medium mb-2">选择参数</h3>
           <p className="text-sm">
             请在左侧节点卡片中选择一个参数进行映射
           </p>
        </div>
      )}
    </div>
  );
}

// 映射编辑器组件
interface MappingEditorProps {
  component: UIComponent;
  onSave: (component: UIComponent) => void;
  onCancel: () => void;
}

function MappingEditor({ component, onSave, onCancel }: MappingEditorProps) {
  const [editedComponent, setEditedComponent] = useState<UIComponent>(component);

  const handleSave = () => {
    onSave(editedComponent);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="edit-label">组件标签</Label>
        <Input
          id="edit-label"
          value={editedComponent.label}
          onChange={(e) => setEditedComponent(prev => ({
            ...prev,
            label: e.target.value
          }))}
        />
      </div>
      
      {/* 
      <div>
        <Label htmlFor="edit-description">组件描述</Label>
        <Input
          id="edit-description"
          value={editedComponent.description || ""}
          onChange={(e) => setEditedComponent(prev => ({
            ...prev,
            description: e.target.value
          }))}
        />
      </div>
      */}
      
      <div className="flex gap-2">
        <Button onClick={handleSave} size="sm">
          <Save className="w-3 h-3 mr-1" />
          保存
        </Button>
        <Button variant="outline" onClick={onCancel} size="sm">
          <X className="w-3 h-3 mr-1" />
          取消
        </Button>
      </div>
    </div>
  );
}
