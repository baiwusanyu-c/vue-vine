import type { SgNode } from '@ast-grep/napi'
import type { VineFnCompCtx, VinePropMeta } from '../types'
import { ruleHasVueRefCallExpr, ruleSetupVariableDeclaration } from '../ast-grep/rules-for-script'
import { spaces } from '../utils'

export function compileCSSVars(vineFnCompCtx: VineFnCompCtx) {
  const { cssBindings, setupStmts, props } = vineFnCompCtx
  if (!cssBindings)
    return ''
  const varList = genCSSVarsList(cssBindings, setupStmts, props)
  return genUseCssVarsCode(varList)
}

export const CSS_VARS_HELPER = 'useCssVars'
function genUseCssVarsCode(varList: string) {
  return `_${CSS_VARS_HELPER}(_ctx => ({
${varList}
}))`
}

function genCSSVarsList(
  cssBindings: Record<string, string | null> | null,
  setupStmts: SgNode[],
  props: Record<string, VinePropMeta>,
) {
  let res = ''
  if (cssBindings) {
    for (const cssBindKey in cssBindings) {
      const cssBindValue = cssBindings[cssBindKey]
      let varRes = ''
      // look for from setup variable
      for (let i = 0; i < setupStmts.length; i++) {
        varRes = genCSSVarsItem(setupStmts[i], cssBindKey, cssBindValue || '')
        if (varRes)
          break
      }
      // look for from props variable
      if (!varRes) {
        for (const key in props) {
          varRes = genCSSVarsItemProps(key, cssBindKey, cssBindValue || '')
          if (varRes)
            break
        }
      }

      res = `${res}${varRes}`
    }
  }

  return res
}

function genCSSVarsItem(
  node: SgNode,
  name: string,
  value: string,
) {
  let res = ''
  let varName = ''
  const matchRes = node.find(ruleSetupVariableDeclaration)
  if (!matchRes) {
    return ''
  }

  switch (matchRes.kind()) {
    case 'variable_declarator':
      varName = matchRes.field('name')!.text()
      break
    case 'pair_pattern':
      varName = matchRes.field('key')!.text()
      break
  }

  if (name !== varName) {
    return ''
  }

  // e.g. const foo = ref('foo')
  if (node.find(ruleHasVueRefCallExpr)) {
    if (matchRes) {
      res = `${spaces(2)}'${value}': (${varName}.value),\n`
    }
  }
  // e.g. const foo = 'foo'
  else if (matchRes) {
    res = `${spaces(2)}'${value}': (${varName}),\n`
  }
  return res
}

function genCSSVarsItemProps(
  propName: string,
  name: string,
  value: string,
) {
  const propValue = `props.${propName}`
  const isPropNameEqualName = propName === name
  if (isPropNameEqualName) {
    // color <-> props.color
    return `${spaces(2)}'${value}': (${propValue}),\n`
  }
  else if (propValue === name) {
    // props.color <-> props.color
    return `${spaces(2)}'${value}': (${name}),\n`
  }
  else {
    return ''
  }
}
