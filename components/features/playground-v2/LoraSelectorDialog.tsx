import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';

interface LoraMeta {
  model_name: string;
  preview_url: string;
  trainedWords: string[];
}

export interface SelectedLora {
  model_name: string;
  strength: number;
}

interface LoraSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: SelectedLora[];
  onConfirm: (list: SelectedLora[]) => void;
}

export default function LoraSelectorDialog({ open, onOpenChange, value, onConfirm }: LoraSelectorDialogProps) {
  const [list, setList] = useState<LoraMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, number>>({});

  useEffect(() => {
    const map: Record<string, number> = {};
    value.forEach(v => { map[v.model_name] = v.strength; });
    setSelected(map);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const fetchList = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/loras');
        if (!res.ok) throw new Error('获取模型失败');
        const data = (await res.json()) as LoraMeta[];
        setList(data);
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [open]);

  const toggle = (name: string) => {
    setSelected(prev => {
      const next = { ...prev };
      if (name in next) delete next[name]; else next[name] = 1.0;
      return next;
    });
  };

  const setStrength = (name: string, v: number) => { setSelected(prev => ({ ...prev, [name]: v })); };

  const confirm = () => {
    const result: SelectedLora[] = Object.entries(selected).map(([k, v]) => ({ model_name: k, strength: v }));
    onConfirm(result);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>选择 LoRA 模型</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {list.map(item => (
                <div key={item.model_name} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={item.model_name in selected} onCheckedChange={() => toggle(item.model_name)} />
                    <span className="truncate text-sm">{item.model_name}</span>
                  </div>
                  {item.preview_url && (
                    <img src={item.preview_url} alt={item.model_name} className="w-full h-32 object-contain rounded-md bg-muted" />
                  )}
                  {item.model_name in selected && (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">强度 {selected[item.model_name].toFixed(2)}</div>
                      <Slider value={[selected[item.model_name]]} min={0} max={1} step={0.05} onValueChange={(vals) => setStrength(item.model_name, vals[0] ?? 0)} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>取消</Button>
            <Button onClick={() => { confirm(); onOpenChange(false); }} disabled={loading}>确定</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
