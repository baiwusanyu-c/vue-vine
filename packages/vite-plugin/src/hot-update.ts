import type { HmrContext, ModuleNode } from 'vite'
import { parseQuery } from './parse-query'
import { QUERY_TYPE_STYLE } from './constants'

/**
 * 热更新方法，
 * 这里只针对 css 的模块进行整个 css模块、
 * vine.ts相关模块进行更新
 * @param modules
 */
// TODO: 模块精准更新
export function handleHotUpdate(
  { modules }: HmrContext,
): ModuleNode[] {
  const affectedModules = new Set<ModuleNode>()
  modules.forEach((m) => {
    const importedModules = m.importedModules
    if (importedModules.size > 0) {
      [...importedModules].forEach((im) => {
        if (!im.id)
          return
        const { query } = parseQuery(im.id)
        // filter css modules
        if (query.type === QUERY_TYPE_STYLE) {
          affectedModules.add(im)
        }
      })
    }
  })

  return affectedModules.size > 0
    ? [...modules, ...affectedModules]
    : [...modules]
}
