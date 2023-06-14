import type { NapiConfig } from '@ast-grep/napi'
import { directlyMatchUtil, directlyReverseUtil, fastCreateMatchRuleByUtils } from './shared'

function macroCallPattern(macroName: string) {
  return {
    kind: 'call_expression',
    has: {
      field: 'function',
      regex: macroName,
    },
  } as const
}
function validMacroCallPattern(macroCallRuleUtilName: string) {
  return {
    matches: macroCallRuleUtilName,
    inside: {
      stopBy: 'end',
      matches: 'vineFunctionComponentMatching',
    },
  } as const
}
function invalidMacroCallNotInsideVineFunctionComponent(
  macroCallRuleUtilName: string,
) {
  return {
    matches: macroCallRuleUtilName,
    not: {
      inside: {
        stopBy: 'end',
        matches: 'vineFunctionComponentMatching',
      },
    },
  } as const
}

const topLevelStmtKinds = [
  'import_statement',
  'export_statement',
  'function_declaration',
  'class_declaration',
  'abstract_class_declaration',
  'enum_declaration',
  'lexical_declaration',
  'type_alias_declaration',
  'interface_declaration',
  'comment',
] as const

export const vineScriptRuleUtils = {
  importClause: {
    kind: 'import_clause',
  },
  importSpecifier: {
    kind: 'import_specifier',
  },
  importNamespace: {
    kind: 'namespace_import',
  },
  importStmt: {
    kind: 'import_statement',
  },
  vinePropCall: macroCallPattern('vineProp'),
  vineStyleCall: macroCallPattern('vineStyle'),
  vineExposeCall: macroCallPattern('vineExpose'),
  vineEmitsCall: macroCallPattern('vineEmits'),
  vineOptionsCall: macroCallPattern('vineOptions'),
  validVineEmitsCall: validMacroCallPattern('vineEmitsCall'),
  validVineOptionsCall: validMacroCallPattern('vineOptionsCall'),
  idInsideMacroMayReferenceSetupLocal: {
    kind: 'identifier',
    inside: {
      stopBy: 'end',
      any: [
        { matches: 'validVineEmitsCall' },
        { matches: 'validVineOptionsCall' },
      ],
    },
  },
  validVinePropDeclaration: {
    kind: 'lexical_declaration',
    has: {
      stopBy: 'end',
      matches: 'vinePropCall',
    },
    inside: {
      stopBy: 'end',
      matches: 'vineFunctionComponentMatching',
    },
  },
  vinePropValidatorFnBody: {
    kind: 'statement_block',
    inside: {
      stopBy: 'end',
      matches: 'vinePropCall',
    },
  },
  vinePropsTyping: {
    kind: 'object_type',
    inside: {
      stopBy: 'end',
      matches: 'vineFormalParmasProps',
    },
  },
  vineFormalParmasProps: {
    kind: 'formal_parameters',
    inside: {
      stopBy: {
        kind: 'statement_block',
      },
      matches: 'vineFunctionComponentMatching',
    },
  },
  vineEmitsDeclaration: {
    kind: 'variable_declarator',
    has: {
      stopBy: 'end',
      matches: 'vineEmitsCall',
    },
  },
  setupVariableDeclaration: {
    any: [
      {
        kind: 'variable_declarator',
      },
      {
        kind: 'pair_pattern',
      },
    ],
  },
  // 识别 vine`<div></div>` 的匹配规则
  vineTaggedTemplateString: {
    kind: 'call_expression',
    all: [
      {
        has: {
          kind: 'template_string',
          field: 'arguments',
        },
      },
      {
        has: {
          field: 'function',
          regex: 'vine',
        },
      },
    ],
  },
  functionDeclaration: {
    any: [
      {
        kind: 'function_declaration',
      },
      {
        kind: 'lexical_declaration',
        has: {
          stopBy: 'end',
          kind: 'arrow_function',
        },
      },
    ],
  },
  // 匹配名称式的函数声明
  vineNormalFunctionDeclaration: {
    kind: 'function_declaration',
    has: {
      field: 'body',
      has: {
        stopBy: 'end',
        // 识别 vine`<div></div>` 的匹配规则
        matches: 'vineTaggedTemplateString',
      },
    },
  },
  // 变量式的函数声明
  vineVariableFunctionDeclaration: {
    kind: 'lexical_declaration',
    has: {
      stopBy: 'end',
      any: [
        {
          // 箭头函数
          kind: 'arrow_function',
          has: {
            stopBy: 'end',
            // 识别 vine`<div></div>` 的匹配规则
            matches: 'vineTaggedTemplateString',
          },
        },
        {
          // 普通函数
          kind: 'function',
          has: {
            stopBy: 'end',
            // 识别 vine`<div></div>` 的匹配规则
            matches: 'vineTaggedTemplateString',
          },
        },
      ],
    },
  },

  // 匹配名称式的函数声明和变量式的函数声明
  vineFunctionComponentMatching: {
    any: [
      {
        matches: 'vineNormalFunctionDeclaration',
      },
      {
        matches: 'vineVariableFunctionDeclaration',
      },
    ],
  },
  // vfc 的声明检测规则，用于从 .vine.ts 源码中找到所有
  // vfc 的声明
  // e.g
  // export function foo() {}
  // const foo = () => {}
  vineFunctionComponentDeclaration: {
    // any 是匹配其数组找那个任意规则的意思
    any: [
      // 源码中没有 export 且能够匹配 规则 'vineFunctionComponentMatching'
      {
        // No export
        matches: 'vineFunctionComponentMatching',
        not: {
          inside: {
            kind: 'export_statement',
          },
        },
      },
      // 源码中有 export 且声明域（declaration）能够匹配 规则 'vineFunctionComponentMatching'
      {
        kind: 'export_statement',
        has: {
          field: 'declaration',
          matches: 'vineFunctionComponentMatching',
        },
      },
    ],
  },
  hasMacroCallExpr: {
    has: {
      stopBy: 'end',
      kind: 'call_expression',
      any: [
        {
          regex: 'vineProp',
        },
        {
          regex: 'vineEmits',
        },
        {
          regex: 'vineStyle',
        },
        {
          regex: 'vineExpose',
        },
        {
          regex: 'vineOptions',
        },
      ],
    },
  },
  hasVueRefCallExpr: {
    has: {
      stopBy: 'end',
      kind: 'call_expression',
      regex: 'ref',
    },
  },

  // Rules for find invalid.
  invalidOutsideVineStyleCall: invalidMacroCallNotInsideVineFunctionComponent('vineStyleCall'),
  invalidOutsideVineExposeCall: invalidMacroCallNotInsideVineFunctionComponent('vineExposeCall'),
  invalidOutsideVinePropCall: invalidMacroCallNotInsideVineFunctionComponent('vinePropCall'),
  invalidOutsideVineEmitsCall: invalidMacroCallNotInsideVineFunctionComponent('vineEmitsCall'),
  invalidOutsideVineOptionsCall: invalidMacroCallNotInsideVineFunctionComponent('vineOptionsCall'),
  invalidNoDeclVinePropCall: {
    matches: 'vinePropCall',
    not: {
      inside: {
        stopBy: 'end',
        kind: 'lexical_declaration',
        inside: {
          stopBy: 'end',
          matches: 'vineFunctionComponentMatching',
        },
      },
    },
  },
  invalidDeclOfVineStyleCall: {
    kind: 'lexical_declaration',
    has: {
      stopBy: 'end',
      pattern: 'vineStyle',
    },
    inside: {
      stopBy: 'end',
      matches: 'vineFunctionComponentMatching',
    },
  },
  invalidRootScopeStmt: {
    pattern: '$STMT',
    inside: {
      kind: 'program',
    },
    not: {
      any: [
        {
          matches: 'vineFunctionComponentDeclaration',
        },
        ...topLevelStmtKinds.map(kind => ({
          kind,
        })),
      ],
    },
  },
} as const

