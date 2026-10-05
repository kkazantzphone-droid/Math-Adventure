import path from 'node:path';

// Resolve relative imports instead of relying on text patterns that miss ../ escapes.
export default {
  rules: {
    'pure-imports': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          forbidden:
            'Domain imports must resolve within src/domain and cannot use JSX or external packages.',
        },
      },
      create(context) {
        const domainRoot = path.resolve(context.cwd, 'src/domain');

        function check(node) {
          const specifier = node.value;
          if (typeof specifier !== 'string') {
            context.report({ node, messageId: 'forbidden' });
            return;
          }
          const target = path.resolve(
            path.dirname(context.filename),
            specifier,
          );
          const relative = path.relative(domainRoot, target);
          if (
            !specifier.startsWith('.') ||
            relative === '..' ||
            relative.startsWith(`..${path.sep}`) ||
            path.isAbsolute(relative) ||
            /\.(tsx|jsx)(?:$|[?#])/.test(specifier)
          ) {
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
