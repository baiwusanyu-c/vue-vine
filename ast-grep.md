## ast-grep 规则配置
```typescript
const rule = {
  vineFunctionComponentDeclaration: {
    // any 是匹配其数组找任意规则的意思
    // 匹配节点的元变量只包含，符合匹配子规则的元变量。
    any: [
      // 源码中没有 export 且能够匹配 规则 'vineFunctionComponentMatching'
      {
        // No export
        // matches 可以通过规则名称 引用其他规则到本规则中
        matches: 'vineFunctionComponentMatching',
        // not 如果子规则不匹配，则采用单个子规则并匹配节点。
        not: {
          // inside 关系规则
          // 接受规则并将匹配满足内部规则的另一个节点内的任何节点
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
  // 匹配一个 类型为 'lexical_declaration' 节点
  // 且该节点必须包含有any中任意一个规则(普通函数规则和箭头函数规则)的子节点
  // 1.箭头函数规则，种类必须为 arrow_function, 且子满足规则 vineTaggedTemplateString
  // 2.普通函数规则, 种类必须为 function, 且子满足规则 vineTaggedTemplateString
  vineVariableFunctionDeclaration: {
    kind: 'lexical_declaration',
    has: {
      // has 规则只会匹配子节点（这里是 类型为 'lexical_declaration' 节点 的子节点）
      // topBy: 'end' 可以对其深度匹配
      stopBy: 'end',
      any: [
        {
          // 箭头函数
          /**
           * const a = () => {
           * return vine`<div></div>`
           * }
           * const b = () => {
           * return 1
           * }
           */
          // a 会被匹配
          kind: 'arrow_function',
          has: {
            stopBy: 'end',
            // 识别 vine`<div></div>` 的匹配规则
            matches: 'vineTaggedTemplateString',
          },
        },
        {
          // 普通函数
          /**
           * const a = function() {
           * return vine`<div></div>`
           * }
           * const b = function() {
           * return 1
           * }
           */
          // a 会被匹配
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

  // 识别 vine`<div></div>` 的匹配规则
  // 通过playground可以分析出这个规则
  // 该 sgNode 种类为调用表达式 call_expression
  // 且该节点必须符合 all 中的两个规则
  // 1.必须拥有 template_string 类型的节点 且 该节点是一个参数（field: 'arguments'）
  // 匹配 `<div></div>`
  // 2. 必须有一个符合正则  regex: 'vine' 的节点，且该节点是函数 （field: 'function',）
  // 匹配 vine
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
}

```
