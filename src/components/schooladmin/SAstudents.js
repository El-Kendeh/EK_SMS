import React, { useState, useEffect, useCallback, useRef } from 'react';
import ApiClient from '../../api/client';

const Ic = ({ name, size, className = '' }) => (
  <span
    className={`ska-icon${size ? ` ska-icon--${size}` : ''} ${className}`}
    aria-hidden="true"
  >
    {name}
  </span>
);

function InitialsAvatar({ name, size = 36, style = {} }) {
  const colors = ['#4d8eff','#4cd7f6','#ffb786','#4ade80','#8b5cf6'];
  const color  = colors[(name?.charCodeAt(0) || 0) % colors.length];
  const initial = name?.trim().charAt(0).toUpperCase() || 'S';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontWeight: 800,
      fontSize: size * 0.38, color: '#fff', flexShrink: 0, ...style,
    }}>
      {initial}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="ska-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ska-modal">
        <div className="ska-modal-head">
          <h2 className="ska-modal-title">{title}</h2>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>
        <div className="ska-modal-body">{children}</div>
      </div>
    </div>
  );
}

export default function StudentsPage({ school, openAddSignal }) {
  const [students,            setStudents]            = useState([]);
  const [loading,             setLoading]             = useState(true);
  const [search,              setSearch]              = useState('');
  const [modal,               setModal]               = useState(null); // null | 'add' | student-object
  const [classes,             setClasses]             = useState([]);
  const [form,                setForm]                = useState({});
  const [saving,              setSaving]              = useState(false);
  const [error,               setError]               = useState('');
  const [viewStudent,         setViewStudent]         = useState(null); // null | student-object (profile view)
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const prevSignal = useRef(openAddSignal);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : '';
      const data   = await ApiClient.get(`/api/school/students/${params}`);
      setStudents(data.students || []);
    } catch {
      setStudents([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    ApiClient.get('/api/school/classes/').then(d => setClasses(d.classes || [])).catch(() => {});
  }, []);

  const openAdd = useCallback(() => {
    setForm({
      first_name: '', last_name: '', gender: '', date_of_birth: '', age: '', place_of_birth: '', nationality: '', religion: '', home_address: '', city: '', phone_number: '', email: '',
      admission_number: '', classroom_id: '', previous_school: '', last_class_completed: '', leaving_reason: '',
      father_name: '', father_occupation: '', father_phone: '', father_email: '', father_address: '', father_username: '', father_password: '',
      mother_name: '', mother_occupation: '', mother_phone: '', mother_email: '', mother_address: '', mother_username: '', mother_password: '',
      emergency_name: '', emergency_relationship: '', emergency_phone: '', emergency_address: '',
      blood_group: '', allergies: '', medical_conditions: '', doctor_name: '', doctor_phone: '',
      disciplinary_history: false, disciplinary_notes: '',
      documents_birth_certificate: false, documents_passport_photo: false, documents_previous_school_report: false,
      documents_transfer_letter: false, documents_medical_report: false, documents_other: false,
      profile_photo: null,
    });
    setProfilePhotoPreview(null);
    setError(''); setModal('add');
  }, []);

  useEffect(() => {
    if (openAddSignal !== prevSignal.current && prevSignal.current !== undefined) {
      openAdd();
    }
    prevSignal.current = openAddSignal;
  }, [openAddSignal, openAdd]);

  const openEdit = s => {
    setForm({
      first_name: s.first_name || '',
      last_name: s.last_name || '',
      gender: s.gender || '',
      date_of_birth: s.date_of_birth || '',
      age: s.age || '',
      place_of_birth: s.place_of_birth || '',
      nationality: s.nationality || '',
      religion: s.religion || '',
      home_address: s.home_address || '',
      city: s.city || '',
      phone_number: s.phone_number || '',
      email: s.email || '',
      admission_number: s.admission_number || '',
      classroom_id: s.classroom_id || '',
      previous_school: s.previous_school || '',
      last_class_completed: s.last_class_completed || '',
      leaving_reason: s.leaving_reason || '',
      father_name: s.father_name || '',
      father_occupation: s.father_occupation || '',
      father_phone: s.father_phone || '',
      father_email: s.father_email || '',
      father_address: s.father_address || '',
      father_username: s.father_username || '',
      father_password: '',
      mother_name: s.mother_name || '',
      mother_occupation: s.mother_occupation || '',
      mother_phone: s.mother_phone || '',
      mother_email: s.mother_email || '',
      mother_address: s.mother_address || '',
      mother_username: s.mother_username || '',
      mother_password: '',
      emergency_name: s.emergency_name || '',
      emergency_relationship: s.emergency_relationship || '',
      emergency_phone: s.emergency_phone || '',
      emergency_address: s.emergency_address || '',
      blood_group: s.blood_group || '',
      allergies: s.allergies || '',
      medical_conditions: s.medical_conditions || '',
      doctor_name: s.doctor_name || '',
      doctor_phone: s.doctor_phone || '',
      disciplinary_history: !!s.disciplinary_history,
      disciplinary_notes: s.disciplinary_notes || '',
      documents_birth_certificate: !!s.documents_birth_certificate,
      documents_passport_photo: !!s.documents_passport_photo,
      documents_previous_school_report: !!s.documents_previous_school_report,
      documents_transfer_letter: !!s.documents_transfer_letter,
      documents_medical_report: !!s.documents_medical_report,
      documents_other: !!s.documents_other,
      profile_photo: null,
    });
    setProfilePhotoPreview(s.profile_photo_url || s.profile_photo || null);
    setError(''); setModal(s);
  };

  const handlePhotoChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setForm(f => ({ ...f, profile_photo: file }));
    setProfilePhotoPreview(prev => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return preview;
    });
  };

  const removePhoto = () => {
    setForm(f => ({ ...f, profile_photo: null }));
    setProfilePhotoPreview(prev => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const buildPayload = data => {
    if (data.profile_photo instanceof File || data.profile_photo instanceof Blob) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (value instanceof File || value instanceof Blob) {
          formData.append(key, value);
        } else if (typeof value === 'boolean') {
          formData.append(key, value ? 'true' : 'false');
        } else {
          formData.append(key, value);
        }
      });
      return formData;
    }
    return data;
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const payload = buildPayload(form);
      if (modal === 'add') {
        await ApiClient.post('/api/school/students/', payload);
      } else {
        await ApiClient.put(`/api/school/students/${modal.id}/`, payload);
      }
      setModal(null); load(search);
    } catch (e) {
      setError(e.message || 'Failed to save.');
    }
    setSaving(false);
  };

  const handleDelete = async id => {
    if (!window.confirm('Remove this student?')) return;
    try {
      await ApiClient.delete(`/api/school/students/${id}/`);
      load(search);
    } catch (e) {
      alert(e.message || 'Failed to remove.');
    }
  };

  const handleSearch = e => {
    const q = e.target.value;
    setSearch(q);
    load(q);
  };

  if (viewStudent) {
    const s = viewStudent;
    const infoRows = [
      { icon: 'badge',          label: 'Admission No.',  value: s.admission_number || '—' },
      { icon: 'class',          label: 'Class',          value: s.classroom || 'Not assigned' },
      { icon: 'cake',           label: 'Date of Birth',  value: s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
      { icon: 'mail',           label: 'Email',          value: s.email || '—' },
      { icon: 'phone',          label: 'Phone',          value: s.phone_number || '—' },
      { icon: 'calendar_today', label: 'Admission Date', value: s.admission_date ? new Date(s.admission_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
    ];

    return (
      <div className="ska-content">
        <div className="ska-page-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="ska-btn ska-btn--ghost" onClick={() => setViewStudent(null)}>
              <Ic name="arrow_back" size="sm" /> Back
            </button>
            <div>
              <h1 className="ska-page-title">Student Profile</h1>
              <p className="ska-page-sub">{school?.name}</p>
            </div>
          </div>
          <button className="ska-btn ska-btn--ghost" onClick={() => { setViewStudent(null); openEdit(s); }}>
            <Ic name="edit" size="sm" /> Edit
          </button>
        </div>

        <div className="ska-card ska-card-pad" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
              background: 'var(--ska-primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '1.75rem', color: 'var(--ska-primary)',
            }}>
              {s.first_name?.[0]?.toUpperCase() || '?'}{s.last_name?.[0]?.toUpperCase() || ''}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--ska-text)' }}>{s.full_name}</h2>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <span className="ska-badge ska-badge--cyan">{s.admission_number}</span>
                <span className="ska-badge ska-badge--green">{s.classroom || 'No class'}</span>
                <span className="ska-badge ska-badge--primary">Active</span>
              </div>
            </div>
          </div>
        </div>

        <div className="ska-profile-info-grid">
          <div className="ska-card ska-card-pad">
            <h2 className="ska-card-title" style={{ marginBottom: 16 }}>Personal Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {infoRows.map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, background: 'var(--ska-primary-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Ic name={row.icon} size="sm" style={{ color: 'var(--ska-primary)' }} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{row.label}</p>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--ska-text)' }}>{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="ska-card ska-card-pad">
              <h2 className="ska-card-title" style={{ marginBottom: 16 }}>Academic Summary</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { icon: 'grade',           label: 'GPA',              value: '—', color: 'var(--ska-primary)' },
                  { icon: 'event_available', label: 'Attendance Rate', value: '—', color: 'var(--ska-green)' },
                  { icon: 'workspace_premium', label: 'Class Rank',     value: '—', color: 'var(--ska-tertiary)' },
                ].map(row => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', borderRadius: 8, background: 'var(--ska-surface-high)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Ic name={row.icon} size="sm" style={{ color: row.color }} />
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ska-text)' }}>{row.label}</span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--ska-text-3)', textAlign: 'center' }}>
                Grades will appear here once entered in Grade Management.
              </p>
            </div>
            <div className="ska-card ska-card-pad">
              <h2 className="ska-card-title" style={{ marginBottom: 12 }}>Quick Actions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="ska-btn ska-btn--ghost" style={{ justifyContent: 'flex-start', gap: 10 }}
                  onClick={() => { setViewStudent(null); openEdit(s); }}>
                  <Ic name="edit" size="sm" /> Edit Student Details
                </button>
                <button className="ska-btn ska-btn--ghost" style={{ justifyContent: 'flex-start', gap: 10 }}
                  onClick={() => setViewStudent(null)}>
                  <Ic name="arrow_back" size="sm" /> Back to Students List
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Students</h1>
          <p className="ska-page-sub">{school?.name} — {students.length} enrolled</p>
        </div>
        <button className="ska-btn ska-btn--primary" onClick={openAdd}>
          <Ic name="person_add" size="sm" /> Add Student
        </button>
      </div>

      <div className="ska-search ska-toolbar-search" style={{ marginBottom: 16 }}>
        <Ic name="search" />
        <input className="ska-search-input" placeholder="Search by name or admission number…"
          value={search} onChange={handleSearch} />
      </div>

      <div className="ska-card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div className="ska-empty"><p className="ska-empty-desc">Loading…</p></div>
        ) : students.length === 0 ? (
          <div className="ska-empty">
            <Ic name="group" size="xl" style={{ color: 'var(--ska-primary)', marginBottom: 12 }} />
            <p className="ska-empty-title">No students yet</p>
            <p className="ska-empty-desc">Add your first student to get started.</p>
          </div>
        ) : (
          <table className="ska-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Admission No.</th>
                <th>Class</th>
                <th>Email</th>
                <th>Phone</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <InitialsAvatar name={s.full_name} size={32} />
                      <span>{s.full_name}</span>
                    </div>
                  </td>
                  <td><span className="ska-badge ska-badge--cyan">{s.admission_number}</span></td>
                  <td>{s.classroom || <span style={{ color: 'var(--ska-text-3)' }}>—</span>}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{s.email || '—'}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{s.phone_number || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => setViewStudent(s)} title="View Profile">
                        <Ic name="person" size="sm" />
                      </button>
                      <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => openEdit(s)}>
                        <Ic name="edit" size="sm" />
                      </button>
                      <button className="ska-btn ska-btn--ghost ska-btn--sm ska-btn--danger" onClick={() => handleDelete(s.id)}>
                        <Ic name="delete" size="sm" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Student' : 'Edit Student'} onClose={() => setModal(null)}>
          {error && <p className="ska-form-error">{error}</p>}

          <div className="ska-card ska-card-pad" style={{ marginBottom: 16 }}>
            <h3 className="ska-card-title" style={{ marginBottom: 12 }}>Profile Photo</h3>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ width: 96, height: 96, borderRadius: 16, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {profilePhotoPreview ? (
                  <img src={profilePhotoPreview} alt="Profile preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Ic name="person" size="xl" style={{ color: 'var(--ska-text-3)' }} />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label className="ska-btn ska-btn--ghost" style={{ width: 'fit-content', cursor: 'pointer' }}>
                  Upload Photo
                  <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                </label>
                {profilePhotoPreview && (
                  <button type="button" className="ska-btn ska-btn--ghost" onClick={removePhoto} style={{ width: 'fit-content' }}>
                    Remove photo
                  </button>
                )}
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>
                  Optional profile photo preview for the student record.
                </p>
              </div>
            </div>
          </div>

          <div className="ska-form-grid">
            <label className="ska-form-group">
              <span>First Name *</span>
              <input className="ska-input" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Last Name *</span>
              <input className="ska-input" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Gender</span>
              <select className="ska-input" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">— Select —</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </label>
            <label className="ska-form-group">
              <span>Date of Birth</span>
              <input className="ska-input" type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Age</span>
              <input className="ska-input" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Place of Birth</span>
              <input className="ska-input" value={form.place_of_birth} onChange={e => setForm(f => ({ ...f, place_of_birth: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Nationality</span>
              <input className="ska-input" value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Religion</span>
              <input className="ska-input" value={form.religion} onChange={e => setForm(f => ({ ...f, religion: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Home Address</span>
              <input className="ska-input" value={form.home_address} onChange={e => setForm(f => ({ ...f, home_address: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>City / Town</span>
              <input className="ska-input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Email Address</span>
              <input className="ska-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Phone Number</span>
              <input className="ska-input" value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Admission Number *</span>
              <input className="ska-input" value={form.admission_number}
                disabled={modal !== 'add'}
                onChange={e => setForm(f => ({ ...f, admission_number: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Class / Grade Applying For</span>
              <select className="ska-input" value={form.classroom_id} onChange={e => setForm(f => ({ ...f, classroom_id: e.target.value }))}>
                <option value="">— No class —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="ska-form-group">
              <span>Previous School Attended</span>
              <input className="ska-input" value={form.previous_school} onChange={e => setForm(f => ({ ...f, previous_school: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Last Class Completed</span>
              <input className="ska-input" value={form.last_class_completed} onChange={e => setForm(f => ({ ...f, last_class_completed: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Reason for Leaving Previous School</span>
              <input className="ska-input" value={form.leaving_reason} onChange={e => setForm(f => ({ ...f, leaving_reason: e.target.value }))} />
            </label>
          </div>

          <div className="ska-card ska-card-pad" style={{ marginTop: 16 }}>
            <h3 className="ska-card-title" style={{ marginBottom: 12 }}>Parent / Guardian Information</h3>
            <div className="ska-form-grid">
              <label className="ska-form-group">
                <span>Father / Guardian Name</span>
                <input className="ska-input" value={form.father_name} onChange={e => setForm(f => ({ ...f, father_name: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Occupation</span>
                <input className="ska-input" value={form.father_occupation} onChange={e => setForm(f => ({ ...f, father_occupation: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Phone Number</span>
                <input className="ska-input" value={form.father_phone} onChange={e => setForm(f => ({ ...f, father_phone: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Email Address</span>
                <input className="ska-input" type="email" value={form.father_email} onChange={e => setForm(f => ({ ...f, father_email: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Address (if different)</span>
                <input className="ska-input" value={form.father_address} onChange={e => setForm(f => ({ ...f, father_address: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Parent Login Username</span>
                <input className="ska-input" value={form.father_username} onChange={e => setForm(f => ({ ...f, father_username: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Parent Login Password</span>
                <input className="ska-input" type="password" value={form.father_password} onChange={e => setForm(f => ({ ...f, father_password: e.target.value }))} />
              </label>

              <label className="ska-form-group">
                <span>Mother / Guardian Name</span>
                <input className="ska-input" value={form.mother_name} onChange={e => setForm(f => ({ ...f, mother_name: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Occupation</span>
                <input className="ska-input" value={form.mother_occupation} onChange={e => setForm(f => ({ ...f, mother_occupation: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Phone Number</span>
                <input className="ska-input" value={form.mother_phone} onChange={e => setForm(f => ({ ...f, mother_phone: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Email Address</span>
                <input className="ska-input" type="email" value={form.mother_email} onChange={e => setForm(f => ({ ...f, mother_email: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Address (if different)</span>
                <input className="ska-input" value={form.mother_address} onChange={e => setForm(f => ({ ...f, mother_address: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Parent Login Username</span>
                <input className="ska-input" value={form.mother_username} onChange={e => setForm(f => ({ ...f, mother_username: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Parent Login Password</span>
                <input className="ska-input" type="password" value={form.mother_password} onChange={e => setForm(f => ({ ...f, mother_password: e.target.value }))} />
              </label>
            </div>
          </div>

          <div className="ska-card ska-card-pad" style={{ marginTop: 16 }}>
            <h3 className="ska-card-title" style={{ marginBottom: 12 }}>Emergency Contact</h3>
            <div className="ska-form-grid">
              <label className="ska-form-group">
                <span>Name</span>
                <input className="ska-input" value={form.emergency_name} onChange={e => setForm(f => ({ ...f, emergency_name: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Relationship</span>
                <input className="ska-input" value={form.emergency_relationship} onChange={e => setForm(f => ({ ...f, emergency_relationship: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Phone Number</span>
                <input className="ska-input" value={form.emergency_phone} onChange={e => setForm(f => ({ ...f, emergency_phone: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Address</span>
                <input className="ska-input" value={form.emergency_address} onChange={e => setForm(f => ({ ...f, emergency_address: e.target.value }))} />
              </label>
            </div>
          </div>

          <div className="ska-card ska-card-pad" style={{ marginTop: 16 }}>
            <h3 className="ska-card-title" style={{ marginBottom: 12 }}>Medical Information</h3>
            <div className="ska-form-grid">
              <label className="ska-form-group">
                <span>Blood Group</span>
                <input className="ska-input" value={form.blood_group} onChange={e => setForm(f => ({ ...f, blood_group: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Known Allergies</span>
                <input className="ska-input" value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Medical Conditions</span>
                <input className="ska-input" value={form.medical_conditions} onChange={e => setForm(f => ({ ...f, medical_conditions: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Doctor's Name</span>
                <input className="ska-input" value={form.doctor_name} onChange={e => setForm(f => ({ ...f, doctor_name: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Doctor's Phone</span>
                <input className="ska-input" value={form.doctor_phone} onChange={e => setForm(f => ({ ...f, doctor_phone: e.target.value }))} />
              </label>
            </div>
          </div>

          <div className="ska-card ska-card-pad" style={{ marginTop: 16 }}>
            <h3 className="ska-card-title" style={{ marginBottom: 12 }}>Student Conduct & Discipline</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <label className="ska-form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={form.disciplinary_history} onChange={e => setForm(f => ({ ...f, disciplinary_history: e.target.checked }))} />
                <span>Has the student ever been suspended/expelled?</span>
              </label>
              <label className="ska-form-group">
                <span>If yes, explain</span>
                <input className="ska-input" value={form.disciplinary_notes} onChange={e => setForm(f => ({ ...f, disciplinary_notes: e.target.value }))} />
              </label>
            </div>
          </div>

          <div className="ska-card ska-card-pad" style={{ marginTop: 16 }}>
            <h3 className="ska-card-title" style={{ marginBottom: 12 }}>Documents Submitted</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                ['documents_birth_certificate', 'Birth Certificate'],
                ['documents_passport_photo', 'Passport Photograph'],
                ['documents_previous_school_report', 'Previous School Report'],
                ['documents_transfer_letter', 'Transfer Letter'],
                ['documents_medical_report', 'Medical Report'],
                ['documents_other', 'Others'],
              ].map(([key, label]) => (
                <label key={key} className="ska-form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="ska-modal-actions">
            <button className="ska-btn ska-btn--ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="ska-btn ska-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : modal === 'add' ? 'Add Student' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
