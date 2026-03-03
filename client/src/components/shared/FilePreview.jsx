import { useEffect, useMemo } from 'react';

function FilePreview({ items }) {
  const prepared = useMemo(() => {
    return items.map((item) => {
      if (item.kind === 'file') {
        return { ...item, url: null };
      }

      return {
        ...item,
        url: URL.createObjectURL(item.file),
      };
    });
  }, [items]);

  useEffect(() => {
    return () => {
      prepared.forEach((item) => {
        if (item.url) {
          URL.revokeObjectURL(item.url);
        }
      });
    };
  }, [prepared]);

  if (!prepared.length) {
    return <div className="small muted">Nenhum arquivo selecionado.</div>;
  }

  return (
    <div className="preview-grid">
      {prepared.map((item) => (
        <div className="preview-card" key={item.id}>
          {item.kind === 'image' && <img src={item.url} alt={item.file.name} />}
          {item.kind === 'video' && <video src={item.url} muted playsInline preload="metadata" />}
          {item.kind === 'file' && <span>{item.file.name}</span>}
        </div>
      ))}
    </div>
  );
}

export default FilePreview;
