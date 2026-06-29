import JSZip from 'jszip';
import type { EmittedFile } from '@/codegen';

/**
 * Build a zip from the emitted file-set and trigger a browser download.
 * Only files that differ from their original (or are new) are included —
 * dropping zero-change emit into a real project should produce no work.
 */
export async function downloadProjectZip(files: EmittedFile[], archiveName: string): Promise<void> {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.path, file.emitted);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(blob, `${archiveName}.zip`);
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
