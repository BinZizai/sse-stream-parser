import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true, // 自动生成 types 入口
      copyDtsFiles: true, // 复制 .d.ts 文件
      include: ['src/**/*'],
      outDir: 'dist',
      pathsToAliases: true, // 自动处理路径别名
      staticImport: true, // 静态导入
      clearPureImport: true, // 清理输出目录
    }),
  ],
  build: {
    lib: {
      // 入口文件
      entry: resolve(__dirname, 'src/index.ts'),
      // 库名称
      name: 'SseStreamParser',
      // 输出文件名
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      // 例如：如果你的库依赖于某些大型库，可以将它们外部化
      // external: ['lodash', 'axios'],
      external: [],
      output: {
        // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
        // globals: {
        //   'lodash': '_',
        //   'axios': 'axios'
        // }
        globals: {},
      },
    },
  },
});
