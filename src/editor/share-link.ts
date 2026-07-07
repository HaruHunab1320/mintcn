import type { ComponentOverride, Preset, ProjectDocument, TokenState } from '@/schema';

/**
 * The subset of a ProjectDocument we ship in a shareable URL. Components and
 * originals stay from whatever the recipient's session already has loaded
 * (fixture, or a project they've connected). Overrides target component IDs
 * like "button" that exist in every shadcn project, so they still apply.
 */
export interface ShareableSlice {
  v: 1;
  meta: {
    name: string;
    baseColor: ProjectDocument['meta']['baseColor'];
  };
  tokens: TokenState;
  overrides: ComponentOverride[];
  presets: Preset[];
}

export function projectToShareableSlice(doc: ProjectDocument): ShareableSlice {
  return {
    v: 1,
    meta: { name: doc.meta.name, baseColor: doc.meta.baseColor },
    tokens: doc.tokens,
    overrides: doc.overrides,
    presets: doc.presets,
  };
}

/**
 * Merges a decoded slice back into a base document (usually the fixture or
 * the currently-loaded project). Non-slice fields (`components`, `meta.config`,
 * etc.) come from the base — the URL is purely a theme delta.
 */
export function applyShareableSlice(base: ProjectDocument, slice: ShareableSlice): ProjectDocument {
  return {
    ...base,
    meta: { ...base.meta, name: slice.meta.name, baseColor: slice.meta.baseColor },
    tokens: slice.tokens,
    overrides: slice.overrides,
    presets: slice.presets,
  };
}

// --- URL encoding ------------------------------------------------------------

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64Url(encoded: string): Uint8Array {
  const padded = encoded.replaceAll('-', '+').replaceAll('_', '/');
  const padLen = padded.length % 4 === 0 ? 0 : 4 - (padded.length % 4);
  const binary = atob(padded + '='.repeat(padLen));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function readAllChunks(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * Gzip-compress + base64url-encode a shareable slice. Uses browser-native
 * CompressionStream so there's no runtime dep — falls back to plain JSON +
 * base64 when the API isn't available (older browsers, some test envs).
 */
export async function encodeShareLink(slice: ShareableSlice): Promise<string> {
  const json = JSON.stringify(slice);
  const bytes = new TextEncoder().encode(json);
  if (typeof CompressionStream === 'undefined') {
    return `1u${toBase64Url(bytes)}`;
  }
  const inputStream = new Response(bytes as BodyInit).body;
  if (!inputStream) throw new Error('share-link: could not open input stream');
  const compressed = await readAllChunks(inputStream.pipeThrough(new CompressionStream('gzip')));
  return `1g${toBase64Url(compressed)}`;
}

export async function decodeShareLink(encoded: string): Promise<ShareableSlice> {
  const trimmed = encoded.replace(/^#/, '').replace(/^doc=/, '');
  if (trimmed.length < 2) throw new Error('share-link: payload too short');
  const version = trimmed.slice(0, 1);
  const kind = trimmed.slice(1, 2);
  if (version !== '1') throw new Error(`share-link: unknown version "${version}"`);
  const body = trimmed.slice(2);
  const bytes = fromBase64Url(body);
  let json: string;
  if (kind === 'u') {
    json = new TextDecoder().decode(bytes);
  } else if (kind === 'g') {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('share-link: gzip payload but this browser has no DecompressionStream');
    }
    const inputStream = new Response(bytes as BodyInit).body;
    if (!inputStream) throw new Error('share-link: could not open input stream');
    const decompressed = await readAllChunks(
      inputStream.pipeThrough(new DecompressionStream('gzip')),
    );
    json = new TextDecoder().decode(decompressed);
  } else {
    throw new Error(`share-link: unknown encoding "${kind}"`);
  }
  const parsed = JSON.parse(json) as ShareableSlice;
  if (parsed.v !== 1) throw new Error(`share-link: unsupported slice version "${parsed.v}"`);
  return parsed;
}

/** Full share URL for the current location + a payload. */
export function buildShareUrl(payload: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#doc=${payload}`;
}
