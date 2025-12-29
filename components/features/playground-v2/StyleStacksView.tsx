'use client';

import React, { useEffect, useState } from 'react';
import { usePlaygroundStore } from '@/lib/store/playground-store';
import { StyleStackCard } from './StyleStackCard';
import { StyleDetailView } from './StyleDetailView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';


export const StyleStacksView: React.FC = () => {
    const { styles, initStyles, addStyle, applyPrompt } = usePlaygroundStore();
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPrompt, setNewPrompt] = useState('');
    const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null); // selectedStyleId state already exists

    useEffect(() => {
        initStyles();
    }, [initStyles]);

    const handleCreate = () => {
        if (!newName.trim()) return;

        addStyle({
            id: uuidv4(),
            name: newName,
            prompt: newPrompt,
            imagePaths: [],
            updatedAt: new Date().toISOString()
        });

        setNewName('');
        setNewPrompt('');
        setIsCreating(false);
    };

    if (selectedStyleId) {
        const selectedStyle = styles.find(s => s.id === selectedStyleId);
        if (selectedStyle) {
            return (
                <StyleDetailView
                    style={selectedStyle}
                    onBack={() => setSelectedStyleId(null)}
                    onApply={applyPrompt}
                />
            );
        }
    }

    return (
        <div className="flex flex-col gap-8 w-full">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Sparkles className="text-purple-400" />
                        风格库 (Style Stacks)
                    </h2>
                    <p className="text-white/40 mt-1">手动聚合图片与 Style Prompt 的灵感空间</p>
                </div>

                <Button
                    onClick={() => setIsCreating(true)}
                    className="rounded-full px-6 bg-white text-black hover:bg-white/90 gap-2"
                >
                    <Plus size={18} />
                    创建新风格
                </Button>
            </div>

            {/* Creation Dialog/Panel */}
            <AnimatePresence>
                {isCreating && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="p-6 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-2xl flex flex-col gap-4"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-white">定义新风格</h3>
                            <Button variant="ghost" size="icon" onClick={() => setIsCreating(false)}>
                                <X size={20} />
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-white/60 ml-1">风格名称</label>
                                <Input
                                    placeholder="例如：赛博朋克深红"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="bg-white/5 border-white/10 rounded-xl h-12"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-white/60 ml-1">关联提示词 (Prompt)</label>
                                <Input
                                    placeholder="输入该风格的核心 prompt..."
                                    value={newPrompt}
                                    onChange={(e) => setNewPrompt(e.target.value)}
                                    className="bg-white/5 border-white/10 rounded-xl h-12"
                                />
                            </div>
                        </div>
                        <Button
                            onClick={handleCreate}
                            className="w-full md:w-40 self-end rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            确认创建
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Grid of Styles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {styles.map((style) => (
                    <StyleStackCard
                        key={style.id}
                        style={style}
                        onClick={() => setSelectedStyleId(style.id)}
                    />
                ))}

                {styles.length === 0 && !isCreating && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
                        <p className="text-white/20 text-lg italic">点击上方按钮，开始构建您的第一个风格堆叠</p>
                    </div>
                )}
            </div>
        </div>
    );
};
