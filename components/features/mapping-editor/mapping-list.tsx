"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowRight, 
  Trash2, 
  Edit3,
  List
} from "lucide-react";

import { UIComponent, ComponentType } from "@/types/features/mapping-editor";

// 复制自 parameter-mapping-panel.tsx，保持一致
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

interface MappingListProps {
  components: UIComponent[];
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  className?: string;
}

export function MappingList({ components, onEdit, onDelete, className }: MappingListProps) {
  const getComponentTypeIcon = (component: UIComponent) => {
    if (component.properties.paramName) {
      const target = PLAYGROUND_TARGETS.find(t => t.key === component.properties.paramName);
      if (target) return target.icon;
    }
    return "🔧";
  };

  if (components.length === 0) return null;

  return (
    <Card className={`border-muted ${className}`}>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <List className="w-4 h-4" />
          已创建的参数映射 ({components.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[200px]">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            {components.map((component, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="text-lg flex-shrink-0">
                    {getComponentTypeIcon(component)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {component.label}
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <Badge variant="secondary" className="h-5 px-1 text-[10px]">
                        节点 {component.mapping.workflowPath[0]}
                      </Badge>
                      <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <Badge variant="outline" className="h-5 px-1 text-[10px]">
                        {component.mapping.parameterKey}
                      </Badge>
                      
                      {component.properties.paramName && PLAYGROUND_TARGETS.some(t => t.key === component.properties.paramName) && (
                        <Badge className="h-5 px-1 text-[10px] bg-green-100 text-green-800 hover:bg-green-200 border-green-200 ml-1">
                            {PLAYGROUND_TARGETS.find(t => t.key === component.properties.paramName)?.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(index)}
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(index)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
