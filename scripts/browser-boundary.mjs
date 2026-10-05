import { builtinModules } from 'node:module';

const nodeModules = new Set(
  builtinModules.map((name) => name.replace(/^node:/, '')),
);

export default {
  rules: {
    'no-node-imports': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          forbidden: 'Production browser source cannot import Node modules.',
          computed:
            'Browser imports must use literal specifiers so the Node boundary can be checked.',
        },
      },
      create(context) {
        function check(node) {
          const specifier = node.value;
          if (typeof specifier !== 'string') {
            context.report({ node, messageId: 'computed' });
            return;
          }
          if (specifier.startsWith('node:') || nodeModules.has(specifier)) {
            context.report({ node, messageId: 'forbidden' });
          }
        }

        return {
          ImportDeclaration: (node) => check(node.source),
          ExportNamedDeclaration: (node) => node.source && check(node.source),
          ExportAllDeclaration: (node) => check(node.source),
          ImportExpression: (node) => check(node.source),
          TSImportType: (node) => check(node.source),
        };
      },
    },
  },
};
