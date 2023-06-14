import { ts } from '@ast-grep/napi'
import MagicString from 'magic-string'
import type { VineCompilerCtx, VineCompilerHooks, VineCompilerOptions, VineFileCtx } from './src/types'
import { ruleVineFunctionComponentDeclaration } from './src/ast-grep/rules-for-script'
import { validateVine } from './src/validate'
import { analyzeVine } from './src/analyze'
import { transformFile } from './src/transform'

const { parse } = ts

export {
  compileVineStyle,
} from './src/style/compile'

export {
  findTemplateAllScriptSgNode,
} from './src/template/parse'

export {
  type VineDiagnostic,
} from './src/diagnostics'

export {
  type VineFileCtx,
  type VineFnCompCtx,
  type VineCompilerOptions,
  type VineProcessorLang,
  type VineCompilerHooks,
} from './src/types'

/**
 * 创建 vine 编译上下文
 * @param options
 */
export function createCompilerCtx(
  options: VineCompilerOptions,
): VineCompilerCtx {
  return {
    // 文件上下文 map，对应每一个 .vine.ts 文件
    fileCtxMap: new Map(),
    // 收集 vine 编译过程中的错误信息
    vineCompileErrors: [],
    // 收集 vine 编译过程中的警告信息
    vineCompileWarnings: [],
    // vine 的配置项
    options: {
      // inline 模板编译模式（ 非 inline 模式下，会把组件渲染函数单独编译成一个 render 方法）
      inlineTemplate: true, // default inline template
      // Maybe some default options ...
      ...options,
    },
  }
}

/**
 * 编译 vfc 的 script 内容
 * @param code vfc(.vine.ts) 源碼
 * @param fileId 文件 id
 * @param compilerHooks 编译钩子
 */
export function compileVineTypeScriptFile(
  code: string,
  fileId: string,
  compilerHooks: VineCompilerHooks,
) {
  let compilerOptions: VineCompilerOptions | undefined
  // 执行编译钩子从 编译上下文（VineCompilerCtx）中获取配置
  compilerHooks.onOptionsResolved((options) => {
    compilerOptions = options
  })
  // Using ast-grep to validate vine declarations
  // 使用 ast-grep 去解析源码
  const sgRoot = parse(
    // https://github.com/vue-vine/vue-vine/pull/24
    // ast-grep will exclude the escape characters in the first line,
    // which leads to a mismatch between the original code index
    // and the actual file index when the range method is used in the conversion stage,
    // then the original code cannot be completely removed by MagicString
    code.trim(),
  ).root()
  // 创建文件上下文
  const vineFileCtx: VineFileCtx = {
    // .vine.ts 的文件 id
    fileId,
    // 源码..
    // （TODO：这里我觉得可以 直接 code.trim()，减少sgRoot.text调用）
    fileSourceCode: new MagicString(sgRoot.text()),
    // .vine.ts 中的 vfc 的 sgNode 列表
    vineFnComps: [],
    // TODO：
    userImports: {},
    // TODO：
    styleDefine: {},
    // TODO：
    vueImportAliases: {},
    // 使用 ast-grep 解析源码的根节点
    sgRoot,
  }
  // 执行 onBindFileCtx 钩子
  // 将 vineFileCtx 存入编译上下文（VineCompilerCtx）的 fileCtxMap 中
  compilerHooks.onBindFileCtx?.(fileId, vineFileCtx)

  // 运用规则，找到这个 .vine.ts 中的所有 vfc
  // 一个函数中如果包含有模板 vine`<xxxx></xxxx>`
  // 则被是被为是一个 vfc
  const vineFnCompDecls = sgRoot.findAll(
    ruleVineFunctionComponentDeclaration,
  )

  // 1. Validate all vine restrictions
  // 验证 .vine.ts 的顶层作用域语法是否合法
  // TODO
  validateVine(compilerHooks, vineFileCtx, vineFnCompDecls)
  // 执行 onValidateEnd 钩子，如果不合法，则报错
  compilerHooks.onValidateEnd?.()

  // 未找到 Vine 函数组件声明 直接返回
  if (vineFnCompDecls.length === 0) {
    // No vine function component declarations found
    return vineFileCtx
  }

  // 2. Analysis
  // TODO
  analyzeVine([compilerHooks, vineFileCtx], vineFnCompDecls)

  // 3. Codegen, or call it "transform"
  // 代码生成
  // TODO
  transformFile(vineFileCtx, compilerOptions?.inlineTemplate ?? true)

  return vineFileCtx
}
