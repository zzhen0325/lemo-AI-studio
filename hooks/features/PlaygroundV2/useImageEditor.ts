import { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';

export type EditorTool = 'select' | 'brush' | 'text' | 'rect' | 'circle' | 'arrow' | 'eraser' | 'crop';

export interface EditorState {
    brushColor: string;
    brushWidth: number;
    fontSize: number;
    activeTool: EditorTool;
    canUndo: boolean;
    canRedo: boolean;
}

export const useImageEditor = (imageUrl: string) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const [editorState, setEditorState] = useState<EditorState>({
        brushColor: '#40cf8f', // Theme emerald color
        brushWidth: 5,
        fontSize: 32,
        activeTool: 'select',
        canUndo: false,
        canRedo: false,
    });

    const historyRef = useRef<string[]>([]);
    const historyIndexRef = useRef<number>(-1);

    const saveHistory = useCallback(() => {
        if (!fabricCanvasRef.current) return;
        const json = JSON.stringify(fabricCanvasRef.current.toJSON());

        // Remove future history if we were in a redo state
        if (historyIndexRef.current < historyRef.current.length - 1) {
            historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
        }

        historyRef.current.push(json);
        historyIndexRef.current++;

        // Limit history size
        if (historyRef.current.length > 50) {
            historyRef.current.shift();
            historyIndexRef.current--;
        }

        setEditorState(prev => ({
            ...prev,
            canUndo: historyIndexRef.current > 0,
            canRedo: false,
        }));
    }, []);

    // Initialize Canvas
    useEffect(() => {
        if (!canvasRef.current || !imageUrl) return;

        const canvas = new fabric.Canvas(canvasRef.current, {
            width: 800,
            height: 600,
            backgroundColor: '#000000',
        });
        fabricCanvasRef.current = canvas;

        // Load Image
        fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
            // Scale image to fit canvas
            const scaleX = 800 / img.width!;
            const scaleY = 600 / img.height!;
            const scale = Math.min(scaleX, scaleY);

            img.set({
                scaleX: scale,
                scaleY: scale,
                left: (800 - img.width! * scale) / 2,
                top: (600 - img.height! * scale) / 2,
                selectable: false,
                evented: false,
            });

            canvas.add(img);
            canvas.sendObjectToBack(img);
            canvas.renderAll();
            saveHistory();
        });

        // Event Listeners
        const handlePathCreated = () => saveHistory();
        const handleObjectAdded = () => saveHistory();
        const handleObjectModified = () => saveHistory();

        canvas.on('path:created', handlePathCreated);
        canvas.on('object:added', handleObjectAdded);
        canvas.on('object:modified', handleObjectModified);

        return () => {
            canvas.dispose();
            fabricCanvasRef.current = null;
        };
    }, [imageUrl, saveHistory]);

    const undo = useCallback(() => {
        if (historyIndexRef.current <= 0 || !fabricCanvasRef.current) return;

        historyIndexRef.current--;
        const json = historyRef.current[historyIndexRef.current];

        fabricCanvasRef.current.loadFromJSON(json).then(() => {
            fabricCanvasRef.current?.renderAll();
            setEditorState(prev => ({
                ...prev,
                canUndo: historyIndexRef.current > 0,
                canRedo: true,
            }));
        });
    }, []);

    const redo = useCallback(() => {
        if (historyIndexRef.current >= historyRef.current.length - 1 || !fabricCanvasRef.current) return;

        historyIndexRef.current++;
        const json = historyRef.current[historyIndexRef.current];

        fabricCanvasRef.current.loadFromJSON(json).then(() => {
            fabricCanvasRef.current?.renderAll();
            setEditorState(prev => ({
                ...prev,
                canUndo: true,
                canRedo: historyIndexRef.current < historyRef.current.length - 1,
            }));
        });
    }, []);

    const setTool = useCallback((tool: EditorTool) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        setEditorState(prev => ({ ...prev, activeTool: tool }));

        // Reset interaction states
        canvas.isDrawingMode = false;
        canvas.selection = tool === 'select';
        canvas.forEachObject(obj => {
            // Don't make the background image selectable
            if (obj.get('selectable') !== false) {
                obj.selectable = tool === 'select';
            }
        });

        if (tool === 'brush') {
            canvas.isDrawingMode = true;
            const brush = new fabric.PencilBrush(canvas);
            brush.color = editorState.brushColor;
            brush.width = editorState.brushWidth;
            canvas.freeDrawingBrush = brush;
        } else if (tool === 'eraser') {
            canvas.isDrawingMode = true;
            // In Fabric 6, eraser is usually a custom brush or path removal
            // We'll simplify with a white brush or similar if needed, 
            // but let's stick to standard tools first
        }
    }, [editorState.brushColor, editorState.brushWidth]);

    const addText = useCallback(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const text = new fabric.IText('Double click to edit', {
            left: 100,
            top: 100,
            fontFamily: 'sans-serif',
            fontSize: editorState.fontSize,
            fill: editorState.brushColor,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        setTool('select');
    }, [editorState.brushColor, editorState.fontSize, setTool]);

    const addShape = useCallback((type: 'rect' | 'circle' | 'arrow') => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        let shape;
        const common = {
            left: 100,
            top: 100,
            fill: 'transparent',
            stroke: editorState.brushColor,
            strokeWidth: editorState.brushWidth,
        };

        if (type === 'rect') {
            shape = new fabric.Rect({ ...common, width: 100, height: 100 });
        } else if (type === 'circle') {
            shape = new fabric.Circle({ ...common, radius: 50 });
        } else if (type === 'arrow') {
            // Arrow is complex, use a triangle + line or path
            shape = new fabric.Path('M 0 0 L 50 0 L 40 -10 M 50 0 L 40 10', {
                ...common,
                fill: 'transparent',
            });
        }

        if (shape) {
            canvas.add(shape);
            canvas.setActiveObject(shape);
            setTool('select');
        }
    }, [editorState.brushColor, editorState.brushWidth, setTool]);

    const rotateCanvas = useCallback((degrees: number) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        // In Fabric 6, we usually rotate the active object or the background image
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            activeObject.set('angle', (activeObject.angle || 0) + degrees);
            canvas.renderAll();
            saveHistory();
        } else {
            // Rotate the background image (first object)
            const bg = canvas.getObjects()[0];
            if (bg) {
                bg.set('angle', (bg.angle || 0) + degrees);
                canvas.renderAll();
                saveHistory();
            }
        }
    }, [saveHistory]);

    const applyFilter = useCallback((filterType: 'grayscale' | 'sepia' | 'invert' | 'brightness' | 'contrast', value?: number) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const bg = canvas.getObjects()[0] as fabric.FabricImage;
        if (!bg || !(bg instanceof fabric.FabricImage)) return;

        let filter;
        switch (filterType) {
            case 'grayscale': filter = new fabric.filters.Grayscale(); break;
            case 'sepia': filter = new fabric.filters.Sepia(); break;
            case 'invert': filter = new fabric.filters.Invert(); break;
            case 'brightness': filter = new fabric.filters.Brightness({ brightness: value || 0 }); break;
            case 'contrast': filter = new fabric.filters.Contrast({ contrast: value || 0 }); break;
        }

        if (filter) {
            // Replace or add filter
            const filters = bg.filters || [];
            const existingIdx = filters.findIndex(f => f.type === filter.type);
            if (existingIdx > -1) {
                filters[existingIdx] = filter;
            } else {
                filters.push(filter);
            }
            bg.applyFilters();
            canvas.renderAll();
            saveHistory();
        }
    }, [saveHistory]);

    const exportImage = useCallback((): string | null => {
        if (!fabricCanvasRef.current) return null;
        return fabricCanvasRef.current.toDataURL({
            multiplier: 1,
            format: 'png',
            quality: 1,
        });
    }, []);

    const updateBrushColor = (color: string) => {
        setEditorState(prev => ({ ...prev, brushColor: color }));
        if (fabricCanvasRef.current?.freeDrawingBrush) {
            fabricCanvasRef.current.freeDrawingBrush.color = color;
        }
    };

    const updateBrushWidth = (width: number) => {
        setEditorState(prev => ({ ...prev, brushWidth: width }));
        if (fabricCanvasRef.current?.freeDrawingBrush) {
            fabricCanvasRef.current.freeDrawingBrush.width = width;
        }
    };

    return {
        canvasRef,
        editorState,
        setTool,
        addText,
        addShape,
        undo,
        redo,
        rotateCanvas,
        applyFilter,
        exportImage,
        updateBrushColor,
        updateBrushWidth,
    };
};
