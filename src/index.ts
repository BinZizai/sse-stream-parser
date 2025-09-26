import type { SSEFields, SSEOutput, SSEReadableStream, SSEStreamOptions } from '@/types';

/**
 * @description
 * SSE 是一种服务器向客户端推送数据的协议，它的数据格式有特定规则：
  - 事件之间用双换行符 \n\n 分隔
  - 每个事件内部的字段用单换行符 \n 分隔
  - 字段的键值对用冒号 : 分隔，如 event: message
*/

/* 事件之间用双换行符 \n\n 分隔 */
const DEFAULT_STREAM_SEPARATOR = '\n\n';
/* 每个事件内部的字段用单换行符 \n 分隔 */
const DEFAULT_PART_SEPARATOR = '\n';
/* 字段的键值对用冒号 : 分隔 */
const DEFAULT_KV_SEPARATOR = ':';

/**
 * @description 校验字符串是否有效
 */
const isValidString = (str: string): boolean => (str == null ? '' : str).trim() !== '';

/**
 * @description 文本 -> 事件块
 * 创建一个 TransformStream，用于将 SSE 数据流按 \n\n {@link DEFAULT_STREAM_SEPARATOR} 分割成单独的事件块
 */
function splitStream() {
  // 用于存储不完整的数据块
  let buffer = '';

  return new TransformStream<string, string>({
    transform(streamChunk, controller) {
      // 将新数据添加到缓冲区
      buffer += streamChunk;

      // 按双换行符分割
      const parts = buffer.split(DEFAULT_STREAM_SEPARATOR);

      // 处理完整的部分（除了最后一个可能不完整的部分）
      for (const part of parts.slice(0, -1)) {
        if (isValidString(part)) {
          controller.enqueue(part);
        }
      }

      // 保留最后一个不完整的事件块
      buffer = parts[parts.length - 1];
    },
    flush(controller) {
      // 处理剩余的缓冲区数据
      if (isValidString(buffer)) {
        controller.enqueue(buffer);
      }
    },
  });
}

/**
 * @description 事件块 -> 事件对象
 * 创建一个 TransformStream，将单个事件块解析为结构化的对象{@link SSEOutput}
 */

function splitEventPart() {
  return new TransformStream<string, SSEOutput>({
    transform(partChunk, controller) {
      // 按单换行符分割事件内的各行
      const lines = partChunk.split(DEFAULT_PART_SEPARATOR);

      // 解析各行为键值对
      const sseObject: SSEOutput = {};
      for (const line of lines) {
        // 检查是否有冒号分隔符
        if (!line.includes(DEFAULT_KV_SEPARATOR)) {
          console.warn(`${line} , ${DEFAULT_KV_SEPARATOR}" is not found in the sse line chunk!`);
          continue;
        }
        // 提取键和值 - 只在第一个冒号处分割，保留值中的冒号
        const colonIndex = line.indexOf(DEFAULT_KV_SEPARATOR);
        const key = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1).trim(); // 去除值前面的空格
        // 跳过空键
        if (isValidString(key)) {
          sseObject[key as SSEFields] = value;
        }
      }
      if (Object.keys(sseObject).length === 0) return;

      // 输出解析后的对象
      controller.enqueue(sseObject);
    },
  });
}

function SseStreamParser<Output = SSEOutput>(options: SSEStreamOptions<Output>) {
  const { readableStream, transformStream } = options;

  // 检查输入是否为 ReadableStream
  if (!(readableStream instanceof ReadableStream)) {
    throw new TypeError('The readableStream must be a ReadableStream instance');
  }
  // 创建文本解码器流（默认 UTF-8）
  const textDecoderStream = new TextDecoderStream();

  // 根据是否提供自定义转换流来决定处理流程
  let stream;
  if (transformStream) {
    stream = readableStream.pipeThrough(textDecoderStream).pipeThrough(transformStream);
  } else {
    stream = readableStream.pipeThrough(textDecoderStream).pipeThrough(splitStream()).pipeThrough(splitEventPart());
  }
  stream = stream as SSEReadableStream<Output>;

  // 添加异步迭代器支持，使流可以用 for await...of 遍历
  stream[Symbol.asyncIterator] = async function* () {
    const reader = this.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        // 输出转换后的数据
        yield value;
      }
    } finally {
      // 确保释放读取器锁
      reader.releaseLock();
    }
  };

  // 添加一个订阅方法
  stream.subscribe = function (callback: (value: Output) => void, onComplete?: () => void) {
    let subscribing: boolean | null = true;
    // 异步处理流数据
    (async () => {
      try {
        const reader = this.getReader();
        try {
          while (subscribing) {
            const { done, value } = await reader.read();
            if (done) {
              onComplete?.();
              break;
            }
            if (value && subscribing) {
              callback(value);
            }
          }
        } finally {
          reader.releaseLock();
        }
      } catch (error) {
        console.error('Error reading stream:', error);
        onComplete?.();
      }
    })();

    // 返回取消订阅的函数
    return () => {
      subscribing = null;
    };
  };

  // 添加一个方法来收集所有数据到一个数组
  stream.collectAll = function (): Promise<Output[]> {
    return new Promise((resolve) => {
      const values: Output[] = [];
      this.subscribe(
        (value) => values.push(value),
        () => resolve(values),
      );
    });
  };

  return stream;
}

export default SseStreamParser;

export type { SSEFields, SSEOutput, SSEReadableStream, SSEStreamOptions };
