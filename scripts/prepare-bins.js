#!/usr/bin/env node
import { chmod, readFile, writeFile, cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHEBANG = '#!/usr/bin/env node\n';

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const rootDir = resolve(__dirname, '..');

  const packageJsonPath = resolve(rootDir, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));

  const binField = packageJson.bin;
  const binTargets =
    typeof binField === 'string'
      ? [binField]
      : Array.isArray(binField)
        ? binField
        : Object.values(binField ?? {});

  if (binTargets.length === 0) {
    return;
  }

  await Promise.all(
    binTargets.map(async (target) => {
      const executablePath = resolve(rootDir, target);
      let contents = await readFile(executablePath, 'utf8');

      if (contents.startsWith('#!')) {
        if (!contents.startsWith(SHEBANG)) {
          const [, ...rest] = contents.split('\n');
          contents = `${SHEBANG}${rest.join('\n')}`;
          await writeFile(executablePath, contents, 'utf8');
        }
      } else {
        contents = `${SHEBANG}${contents}`;
        await writeFile(executablePath, contents, 'utf8');
      }

      await chmod(executablePath, 0o755);
    }),
  );

  const templateSource = resolve(
    rootDir,
    'src/task-executor/planning-promt-tmpl.md',
  );
  const templateDestination = resolve(
    rootDir,
    'dist/task-executor/planning-promt-tmpl.md',
  );
  await mkdir(dirname(templateDestination), { recursive: true });
  await cp(templateSource, templateDestination);
}

main().catch((error) => {
  console.error('[prepare-bins] failed to update executables:', error);
  process.exitCode = 1;
});
