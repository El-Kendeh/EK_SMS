import React, { useState, useEffect, useRef } from 'react';
import ApiClient from '../../api/client';
import { BrandColorPicker, LogoUpload } from '../BrandingComponents';
import { useSchoolBranding } from '../../context/SchoolBrandingContext';
import './SchoolAdmin.css'; // defines the .ska-* + palette-* classes this page renders

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/* School Settings — editable school profile + branding for the school admin.
   Backend: GET /api/school/info/ (flat school record) and
   POST /api/school/info/ (multipart; updates phone/address/city/country/
   brand_colors + optional `badge` image). Name/email stay superadmin-managed. */
export default function SchoolSettings() {
  const { setBranding, refresh } = useSchoolBranding();
  const [school, setSchool] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ phone: '', address: '', city: '', country: '', brand_colors: '' });
  const [badgePreview, setBadgePreview] = useState('');
  const [badgeFile, setBadgeFile] = useState(null);
  const badgeRef = useRef(null);

  useEffect(() => {
    ApiClient.get('/api/school/info/')
      .then((d) => {
        setSchool(d);
        setForm({
          phone: d.phone || '', address: d.address || '',
          city: d.city || '', country: d.country || '',
          brand_colors: d.brand_colors || '',
        });
        setBadgePreview(d.badge || '');
      })
      .catch(() => setMsg({ type: 'error', text: 'Could not load school info.' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append('phone', form.phone);
      payload.append('address', form.address);
      payload.append('city', form.city);
      payload.append('country', form.country);
      payload.append('brand_colors', form.brand_colors);
      if (badgeFile) payload.append('badge', badgeFile);

      const res = await ApiClient.post('/api/school/info/', payload);
      if (res?.success === false) throw new Error(res.message || 'Failed to save settings.');
      setMsg({ type: 'ok', text: 'Settings saved.' });
      if (res.school) {
        setSchool((s) => ({ ...s, ...res.school }));
        // Re-theme the dashboard live (badge / colours) without a reload.
        setBranding(res.school);
      }
      refresh();
      setBadgeFile(null);
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Failed to save settings.' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="ska-content">
        <div className="ska-card"><div className="ska-empty"><p className="ska-empty-desc">Loading settings…</p></div></div>
      </div>
    );
  }

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">School Settings</h1>
          <p className="ska-page-sub">Profile, badge and brand colours for your school</p>
        </div>
      </div>

      {msg && (
        <div className="ska-card ska-card-pad" style={{
          marginBottom: 16,
          borderColor: msg.type === 'ok' ? 'var(--ska-green)' : 'var(--ska-error)',
          color: msg.type === 'ok' ? 'var(--ska-green)' : 'var(--ska-error)',
          fontSize: '0.875rem',
        }}>
          {msg.text}
        </div>
      )}

      <div className="ska-split-grid">
        {/* School profile */}
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head" style={{ marginBottom: 20 }}>
            <h2 className="ska-card-title">School Profile</h2>
            <Ic name="business" size="sm" style={{ color: 'var(--ska-primary)' }} />
          </div>
          <div className="ska-form-grid">
            <label className="ska-form-group" style={{ gridColumn: '1/-1' }}>
              <span>School Name <span style={{ color: 'var(--ska-text-3)', fontSize: '0.75rem' }}>(managed by superadmin)</span></span>
              <input className="ska-input" value={school.name || ''} disabled style={{ opacity: 0.55 }} readOnly />
            </label>
            <label className="ska-form-group" style={{ gridColumn: '1/-1' }}>
              <span>School Email <span style={{ color: 'var(--ska-text-3)', fontSize: '0.75rem' }}>(managed by superadmin)</span></span>
              <input className="ska-input" value={school.email || ''} disabled style={{ opacity: 0.55 }} readOnly />
            </label>
            <label className="ska-form-group">
              <span>Phone</span>
              <input className="ska-input" value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>City</span>
              <input className="ska-input" value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </label>
            <label className="ska-form-group" style={{ gridColumn: '1/-1' }}>
              <span>Address</span>
              <input className="ska-input" value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </label>
            <label className="ska-form-group" style={{ gridColumn: '1/-1' }}>
              <span>Country</span>
              <input className="ska-input" value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
            </label>
          </div>
          <button className="ska-btn ska-btn--primary" style={{ marginTop: 8, width: '100%' }}
            onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/* Branding */}
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head" style={{ marginBottom: 20 }}>
            <h2 className="ska-card-title">Branding</h2>
            <Ic name="palette" size="sm" style={{ color: 'var(--ska-secondary)' }} />
          </div>
          <p style={{ margin: '0 0 12px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ska-text-2)' }}>School Badge</p>
          <LogoUpload
            preview={badgePreview}
            inputRef={badgeRef}
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              setBadgeFile(file);
              const reader = new FileReader();
              reader.onload = (re) => setBadgePreview(re.target.result);
              reader.readAsDataURL(file);
            }}
            onRemove={() => { setBadgeFile(null); setBadgePreview(''); }}
          />
          <p style={{ margin: '12px 0 20px', fontSize: '0.75rem', color: 'var(--ska-text-3)', lineHeight: 1.5 }}>
            Shown on report cards, certificates and the dashboard sidebar.
          </p>

          <p style={{ margin: '0 0 12px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ska-text-2)' }}>Brand Colours</p>
          <BrandColorPicker
            value={form.brand_colors ? form.brand_colors.split(',').map((c) => c.trim()).filter(Boolean) : []}
            onChange={(colors) => setForm((f) => ({ ...f, brand_colors: colors.join(',') }))}
          />
          <p style={{ margin: '12px 0 0', fontSize: '0.75rem', color: 'var(--ska-text-3)', lineHeight: 1.5 }}>
            Your official colours theme the dashboard and academic documents.
          </p>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--ska-border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="ska-btn ska-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Update Branding'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
