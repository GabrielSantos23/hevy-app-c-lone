import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';

import { type FedbEntry, fromFedb } from '../src/features/exercises/fedb-mapper.ts';
import { buildLibrary, normalizeName, slugify } from '../src/features/exercises/gif-mapper.ts';

const GIFS_DIR = process.env.EXERCISE_GIFS_DIR ?? 'D:/projects/gym-gifs/gifs';
const MEDIA_DIR = 'assets/exercise-media';
const FEDB_COMMIT = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5';
const FEDB_BASE = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${FEDB_COMMIT}`;
const SEED_VERSION = 3;

if (!existsSync(GIFS_DIR)) throw new Error(`GIF folder not found: ${GIFS_DIR}`);

const files = readdirSync(GIFS_DIR).flatMap((folder) =>
  readdirSync(join(GIFS_DIR, folder))
    .filter((f) => f.toLowerCase().endsWith('.gif'))
    .map((f) => ({ folder, title: f.replace(/\.gif$/i, ''), path: join(GIFS_DIR, folder, f) })),
);

const response = await fetch(`${FEDB_BASE}/dist/exercises.json`);
if (!response.ok) throw new Error(`free-exercise-db download failed: ${response.status}`);
const fedb = (await response.json()) as FedbEntry[];
const instructions = new Map(
  fedb
    .filter((e) => e.instructions.length)
    .map((e) => [normalizeName(e.name), e.instructions.join('\n')]),
);

const gifExercises = buildLibrary(files, instructions);
const fedbExercises = fromFedb(fedb, new Set(gifExercises.map((e) => normalizeName(e.name))));
const exercises = [...gifExercises, ...fedbExercises].sort((a, b) => a.name.localeCompare(b.name));
const imagesById = new Map(fedb.map((e) => [e.id, e.images]));
const pathBySlug = new Map<string, string>();
for (const f of files)
  if (!pathBySlug.has(slugify(f.title))) pathBySlug.set(slugify(f.title), f.path);

mkdirSync(MEDIA_DIR, { recursive: true });
let converted = 0;
const queue = [...exercises];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let e = queue.shift(); e; e = queue.shift()) {
      const anim = join(MEDIA_DIR, `${e.sourceId}.webp`);
      if (existsSync(anim)) continue;
      converted++;
      if (e.source === 'free-exercise-db') {
        const frames = await Promise.all(
          imagesById.get(e.sourceId)!.map(async (img) => {
            const res = await fetch(`${FEDB_BASE}/exercises/${img}`);
            if (!res.ok) throw new Error(`${img}: ${res.status}`);
            return sharp(Buffer.from(await res.arrayBuffer()))
              .resize(240, 240, { fit: 'contain', background: '#ffffff' })
              .toBuffer();
          }),
        );
        await sharp(frames, { join: { animated: true } })
          .webp({ quality: 55, delay: frames.map(() => 1000), loop: 0 })
          .toFile(anim);
        continue;
      }
      const src = pathBySlug.get(e.sourceId)!;
      await sharp(src, { animated: true })
        .resize(240)
        .webp({ quality: 55, effort: 4 })
        .toFile(anim);
    }
  }),
);

writeFileSync(
  'src/db/seed/exercises.json',
  `${JSON.stringify({ version: SEED_VERSION, exercises })}\n`,
);

const entries = exercises
  .map((e) => `  '${e.sourceId}': require('../../../${MEDIA_DIR}/${e.sourceId}.webp'),`)
  .join('\n');
writeFileSync(
  'src/features/exercises/media.generated.ts',
  `export const media: Record<string, number> = {\n${entries}\n};\n`,
);

const withInstructions = exercises.filter((e) => e.instructions).length;
console.log(
  `${gifExercises.length} from ${files.length} GIFs + ${fedbExercises.length} from free-exercise-db, ${withInstructions} with instructions, ${converted} converted`,
);
