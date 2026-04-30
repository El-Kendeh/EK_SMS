import React, { useEffect, useRef, useState } from 'react';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Drag-and-drop photo upload with live zoom + drag-to-position preview.
 * Crop is captured in `cropConfig` and applied at submit time via cropImage().
 */
export default function PhotoUploadZone({ file, preview, onFile, cropConfig, onCropChange }) {
  const inputRef = useRef(null);
  const dragRef  = useRef(null);
  const [hover,    setHover]    = useState(false);
  const [drag,     setDrag]     = useState(false);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  /* ── File picker ───────────────────────────────────────────── */
  const accept = (f) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { alert('Photo must be under 5 MB.'); return; }
    if (!/^image\//.test(f.type))  { alert('Choose an image file.'); return; }
    onFile(f);
  };

  /* ── Drag-and-drop hooks (file drop) ───────────────────────── */
  const onDragOver = (e) => { e.preventDefault(); setDrag(true); };
  const onDragLeave = () => setDrag(false);
  const onDrop      = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) accept(f);
  };

  /* ── Pan inside the preview (drag-to-position) ─────────────── */
  const startPan = (e) => {
    if (!preview) return;
    setDragging(true);
    startRef.current = {
      x: e.clientX, y: e.clientY,
      ox: cropConfig?.offsetX || 0,
      oy: cropConfig?.offsetY || 0,
    };
  };
  useEffect(() => {
    if (!dragging) return;
    const move = (e) => {
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      onCropChange({ ...cropConfig, offsetX: startRef.current.ox + dx, offsetY: startRef.current.oy + dy });
    };
    const up = () => setDragging(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [dragging, cropConfig, onCropChange]);

  const zoom = cropConfig?.zoom || 1;
  const cropStyle = preview ? {
    transform: `translate(${cropConfig?.offsetX || 0}px, ${cropConfig?.offsetY || 0}px) scale(${zoom})`,
  } : {};

  return (
    <div className="tea-photo-zone">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={e => accept(e.target.files?.[0])}
      />
      <div
        ref={dragRef}
        className={`tea-photo-frame ${drag ? 'is-drag' : ''} ${preview ? 'has-preview' : ''}`}
        onClick={() => !preview && inputRef.current?.click()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onMouseDown={startPan}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {preview ? (
          <>
            <img src={preview} alt="" className="tea-photo-img" style={cropStyle} draggable={false} />
            <div className={`tea-photo-overlay ${hover ? 'is-on' : ''}`}>
              <Ic name="open_with" size="sm" /> drag to position
            </div>
          </>
        ) : (
          <div className="tea-photo-empty">
            <Ic name="cloud_upload" />
            <strong>{drag ? 'Drop photo here' : 'Drop or click to upload'}</strong>
            <small>JPG / PNG / WebP · max 5 MB</small>
          </div>
        )}
      </div>

      <div className="tea-photo-meta">
        <strong>{preview ? (file?.name || 'Cropped photo') : 'Profile photo'}</strong>
        <small>{preview ? `${((file?.size || 0) / 1024).toFixed(1)} KB` : 'Optional, recommended'}</small>
      </div>

      {preview && (
        <div className="tea-photo-controls">
          <label>
            <Ic name="zoom_in" size="sm" />
            <input
              type="range"
              min="1" max="3" step="0.05"
              value={zoom}
              onChange={e => onCropChange({ ...cropConfig, zoom: Number(e.target.value) })}
            />
            <span>{zoom.toFixed(2)}×</span>
          </label>
          <div className="tea-photo-actions">
            <button type="button" className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => inputRef.current?.click()}>
              <Ic name="autorenew" size="sm" /> Replace
            </button>
            <button type="button" className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => onCropChange({ zoom: 1, offsetX: 0, offsetY: 0 })}>
              <Ic name="restart_alt" size="sm" /> Reset
            </button>
            <button type="button" className="ska-btn ska-btn--danger ska-btn--sm" onClick={() => onFile(null)}>
              <Ic name="delete" size="sm" /> Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
