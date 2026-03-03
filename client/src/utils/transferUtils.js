export const CHUNK_SIZE = 64 * 1024;
export const BUFFER_LIMIT = 1 * 1024 * 1024;

export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, slice);
  }

  return btoa(binary);
}

export function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

export async function waitForBufferDrain(getBufferedAmount) {
  while (getBufferedAmount() > BUFFER_LIMIT) {
    await new Promise((resolve) => setTimeout(resolve, 12));
  }
}

export async function sendFileInChunks({ file, sendPayload, mode, getBufferedAmount, onProgress }) {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  sendPayload({
    type: 'file-meta',
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    fileSize: file.size,
    totalChunks,
  });

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunkBuffer = await file.slice(start, end).arrayBuffer();

    if (mode === 'webrtc') {
      await waitForBufferDrain(getBufferedAmount);
    }

    sendPayload({
      type: 'file-chunk',
      chunkIndex,
      totalChunks,
      data: arrayBufferToBase64(chunkBuffer),
    });

    onProgress((chunkIndex + 1) / totalChunks);
  }

  sendPayload({ type: 'file-end' });
}

export function triggerDownload(fileName, fileType, chunks) {
  const blob = new Blob(chunks, { type: fileType || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
