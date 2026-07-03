// Vercel serverless entry point. Kept dependency-free (no NestJS decorators) so
// Vercel's esbuild bundler doesn't need emitDecoratorMetadata — the real Nest
// bootstrap is compiled ahead of time by `nest build` into ../dist.
// @ts-expect-error — ../dist is produced by the build step, not present at lint time.
export { default } from '../dist/vercel-handler.js';
