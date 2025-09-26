# SSE Stream Parser

[![npm version](https://badge.fury.io/js/sse-stream-parser.svg)](https://badge.fury.io/js/sse-stream-parser)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

一个用于处理 Server-Sent Events (SSE) 流数据的 TypeScript 库，支持将 SSE 协议的 ReadableStream 转换为结构化数据，并提供灵活的流处理能力。

## ✨ 特性

- 🚀 **TypeScript 原生支持** - 完整的类型定义和类型安全
- 📡 **SSE 协议解析** - 自动解析 SSE 格式的流数据
- 🔄 **灵活的数据转换** - 支持自定义 TransformStream 进行数据转换
- 🎯 **多种消费方式** - 支持异步迭代器、订阅模式等多种数据消费方式
- 🛡️ **错误处理** - 内置错误处理和资源清理机制
- 📦 **零依赖** - 基于现代浏览器原生 API，无外部依赖

## 📦 安装

```bash
npm install sse-stream-parser
```

```bash
yarn add sse-stream-parser
```

```bash
pnpm add sse-stream-parser
```

## 🚀 快速开始

### 基础用法 - SSE 协议解析

```typescript
import SseStreamParser from 'sse-stream-parser';

// 从 fetch 获取 SSE 流
const response = await fetch('/api/sse-endpoint');
const stream = SseStreamParser({
  readableStream: response.body!,
});

// 方式1: 使用 for await...of 异步迭代
for await (const event of stream) {
  console.log('SSE Event:', event);
  // 输出: { event: 'message', data: 'Hello World', id: '1' }
}
```

### 订阅模式

```typescript
// 方式2: 使用订阅模式
const unsubscribe = stream.subscribe(
  (event) => {
    console.log('收到事件:', event);
  },
  () => {
    console.log('流已结束');
  },
);

// 需要时取消订阅
// unsubscribe();
```

### 自定义数据转换

```typescript
// 自定义转换流，将 SSE 数据转换为特定格式
const customTransform = new TransformStream<string, CustomData>({
  transform(chunk, controller) {
    try {
      const data = JSON.parse(chunk);
      controller.enqueue({
        timestamp: Date.now(),
        payload: data,
        processed: true,
      });
    } catch (error) {
      console.error('解析错误:', error);
    }
  },
});

const stream = SseStreamParser<CustomData>({
  readableStream: response.body!,
  transformStream: customTransform,
});
```

## 📚 使用场景

### 1. SSE 协议数据处理

**何时使用**: 当你需要处理符合 SSE 协议格式的流数据时

```typescript
// SSE 格式数据示例:
// event: message
// data: {"type": "chat", "content": "Hello"}
// id: 123
//
// event: update
// data: {"status": "processing"}

const stream = SseStreamParser({
  readableStream: response.body!,
});

for await (const event of stream) {
  switch (event.event) {
    case 'message':
      handleMessage(JSON.parse(event.data));
      break;
    case 'update':
      handleUpdate(JSON.parse(event.data));
      break;
  }
}
```

### 2. 通用流数据解码

**何时使用**: 当你需要将任何协议的 ReadableStream 解码并转换为特定格式时

```typescript
// 处理自定义协议的流数据
const jsonLinesTransform = new TransformStream<string, any>({
  transform(chunk, controller) {
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        try {
          controller.enqueue(JSON.parse(line));
        } catch (error) {
          console.error('JSON 解析错误:', error);
        }
      }
    }
  },
});

const stream = SseStreamParser({
  readableStream: response.body!,
  transformStream: jsonLinesTransform,
});
```

### 3. 实时数据流处理

```typescript
// 处理实时聊天消息
const chatStream = SseStreamParser<ChatMessage>({
  readableStream: chatResponse.body!,
});

chatStream.subscribe(
  (message) => {
    updateChatUI(message);
  },
  () => {
    showConnectionClosed();
  },
);

// 处理实时日志流
const logStream = SseStreamParser<LogEntry>({
  readableStream: logResponse.body!,
});

for await (const logEntry of logStream) {
  appendToLogViewer(logEntry);
}
```

## 🔧 API 文档

### `SseStreamParser<Output>(options: SSEStreamOptions<Output>)`

创建一个 SSE 流处理器。

#### 参数

- `options.readableStream: ReadableStream<Uint8Array>` - 输入的可读流
- `options.transformStream?: TransformStream<string, Output>` - 可选的自定义转换流

#### 返回值

返回一个 `SSEReadableStream<Output>`，具有以下能力：

- **异步迭代器**: 支持 `for await...of` 语法
- **订阅模式**: `subscribe(callback, onComplete?)` 方法
- **原生流**: 继承 `ReadableStream` 的所有方法

### 类型定义

```typescript
// SSE 事件字段类型
type SSEFields = 'data' | 'event' | 'id' | 'retry';

// 默认的 SSE 输出格式
type SSEOutput = Partial<Record<SSEFields, any>>;

// 流配置选项
interface SSEStreamOptions<Output> {
  readableStream: ReadableStream<Uint8Array>;
  transformStream?: TransformStream<string, Output>;
}

// 增强的可读流类型
type SSEReadableStream<Output = SSEOutput> = ReadableStream<Output> &
  AsyncGenerator<Output> & {
    subscribe(callback: (value: Output) => void, onComplete?: () => void): () => void;
  };
```

## 🌟 高级用法

### 错误处理

```typescript
try {
  const stream = SseStreamParser({ readableStream: response.body! });

  for await (const event of stream) {
    try {
      processEvent(event);
    } catch (error) {
      console.error('处理事件时出错:', error);
    }
  }
} catch (error) {
  console.error('流处理出错:', error);
}
```

### 流的组合和管道

```typescript
// 组合多个转换流
const preprocessor = new TransformStream<string, string>({
  transform(chunk, controller) {
    // 预处理数据
    const cleaned = chunk.replace(/\r\n/g, '\n');
    controller.enqueue(cleaned);
  },
});

const parser = new TransformStream<string, ParsedData>({
  transform(chunk, controller) {
    // 解析数据
    const parsed = parseCustomFormat(chunk);
    controller.enqueue(parsed);
  },
});

// 创建处理管道
const processedStream = response.body!.pipeThrough(new TextDecoderStream()).pipeThrough(preprocessor);

const stream = SseStreamParser({
  readableStream: processedStream,
  transformStream: parser,
});
```

### 性能优化

```typescript
// 批量处理数据
let batch: SSEOutput[] = [];
const BATCH_SIZE = 10;

const stream = SseStreamParser({ readableStream: response.body! });

stream.subscribe((event) => {
  batch.push(event);

  if (batch.length >= BATCH_SIZE) {
    processBatch(batch);
    batch = [];
  }
});
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🔗 相关链接

- [Server-Sent Events - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [ReadableStream - MDN](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
- [TransformStream - MDN](https://developer.mozilla.org/en-US/docs/Web/API/TransformStream)
