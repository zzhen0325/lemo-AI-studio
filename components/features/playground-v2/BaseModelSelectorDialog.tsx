import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface BaseModelMeta {
  name: string;
  cover: string; // public path e.g. /basemodels/xxx.jpg
}

interface BaseModelSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onConfirm: (model: string) => void;
}

export default function BaseModelSelectorDialog({ open, onOpenChange, value, onConfirm }: BaseModelSelectorDialogProps) {
  const [selectedName, setSelectedName] = useState<string>(value || '');

  // 静态封面列表（来源于 public/basemodels）
  const list: BaseModelMeta[] = useMemo(() => ([
    { name: 'FLUX_fill', cover: '/basemodels/FLUX_fill.jpg' },
    { name: 'flux1-dev-fp8.safetensors', cover: '/basemodels/flux1-dev-fp8.safetensors.jpg' },
    { name: 'Zimage', cover: '/basemodels/Zimage.jpg' },
    { name: 'qwen', cover: '/basemodels/qwen.jpg' },
  ]), []);

  useEffect(() => { setSelectedName(value || ''); }, [value]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-3xl">
        <DialogHeader>
          <DialogTitle>选择基础模型</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {list.map(item => (
              <div key={item.name} className="relative border rounded-2xl p-3 space-y-3">
                <Checkbox
                  checked={selectedName === item.name}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedName(item.name); else setSelectedName('');
                  }}
                  className="absolute top-2 right-2 z-10 h-5 w-5 bg-white/80 backdrop-blur-sm rounded-md shadow-sm"
                />
                <div className="relative w-full h-32 m-auto">
                  <Image
                    src={item.cover}
                    alt={item.name}
                    fill
                    className="object-contain rounded-md bg-muted"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm">{item.name}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button onClick={() => { onConfirm(selectedName); onOpenChange(false); }} disabled={!selectedName}>确定</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
