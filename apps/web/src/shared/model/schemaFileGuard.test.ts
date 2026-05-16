import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const schemaFilePattern = /Schema\.ts$/;

function findSchemaFiles(directoryPath: string): string[] {
  const entries = readdirSync(directoryPath, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const entryPath = join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      return findSchemaFiles(entryPath);
    }

    if (!schemaFilePattern.test(entry.name)) {
      return [];
    }

    return [entryPath];
  });
}

describe('schema file guard', () => {
  it('does not allow empty `*Schema.ts` files', () => {
    const schemaSearchRoots = [
      resolve(process.cwd(), 'src/post'),
      resolve(process.cwd(), 'src/comment'),
      resolve(process.cwd(), 'src/draft'),
      resolve(process.cwd(), 'src/shared'),
    ];
    const schemaFiles = schemaSearchRoots.flatMap((schemaSearchRoot) => findSchemaFiles(schemaSearchRoot));

    const emptySchemaFiles = schemaFiles.filter((schemaFilePath) => {
      const fileContent = readFileSync(schemaFilePath, 'utf-8');
      return fileContent.trim().length === 0;
    });

    expect(emptySchemaFiles).toEqual([]);
  });
});