export const ruleVineFunctionComponentDeclaration = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'vineFunctionComponentDeclaration')
export const ruleVineFunctionComponentMatching = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'vineFunctionComponentMatching')
export const ruleVineFormalParmasProps = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'vineFormalParmasProps')
export const ruleVineEmitsCall = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'validVineEmitsCall')
export const ruleVineEmitsDeclaration = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'vineEmitsDeclaration')
export const ruleValidVinePropDeclaration = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'validVinePropDeclaration')
export const ruleVinePropValidatorFnBody = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'vinePropValidatorFnBody')
export const ruleInvalidNoDeclVinePropCall = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'invalidNoDeclVinePropCall')
export const ruleInvalidDefineStyleWithDeclaration = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'invalidDeclOfVineStyleCall')
export const ruleInvalidRootScopeStmt = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'invalidRootScopeStmt')
export const ruleIdInsideMacroMayReferenceSetupLocal = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'idInsideMacroMayReferenceSetupLocal')
export const ruleHasMacroCallExpr = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'hasMacroCallExpr')
export const ruleHasVueRefCallExpr = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'hasVueRefCallExpr')
export const ruleSetupVariableDeclaration = fastCreateMatchRuleByUtils(vineScriptRuleUtils, 'setupVariableDeclaration')
export const ruleVineTaggedTemplateString = directlyMatchUtil(vineScriptRuleUtils, 'vineTaggedTemplateString')
export const ruleImportStmt = directlyMatchUtil(vineScriptRuleUtils, 'importStmt')
export const ruleImportClause = directlyMatchUtil(vineScriptRuleUtils, 'importClause')
export const ruleImportSpecifier = directlyMatchUtil(vineScriptRuleUtils, 'importSpecifier')
export const ruleNotImportSpecifier = directlyReverseUtil(vineScriptRuleUtils, 'importSpecifier')
export const ruleImportNamespace = directlyMatchUtil(vineScriptRuleUtils, 'importNamespace')
export const ruleVineStyleCall = directlyMatchUtil(vineScriptRuleUtils, 'vineStyleCall')
export const ruleVinePropCall = directlyMatchUtil(vineScriptRuleUtils, 'vinePropCall')
export const ruleVineExposeCall = directlyMatchUtil(vineScriptRuleUtils, 'vineExposeCall')
export const ruleVineOptionsCall = directlyMatchUtil(vineScriptRuleUtils, 'vineOptionsCall')

export const ruleHasTemplateStringInterpolation: NapiConfig = {
  rule: {
    has: {
      kind: 'template_substitution',
    },
  },
}
export const ruleInvalidOutsideMacroCalls: NapiConfig = {
  rule: {
    any: [
      { matches: 'invalidOutsideVinePropCall' },
      { matches: 'invalidOutsideVineStyleCall' },
      { matches: 'invalidOutsideVineExposeCall' },
      { matches: 'invalidOutsideVineEmitsCall' },
      { matches: 'invalidOutsideVineOptionsCall' },
    ],
  },
}
