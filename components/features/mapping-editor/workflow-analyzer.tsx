"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Layers, 
  Info,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

import { WorkflowApiJSON } from "@/lib/workflow-api-parser";
import { UIComponent } from "@/types/features/mapping-editor";

interface RawWorkflowNode {
    inputs: Record<string, any>;
    class_type: string;
    _meta?: {
        title?: string;
    };
    [key: string]: any;
}

interface WorkflowAnalyzerProps {
  workflowApiJSON: WorkflowApiJSON;
  selectedNode?: string | null;
  selectedParameter?: string | null;
  onNodeSelect?: (nodeId: string) => void;
  onParameterSelect?: (nodeId: string, parameterKey: string) => void;
  existingComponents?: UIComponent[];
}

interface ParsedNode extends RawWorkflowNode {
  id: string;
  inputCount: number;
  primitiveInputCount: number;
  outputConnections: string[];
  hasComplexInputs: boolean;
}

export function WorkflowAnalyzer({
  workflowApiJSON,
  selectedNode,
  selectedParameter,
  onNodeSelect,
  onParameterSelect,
  existingComponents = []
}: WorkflowAnalyzerProps) {
  // 解析工作流节点
  const parsedNodes = useMemo(() => {
    const nodes: ParsedNode[] = [];
    
    Object.entries(workflowApiJSON).forEach(([nodeId, nodeData]) => {
      // Calculate inputs that are NOT connections (primitive values)
      const primitiveInputCount = nodeData.inputs ? Object.values(nodeData.inputs).filter(v => !Array.isArray(v)).length : 0;
      const inputCount = nodeData.inputs ? Object.keys(nodeData.inputs).length : 0;
      
      // 查找输出连接
      const outputConnections: string[] = [];
      Object.entries(workflowApiJSON).forEach(([otherNodeId, otherNodeData]) => {
        if (otherNodeData.inputs) {
          Object.values(otherNodeData.inputs).forEach((inputValue) => {
            if (Array.isArray(inputValue) && inputValue[0] === nodeId) {
              outputConnections.push(otherNodeId);
            }
          });
        }
      });

      // 检查是否有复杂输入（非基本类型）
      const hasComplexInputs = nodeData.inputs ? 
        Object.values(nodeData.inputs).some(value => 
          typeof value === 'object' && !Array.isArray(value)
        ) : false;

      nodes.push({
        id: nodeId,
        ...nodeData,
        inputCount,
        primitiveInputCount,
        outputConnections: [...new Set(outputConnections)],
        hasComplexInputs
      });
    });

    return nodes.sort((a, b) => parseInt(a.id) - parseInt(b.id));
  }, [workflowApiJSON]);

  const handleNodeClick = (nodeId: string) => {
    onNodeSelect?.(nodeId);
  };

  const getNodeTypeColor = (classType: string): string => {
    // 根据节点类型返回不同颜色
    const hash = classType.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800", 
      "bg-purple-100 text-purple-800",
      "bg-orange-100 text-orange-800",
      "bg-pink-100 text-pink-800",
      "bg-indigo-100 text-indigo-800"
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-4">
      {/* 节点列表 */}
      <ScrollArea className="h-[600px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {parsedNodes.map((node) => {
            const isSelected = selectedNode === node.id;
            const mappedParamCount = Object.keys(node.inputs || {}).filter(key => 
              existingComponents.some(
                c => c.mapping.workflowPath.includes(node.id) && c.mapping.parameterKey === key
              )
            ).length;
            
            const isMapped = mappedParamCount > 0;
            
            return (
              <Card 
                key={node.id}
                className={`transition-all duration-200 cursor-pointer ${
                  isSelected 
                    ? 'border-orange-500 bg-orange-50 shadow-md ring-1 ring-orange-500' 
                    : isMapped
                      ? 'border-green-500 bg-green-50 hover:bg-green-100 hover:shadow-sm'
                      : 'hover:bg-muted/50 hover:shadow-sm'
                }`}
                onClick={() => handleNodeClick(node.id)}
              >
                <CardContent className="p-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="text-xs font-medium truncate flex-1 pr-2" title={node._meta?.title || node.class_type}>
                          {node._meta?.title || node.class_type}
                        </div>
                        <Badge variant="secondary" className="font-mono text-[10px] h-5 px-1">
                          {node.id}
                        </Badge>
                    </div>
                    
                    <div className="flex items-center gap-1 flex-wrap mt-1">
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] px-1 border-0 ${getNodeTypeColor(node.class_type)}`}
                      >
                        {node.class_type}
                      </Badge>

                      {mappedParamCount > 0 && (
                        <Badge className="text-[10px] px-1 h-5 bg-green-200 text-green-800 hover:bg-green-200 border-0">
                          已映射 {mappedParamCount}
                        </Badge>
                      )}
                      
                      {node.primitiveInputCount > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1 h-5 bg-muted">
                          {node.primitiveInputCount} 参数
                        </Badge>
                      )}
                      {node.hasComplexInputs && (
                        <Info className="w-3 h-3 text-orange-500" />
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-3 pt-3 border-t animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="text-xs font-medium text-muted-foreground mb-2">节点参数</div>
                      <div className="space-y-1">
                        {Object.entries(node.inputs || {}).map(([key, value]) => {
                          const isConnection = Array.isArray(value);
                          const valueType = isConnection ? "connection" : typeof value;
                          const isMapped = existingComponents.some(
                            c => c.mapping.workflowPath.includes(node.id) && c.mapping.parameterKey === key
                          );
                          const isParamSelected = selectedParameter === key;

                          return (
                            <div 
                              key={key}
                              className={`flex items-center justify-between p-2 rounded-md text-xs cursor-pointer transition-colors ${
                                isParamSelected 
                                  ? 'bg-primary/10 text-primary font-medium' 
                                  : 'hover:bg-muted'
                              } ${isMapped ? 'border border-green-200 bg-green-50/50' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onParameterSelect?.(node.id, key);
                              }}
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                {isMapped && <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />}
                                <span className="truncate" title={key}>{key}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-[10px] px-1 h-4 ${
                                  isConnection ? 'text-orange-600 border-orange-200' : 'text-muted-foreground'
                                }`}>
                                  {isConnection ? '连接' : valueType}
                                </Badge>
                                {isParamSelected && <ArrowRight className="w-3 h-3" />}
                              </div>
                            </div>
                          );
                        })}
                        {Object.keys(node.inputs || {}).length === 0 && (
                          <div className="text-xs text-muted-foreground italic px-2">无参数</div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          
          {parsedNodes.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>暂无节点</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}