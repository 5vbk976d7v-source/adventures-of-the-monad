import { createHash } from 'node:crypto';
import { readFile, writeFile, lstat, rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const PRESETS = { micro: 320, thumb: 640, medium: 960, large: 1600 };
const QUALITY = { micro: 76, thumb: 82, medium: 85, large: 88 };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function optionalFile(file) {
  try {
    if (!(await lstat(file)).isFile()) throw new Error(`Expected regular file (no symlinks): ${file}`);
    return await readFile(file);
  } catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}

export async function imageAssets(output) {
  const manifestPath = path.join(output, 'manifest.json');
  const previous = JSON.parse((await optionalFile(manifestPath))?.toString() || '{}');
  const entries = {};
  return {
    async generate(input, directory, id) {
      const bytes = await readFile(input);
      for (const [preset, size] of Object.entries(PRESETS)) {
        const fingerprint = hash(Buffer.concat([bytes, Buffer.from(JSON.stringify({
          size, quality: QUALITY[preset], effort: 5, orient: true, enlarge: false, versions: sharp.versions
        }))]));
        const destination = path.join(directory, `${id}-${preset}.webp`);
        const key = path.relative(output, destination).split(path.sep).join('/');
        const existing = await optionalFile(destination);
        let outputHash = existing && hash(existing);
        if (!existing || previous.entries?.[key]?.source !== fingerprint || previous.entries[key].output !== outputHash) {
          const buffer = await sharp(bytes, { limitInputPixels: 100_000_000 }).autoOrient()
            .resize(size, size, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: QUALITY[preset], effort: 5 }).toBuffer();
          await writeFile(destination, buffer);
          outputHash = hash(buffer);
        }
        entries[key] = { source: fingerprint, output: outputHash };
      }
    },
    async finish() {
      // Delete only obsolete files previously owned by this generator.
      for (const key of Object.keys(previous.entries || {})) {
        if (entries[key] || !/^[a-z0-9-]+\/[a-z0-9-]+-(micro|thumb|medium|large)\.webp$/.test(key)) continue;
        const directory = path.join(output, path.dirname(key));
        try {
          if (!(await lstat(directory)).isDirectory()) throw new Error('Derivative directory cannot be a symlink');
          await rm(path.join(output, key), { force: true });
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      const contents = `${JSON.stringify({ version: 1, entries }, null, 2)}\n`;
      if ((await optionalFile(manifestPath))?.toString() !== contents) await writeFile(manifestPath, contents);
    }
  };
}
