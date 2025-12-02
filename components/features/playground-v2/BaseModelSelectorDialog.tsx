import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LoraMeta {
  model_name: string;
  preview_url: string;
  trainedWords: string[];
  base_model?: string;
}

interface BaseModelSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onConfirm: (model: string) => void;
}

export default function BaseModelSelectorDialog({ open, onOpenChange, value, onConfirm }: BaseModelSelectorDialogProps) {
  const [list, setList] = useState<LoraMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState(value || '');
  const baseModels = useMemo(() => {
    const set = new Set<string>();
    list.forEach(item => { if (item.base_model) set.add(item.base_model); });
    return Array.from(set);
  }, [list]);

  useEffect(() => { setText(value || ''); }, [value]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>选择基础模型</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select onValueChange={(v) => setText(v)} value={text}>
            <SelectTrigger>
              <SelectValue placeholder="选择基础模型" />
            </SelectTrigger>
            <SelectContent>
              {baseModels.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="自定义模型路径或名称" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>取消</Button>
            <Button onClick={() => { onConfirm(text); onOpenChange(false); }} disabled={!text || loading}>确定</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
