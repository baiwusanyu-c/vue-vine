import { QUERY_TYPE_SCRIPT } from './constants'

export interface VineQuery {
  type: string
  scopeId: string
  scoped: boolean
  lang: string
}
type VineQueryRaw = Record<keyof VineQuery, string>

/**
 * 解析模块 id，切分 query 参数
 * @param id
 */
export function parseQuery(id: string) {
  const [fileId, queryRawStr] = id.split('?', 2)
  const rawQuery = Object.fromEntries(new URLSearchParams(queryRawStr)) as VineQueryRaw
  const query: VineQuery = {
    type: rawQuery.type == null ? QUERY_TYPE_SCRIPT : rawQuery.type,
    lang: rawQuery.lang,
    scopeId: rawQuery.scopeId,
    scoped: rawQuery.scoped === 'true',
  }

  return {
    fileId,
    query,
  }
}
