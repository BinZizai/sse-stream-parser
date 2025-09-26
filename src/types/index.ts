/**
 * @description SSE 事件字段
 * @link https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#fields
 */
export type SSEFields = 'data' | 'event' | 'id' | 'retry';

/**
 * @description 事件块转换后的事件对象
 * @example
 * const sseObject = {
 *    event: 'delta',
 *    data: '{ key: "world!" }',
 * };
 */
export type SSEOutput = Partial<Record<SSEFields, any>>;

/**
 * @description SseStream 选项
 * @template Output 转换后的事件对象类型
 *
 * @property {ReadableStream<Uint8Array>} readableStream 可读流的二进制数据
 * @link https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
 *
 * @property {TransformStream<string, Output>} transformStream 支持自定义 transformStream 来转换流数据
 * @link https://developer.mozilla.org/en-US/docs/Web/API/TransformStream
 */
export interface SSEStreamOptions<Output> {
  readableStream: ReadableStream<Uint8Array>;
  transformStream?: TransformStream<string, Output>;
}

/**
 * 订阅流数据的方法
 * @param callback 接收到数据时的回调函数
 * @param onComplete 流结束时的回调函数（可选）
 * @returns 返回一个取消订阅的函数
 */
interface SSESubscription<Output> {
  subscribe: (callback: (value: Output) => void, onComplete?: () => void) => () => void;
  collectAll: () => Promise<Output[]>;
}

/**
 * @description SseStream 可读流类型
 * @template Output 转换后的事件对象类型
 * @extends {ReadableStream<Output>} 可读流的事件对象类型
 * @extends {AsyncGenerator<Output>} 异步生成器，用于迭代可读流中的事件对象
 * @extends {SSESubscription<Output>} 订阅流数据的方法
 */
export type SSEReadableStream<Output = SSEOutput> = ReadableStream<Output> &
  AsyncGenerator<Output> &
  SSESubscription<Output>;
