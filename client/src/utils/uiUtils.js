export function parsePeerMessage(raw) {
  if (typeof raw === 'string') {
    return JSON.parse(raw);
  }

  if (raw instanceof ArrayBuffer) {
    return JSON.parse(new TextDecoder().decode(raw));
  }

  if (ArrayBuffer.isView(raw)) {
    return JSON.parse(new TextDecoder().decode(raw));
  }

  return JSON.parse(String(raw));
}

export function toToneClass(tone) {
  if (!tone) return '';
  return tone;
}
