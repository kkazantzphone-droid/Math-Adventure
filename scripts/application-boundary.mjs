import path from 'node:path';

// Application orchestration can depend only on its own ports and pure domain.
export default {
  rules: {
    'port-imports': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          forbidden:
            'Application imports must resolve within src/application or src/domain and cannot use JSX or external packages.',
        },
      },
      create(context) {
        const roots = ['src/application', 'src/domain'].map((root) =>
          path.resolve(context.cwd, root),
        );

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
          const allowed = roots.some((root) => {
            const relative = path.relative(root, target);
            return (
              relative !== '..' &&
              !relative.startsWith(`..${path.sep}`) &&
              !path.isAbsolute(relative)
            );
          });
          if (
            !/^\.\.?[\\/]/.test(specifier) ||
            !allowed ||
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
          TSImportEqualsDeclaration: (node) =>
            node.moduleReference.type === 'TSExternalModuleReference' &&
            check(node.moduleReference.expression),
        };
      },
    },
  },
};
