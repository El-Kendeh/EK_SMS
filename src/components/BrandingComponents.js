import React, { useState, useRef, useEffect } from 'react';

/* ================================================================
   SVG Icons
   ================================================================ */
const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 18, height: 18 }}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

/* ================================================================
   Constants (from Register.js)
   ================================================================ */
const PALETTE_ROWS = [
  ['#FFFFFF','#FFF2CC','#FCE4D6','#FDECEA','#EBF4EB','#DEEBF7','#E8EAF6','#F3E5F5','#E0F2F1','#FBE9E7'],
  ['#F2F2F2','#FFE699','#FFCCB3','#FFAAAA','#B8D9A8','#9DC3E6','#9FA8DA','#CE93D8','#80CBC4','#FFAB91'],
  ['#D9D9D9','#FFD966','#FF9966','#FF6666','#70AD47','#5BA4D2','#7986CB','#BA68C8','#26A69A','#FF7043'],
  ['#595959','#FFC000','#FF6600','#FF0000','#375623','#0070C0', '#3F51B5','#9C27B0','#00897B','#E64A19'],
  ['#404040','#806000','#B34700','#CC0000','#1E3A0D','#005A9E','#283593','#6A1B9A','#00695C','#BF360C'],
  ['#000000','#3D2E00','#5C2400','#800000','#0D1F06','#002060','#1A237E','#4A148C','#004D40','#7F1D09'],
];

const STANDARD_COLORS = [
  { hex: '#C00000', name: 'Dark Red'    },
  { hex: '#FF0000', name: 'Red'         },
  { hex: '#FF6600', name: 'Orange'      },
  { hex: '#FFD700', name: 'Gold'        },
  { hex: '#FFFF00', name: 'Yellow'      },
  { hex: '#92D050', name: 'Lime Green'  },
  { hex: '#00B050', name: 'Green'       },
  { hex: '#00B0F0', name: 'Sky Blue'    },
  { hex: '#0070C0', name: 'Blue'        },
  { hex: '#1B3FAF', name: 'Royal Blue'  },
  { hex: '#7030A0', name: 'Purple'      },
  { hex: '#000000', name: 'Black'       },
];

/* ================================================================
   Brand Color Picker
   ================================================================ */
export function BrandColorPicker({ value = [], onChange }) {
  const [colorInput, setColorInput] = useState('');
  const [showPalette, setShowPalette] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!showPalette) return;
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowPalette(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPalette]);

  const toggleColor = (hex) => {
    if (value.includes(hex)) {
      onChange(value.filter((c) => c !== hex));
    } else {
      onChange([...value, hex]);
    }
  };

  const addCustom = () => {
    const trimmed = colorInput.trim();
    if (!trimmed || value.includes(trimmed)) { setColorInput(''); return; }
    onChange([...value, trimmed]);
    setColorInput('');
  };

  const removeColor = (c) => onChange(value.filter((x) => x !== c));

  return (
    <div className="brand-color-picker">
      <div className="color-input-wrapper" ref={wrapperRef}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="ska-input"
            type="text"
            placeholder="#RRGGBB or colour name…"
            value={colorInput}
            onChange={(e) => setColorInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="ska-btn ska-btn--ghost"
            style={{ 
              borderColor: showPalette ? 'var(--ska-primary)' : 'var(--ska-border)',
              background: showPalette ? 'var(--ska-surface-high)' : 'transparent'
            }}
            onClick={() => setShowPalette((v) => !v)}
          >
            Choose
          </button>
        </div>

        {showPalette && (
          <div className="color-palette-popup" style={{
            marginTop: 8, background: 'var(--ska-surface-card)', border: '1px solid var(--ska-border)',
            borderRadius: 12, padding: 16, zIndex: 10
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--ska-text-3)', textTransform: 'uppercase' }}>Pick Colours</span>
              <button type="button" onClick={() => setShowPalette(false)} style={{ background: 'none', border: 'none', color: 'var(--ska-text-3)', cursor: 'pointer', fontSize: 18 }}>&times;</button>
            </div>

            <p className="palette-section-label">Theme Colours</p>
            <div className="palette-grid">
              {PALETTE_ROWS.map((row, ri) => (
                <div key={ri} className="palette-row">
                  {row.map((hex, ci) => (
                    <button
                      key={`${ri}-${ci}`}
                      type="button"
                      className={`palette-swatch${value.includes(hex) ? ' selected' : ''}`}
                      style={{ background: hex }}
                      onClick={() => toggleColor(hex)}
                      title={hex}
                    />
                  ))}
                </div>
              ))}
            </div>

            <p className="palette-section-label" style={{ marginTop: 12 }}>Standard Colours</p>
            <div className="palette-row palette-row--std">
              {STANDARD_COLORS.map(({ hex, name }) => (
                <button
                  key={hex}
                  type="button"
                  className={`palette-swatch palette-swatch--std${value.includes(hex) ? ' selected' : ''}`}
                  style={{ background: hex }}
                  onClick={() => toggleColor(hex)}
                  title={name}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {value.map((c) => (
            <div key={c} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
              background: 'var(--ska-surface-high)', border: '1px solid var(--ska-border)',
              borderRadius: 6, fontSize: '0.75rem', color: 'var(--ska-text-2)'
            }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
              <span>{c}</span>
              <button type="button" onClick={() => removeColor(c)} style={{ background: 'none', border: 'none', color: 'var(--ska-text-3)', cursor: 'pointer', fontSize: 14 }}>&times;</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Logo / Badge Upload
   ================================================================ */
export function LogoUpload({ preview, inputRef, onChange, onRemove }) {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragActive(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onChange({ target: { files: [file] } });
  };

  return (
    <div className="logo-upload">
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg"
        style={{ display: 'none' }}
        onChange={onChange}
      />
      {preview ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, background: 'var(--ska-surface-low)', border: '1px solid var(--ska-border)', borderRadius: 12 }}>
          <img src={preview} alt="Badge" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'contain', background: '#fff', padding: 4 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ska-green)' }}>Badge uploaded</p>
            <button type="button" className="ska-btn ska-btn--ghost ska-btn--sm" style={{ marginTop: 6, color: 'var(--ska-error)' }} onClick={onRemove}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`logo-dropzone${isDragActive ? ' active' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            cursor: 'pointer', textAlign: 'center', padding: '24px 16px',
            border: `2px dashed ${isDragActive ? 'var(--ska-primary)' : 'var(--ska-border)'}`,
            borderRadius: 12, background: isDragActive ? 'var(--ska-primary-dim)' : 'var(--ska-surface-low)',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ color: 'var(--ska-text-3)', marginBottom: 8 }}><UploadIcon /></div>
          <p style={{ margin: '0 0 4px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ska-text)' }}>
            {isDragActive ? 'Drop to upload' : 'Upload School Badge'}
          </p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>PNG or JPG · Max 5 MB</p>
        </div>
      )}
    </div>
  );
}
