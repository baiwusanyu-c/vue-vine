import type { Plugin } from 'vite'
import { createLogger } from 'vite'
import {
  compileVineStyle,
  compileVineTypeScriptFile,
  createCompilerCtx,
} from '@vue-vine/compiler'
import type {
  VineCompilerOptions,
  VineProcessorLang,
} from '@vue-vine/compiler'
import type { VineQuery } from './src/parse-query'
import { parseQuery } from './src/parse-query'
import { handleHotUpdate } from './src/hot-update'
import { QUERY_TYPE_STYLE } from './src/constants'

type VinePluginOptions = Omit<VineCompilerOptions, 'inlineTemplate'>

function createVinePlugin(options: VinePluginOptions = {}): Plugin {
  // 创建编译上下文对象
  const compilerCtx = createCompilerCtx({
    ...options,
    // 是否为内联模板编译模式
    inlineTemplate: process.env.NODE_ENV === 'production',
  })

  // 开始进行编译
  const runCompileScript = (code: string, fileId: string) => {
    // 对单个 vine.ts 模块进行编译
    const vineFileCtx = compileVineTypeScriptFile(
      code,
      fileId,
      {
        // TODO: ?
        onOptionsResolved: cb => cb(compilerCtx.options),
        // 发生错误时钩子，将错误信息存入上下文的 vineCompileErrors 中
        onError: errMsg => compilerCtx.vineCompileErrors.push(errMsg),
        // 发生警告时钩子，将错误信息存入上下文的 vineCompileWarnings 中
        onWarn: warnMsg => compilerCtx.vineCompileWarnings.push(warnMsg),
        // TODO: ?
        onBindFileCtx: (fileId, fileCtx) => compilerCtx.fileCtxMap.set(fileId, fileCtx),
        // 验证结束的钩子，
        // vine 会分析 vfc 的代码上下文，在顶层作用域中不允许有响应式变量
        // 如果存在非法代码，则会在这个钩子中检测报错。
        onValidateEnd: () => {
          if (compilerCtx.vineCompileErrors.length > 0) {
            const allErrMsg = compilerCtx.vineCompileErrors
              .map(diagnositc => diagnositc.full)
              .join('\n')
            compilerCtx.vineCompileErrors.length = 0
            throw new Error(
              `Vue Vine compilation failed:\n${allErrMsg}`,
            )
          }
        },
      },
    )

    // 编译接收后打印编译过程中收集的警告
    const warnLogger = createLogger('warn')
    if (compilerCtx.vineCompileWarnings.length > 0) {
      for (const warn of compilerCtx.vineCompileWarnings) {
        warnLogger.warn(warn.full)
      }
    }
    compilerCtx.vineCompileWarnings.length = 0

    // 输出编译结果
    return vineFileCtx.fileSourceCode.toString()
  }

  // 开始进行 style 编译
  const runCompileStyle = async (
    styleSource: string,
    query: VineQuery,
    vineFileId: string,
  ) => {
    const { code: compiled } = await compileVineStyle(
      compilerCtx,
      {
        vineFileId,
        source: styleSource,
        isScoped: query.scoped,
        scopeId: query.scopeId,
        preprocessLang: query.lang as VineProcessorLang,
      },
    )

    return compiled
  }

  // 编译顺序
  // transform钩子 对vine.ts执行 runCompileScript （编译为vue的运行时组件）---> vfc code（vfc 中包含 style 的虚拟模块引用）---->
  // vfc 触发 resolveId (返回虚拟模块id) ----> 触发 load(如果是作用域样式，则会返回编译的作用域信息) ---->
  // transform钩子 runCompileStyle 编译样式并返回
  return {
    name: 'vue-vine-plugin',
    enforce: 'pre',
    async resolveId(id) {
      // vine 中， style 使用的是虚拟模块，这里返回虚拟模块 id
      const { query } = parseQuery(id)
      if (query.type === QUERY_TYPE_STYLE) {
        return id
      }
    },
    load(id) {
      const { fileId, query } = parseQuery(id)
      // 根据 style 虚拟模块的 id，找到对应的编译结果返回
      if (query.type === QUERY_TYPE_STYLE && query.scopeId) {
        const fullFileId = `${fileId}.vine.ts`
        const styleSource = compilerCtx.fileCtxMap
          .get(fullFileId)!
          .styleDefine[query.scopeId]
          .source

        console.log(styleSource)
        return {
          code: styleSource,
        }
      }
    },
    async transform(code, id) {
      const { fileId, query } = parseQuery(id)
      if (query.type === QUERY_TYPE_STYLE) {
        const compiledStyle = await runCompileStyle(
          code,
          query,
          `${fileId /* This is virtual file id */}.vine.ts`,
        )
        return {
          code: compiledStyle,
        }
      }
      else if (!fileId.endsWith('.vine.ts')) {
        return
      }

      return {
        code: runCompileScript(code, id),
      }
    },
    handleHotUpdate,
  }
}

export {
  createVinePlugin as vinePlugin,
  VinePluginOptions,
}
