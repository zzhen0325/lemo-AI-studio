import { datasetEvents, DATASET_SYNC_EVENT } from '@/lib/server/dataset-events';

export const dynamic = 'force-dynamic';

export async function GET() {
    const encoder = new TextEncoder();

    let cleanup: () => void;

    const stream = new ReadableStream({
        start(controller) {
            let isClosed = false;

            // 定义发送消息的助手函数
            const sendEvent = (data: string) => {
                if (isClosed) return;
                try {
                    controller.enqueue(encoder.encode(`event: sync\ndata: ${data}\n\n`));
                } catch (e) {
                    // 即使 isClosed 为 false，enqueue 也可能抛出已经关闭的错误
                    console.error('SSE enqueue error:', e);
                }
            };

            // 发送初始连接成功消息
            sendEvent('connected');

            // 监听全局同步事件
            const onSync = () => {
                sendEvent('refresh');
            };

            datasetEvents.on(DATASET_SYNC_EVENT, onSync);

            // 设置清理函数
            cleanup = () => {
                if (isClosed) return;
                isClosed = true;
                datasetEvents.off(DATASET_SYNC_EVENT, onSync);
                try {
                    controller.close();
                } catch {
                    // 忽略重复关闭错误
                }
            };
        },
        cancel() {
            if (cleanup) cleanup();
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}
