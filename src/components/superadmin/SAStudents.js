import React, { useState, useEffect, useCallback } from 'react';
import './SAStudents.css';

/* ---- API base ---- */
const NODE_URL = (
  process.env.REACT_APP_NODE_API_URL ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:5000'
).replace(/\/$/, '');

function getToken() {
  try { return localStorage.getItem('token') || ''; } catch { return ''; }
}

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
}

/* ---- API helpers ---- */
async function apiGet(path) {
  const res = await fetch(`${NODE_URL}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}


async function apiPatch(path, body) {
  const res = await fetch(`${NODE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiDelete(path) {
  const res = await fetch(`${NODE_URL}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiMultipart(path, method, formData) {
  const res = await fetch(`${NODE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ---- Utility ---- */
function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return '—'; }
}

/* ============================================================
   Inline SVG Icons
   ============================================================ */
const IcPlus = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IcEdit = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IcTrash = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);
const IcCheck = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IcX = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IcSpinner = () => (
  <svg className="sard-spin" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
    <path d="M12 2a10 10 0 010 20" />
  </svg>
);
const IcWarn = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" />
  </svg>
);
const IcToggleOn = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="5" width="22" height="14" rx="7" />
    <circle cx="16" cy="12" r="3" fill="currentColor" />
  </svg>
);
const IcToggleOff = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="5" width="22" height="14" rx="7" />
    <circle cx="8" cy="12" r="3" fill="currentColor" />
  </svg>
);
const IcShield = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IcShieldOff = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);
const IcUser = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

/* ============================================================
   Drawer tabs definition
   ============================================================ */
const TABS = [
  { id: 'account',    label: 'Account' },
  { id: 'academic',   label: 'Academic' },
  { id: 'personal',   label: 'Personal' },
  { id: 'parents',    label: 'Parents' },
  { id: 'emergency',  label: 'Emergency' },
  { id: 'medical',    label: 'Medical' },
  { id: 'documents',  label: 'Documents' },
];

/* ============================================================
   Empty form factory
   ============================================================ */
function emptyStudentForm() {
  return {
    first_name: '', last_name: '', email: '', username: '', password: '', school_id: '',
    admission_number: '', admission_date: '', student_type: '', fee_category: '', classroom_id: '', academic_year_id: '',
    date_of_birth: '', gender: '', phone_number: '', place_of_birth: '', nationality: '', religion: '',
    home_language: '', home_address: '', city: '',
    father_name: '', father_phone: '', father_email: '', father_occupation: '', father_address: '', father_whatsapp: false,
    mother_name: '', mother_phone: '', mother_email: '', mother_occupation: '', mother_address: '',
    mother_whatsapp: false, mother_relationship: '',
    emergency_name: '', emergency_relationship: '', emergency_phone: '', emergency_address: '',
    blood_type: '', allergies: '', medical_notes: '', doctor_name: '', doctor_phone: '',
    is_critical_medical: false, sen_tier: '', sen_notes: '', sen_iep: false,
    disciplinary_history: false, disciplinary_notes: '',
    documents_birth_certificate: false, documents_passport_photo: false,
    documents_previous_school_report: false, documents_transfer_letter: false,
    documents_medical_report: false, documents_other: false,
    vaccinations: '',
  };
}

/* ============================================================
   SAStudents — default export
   ============================================================ */
export default function SAStudents() {
  /* School admins are locked to their own school: the school selector is
     hidden, the form is pre-filled, and the backend enforces the same. */
  const currentUser  = getCurrentUser();
  const isSchoolAdmin = currentUser?.role === 'school_admin';
  const ownSchoolId   = currentUser?.school_id != null ? String(currentUser.school_id) : '';

  const [students,    setStudents]    = useState([]);
  const [schools,     setSchools]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadErr,     setLoadErr]     = useState('');
  const [search,      setSearch]      = useState('');
  const [actionErr,   setActionErr]   = useState('');

  /* Drawer state */
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [editId,      setEditId]      = useState(null);
  const [activeTab,   setActiveTab]   = useState('account');
  const [formData,    setFormData]    = useState(emptyStudentForm());
  const [photoFile,   setPhotoFile]   = useState(null);
  const [photoPreview,setPhotoPreview]= useState(null);
  const [saveErr,     setSaveErr]     = useState('');
  const [saving,      setSaving]      = useState(false);
  const [savedCreds,  setSavedCreds]  = useState(null);

  /* Delete confirm */
  const [deleteId,    setDeleteId]    = useState(null);

  /* ---- Load data ---- */
  const loadStudents = useCallback(async () => {
    setLoading(true);
    setLoadErr('');
    try {
      const d = await apiGet('/api/students/');
      if (d.success) setStudents(d.students || []);
      else setLoadErr(d.message || 'Failed to load students.');
    } catch (e) {
      setLoadErr(e.message || 'Could not reach server.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSchools = useCallback(async () => {
    if (isSchoolAdmin) return; // /api/schools/ is superadmin-only; not needed when locked to own school
    try {
      const d = await apiGet('/api/schools/');
      if (d.success) setSchools(d.schools || []);
    } catch { /* silently ignore */ }
  }, [isSchoolAdmin]);

  useEffect(() => {
    loadStudents();
    loadSchools();
  }, [loadStudents, loadSchools]);

  /* ---- Escape key closes drawer ---- */
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [drawerOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Drawer helpers ---- */
  function openCreate() {
    setDrawerOpen(true);
    setEditId(null);
    setActiveTab('account');
    setFormData({ ...emptyStudentForm(), school_id: isSchoolAdmin ? ownSchoolId : '' });
    setPhotoFile(null);
    setPhotoPreview(null);
    setSaveErr('');
    setSavedCreds(null);
  }

  function openEdit(s) {
    setDrawerOpen(true);
    setEditId(s.id);
    setActiveTab('account');
    setSaveErr('');
    setSavedCreds(null);
    setPhotoFile(null);
    setPhotoPreview(s.passport_picture || null);
    setFormData({
      first_name:      s.first_name      || '',
      last_name:       s.last_name       || '',
      email:           s.email           || '',
      username:        s.username        || '',
      password:        '',
      school_id:       s.school_id       != null ? String(s.school_id) : '',
      admission_number:s.admission_number|| '',
      admission_date:  s.admission_date  || '',
      student_type:    s.student_type    || '',
      fee_category:    s.fee_category    || '',
      classroom_id:    s.classroom_id    != null ? String(s.classroom_id) : '',
      academic_year_id:s.academic_year_id!= null ? String(s.academic_year_id) : '',
      date_of_birth:   s.date_of_birth   || '',
      gender:          s.gender          || '',
      phone_number:    s.phone_number    || '',
      place_of_birth:  s.place_of_birth  || '',
      nationality:     s.nationality     || '',
      religion:        s.religion        || '',
      home_language:   s.home_language   || '',
      home_address:    s.home_address    || '',
      city:            s.city            || '',
      father_name:     s.father_name     || '',
      father_phone:    s.father_phone    || '',
      father_email:    s.father_email    || '',
      father_occupation:s.father_occupation||'',
      father_address:  s.father_address  || '',
      father_whatsapp: !!s.father_whatsapp,
      mother_name:     s.mother_name     || '',
      mother_phone:    s.mother_phone    || '',
      mother_email:    s.mother_email    || '',
      mother_occupation:s.mother_occupation||'',
      mother_address:  s.mother_address  || '',
      mother_whatsapp: !!s.mother_whatsapp,
      mother_relationship:s.mother_relationship||'',
      emergency_name:  s.emergency_name  || '',
      emergency_relationship:s.emergency_relationship||'',
      emergency_phone: s.emergency_phone || '',
      emergency_address:s.emergency_address||'',
      blood_type:      s.blood_type      || '',
      allergies:       s.allergies       || '',
      medical_notes:   s.medical_notes   || '',
      doctor_name:     s.doctor_name     || '',
      doctor_phone:    s.doctor_phone    || '',
      is_critical_medical:!!s.is_critical_medical,
      sen_tier:        s.sen_tier        || '',
      sen_notes:       s.sen_notes       || '',
      sen_iep:         !!s.sen_iep,
      disciplinary_history:!!s.disciplinary_history,
      disciplinary_notes:s.disciplinary_notes||'',
      documents_birth_certificate:!!s.documents_birth_certificate,
      documents_passport_photo:!!s.documents_passport_photo,
      documents_previous_school_report:!!s.documents_previous_school_report,
      documents_transfer_letter:!!s.documents_transfer_letter,
      documents_medical_report:!!s.documents_medical_report,
      documents_other: !!s.documents_other,
      vaccinations:    s.vaccinations    || '',
    });
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditId(null);
    setSavedCreds(null);
  }

  /* ---- Field change helpers ---- */
  function setField(key, value) {
    setFormData(f => ({ ...f, [key]: value }));
  }

  /* ---- Submit ---- */
  async function handleSubmit() {
    setSaveErr('');
    if (!formData.first_name.trim()) { setSaveErr('First name is required.'); setActiveTab('account'); return; }
    if (!formData.last_name.trim())  { setSaveErr('Last name is required.');  setActiveTab('account'); return; }
    if (!isSchoolAdmin && !formData.school_id) { setSaveErr('Please select a school.'); setActiveTab('account'); return; }

    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => {
      if (typeof v === 'boolean') {
        fd.append(k, v ? 'true' : 'false');
      } else if (typeof v === 'string' && v !== '') {
        fd.append(k, v);
      }
    });
    if (photoFile) fd.append('passport_photo', photoFile);

    setSaving(true);
    try {
      if (editId) {
        const d = await apiMultipart(`/api/students/${editId}/`, 'PUT', fd);
        if (!d.success) { setSaveErr(d.message || 'Update failed.'); return; }
        closeDrawer();
        loadStudents();
      } else {
        const d = await apiMultipart('/api/students/', 'POST', fd);
        if (!d.success) { setSaveErr(d.message || 'Registration failed.'); return; }
        setSavedCreds({
          username: d.username,
          password: d.password,
          parents:  d.parents || [],
        });
        loadStudents();
      }
    } catch (e) {
      setSaveErr(e.message || 'Server error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  /* ---- Toggle active ---- */
  async function handleToggle(s) {
    setActionErr('');
    try {
      const d = await apiPatch(`/api/students/${s.id}/toggle/`, {});
      if (d.success) {
        setStudents(prev => prev.map(x => x.id === s.id ? { ...x, is_active: d.is_active } : x));
      } else {
        setActionErr(d.message || 'Toggle failed.');
      }
    } catch (e) {
      setActionErr(e.message || 'Server error.');
    }
  }

  /* ---- Block ---- */
  async function handleBlock(s) {
    setActionErr('');
    try {
      const d = await apiPatch(`/api/students/${s.id}/block/`, {});
      if (d.success) {
        setStudents(prev => prev.map(x => x.id === s.id ? { ...x, status: d.status } : x));
      } else {
        setActionErr(d.message || 'Block action failed.');
      }
    } catch (e) {
      setActionErr(e.message || 'Server error.');
    }
  }

  /* ---- Delete ---- */
  async function handleDelete(id) {
    setActionErr('');
    try {
      const d = await apiDelete(`/api/students/${id}/`);
      if (d.success) {
        setStudents(prev => prev.filter(x => x.id !== id));
        setDeleteId(null);
      } else {
        setActionErr(d.message || 'Delete failed.');
      }
    } catch (e) {
      setActionErr(e.message || 'Server error.');
    }
  }

  /* ---- Filtered list ---- */
  const filteredStudents = students.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.first_name + ' ' + s.last_name).toLowerCase().includes(q) ||
      (s.admission_number || '').toLowerCase().includes(q)
    );
  });

  /* ============================================================
     Tab content renderer
     ============================================================ */
  function Field({ label, name, type = 'text', required, placeholder, span }) {
    const isTextarea = type === 'textarea';
    return (
      <div className="sast-field" style={span ? { gridColumn: `span ${span}` } : {}}>
        <label className="sast-label">{label}{required && ' *'}</label>
        {isTextarea ? (
          <textarea
            className="sast-textarea"
            value={formData[name]}
            onChange={e => setField(name, e.target.value)}
            placeholder={placeholder || ''}
            rows={3}
          />
        ) : (
          <input
            className={`sast-input${required && !formData[name] && saveErr ? ' sast-input--err' : ''}`}
            type={type}
            value={formData[name]}
            onChange={e => setField(name, e.target.value)}
            placeholder={placeholder || ''}
            autoComplete="off"
          />
        )}
      </div>
    );
  }

  function SelectField({ label, name, options, required }) {
    return (
      <div className="sast-field">
        <label className="sast-label">{label}{required && ' *'}</label>
        <select
          className={`sast-select${required && !formData[name] && saveErr ? ' sast-select--err' : ''}`}
          value={formData[name]}
          onChange={e => setField(name, e.target.value)}
        >
          <option value="">— select —</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  function CheckField({ label, name }) {
    return (
      <label className="sast-check-row">
        <input
          type="checkbox"
          checked={!!formData[name]}
          onChange={e => setField(name, e.target.checked)}
        />
        <span className="sast-check-label">{label}</span>
      </label>
    );
  }

  function renderTabContent() {
    switch (activeTab) {

      case 'account':
        return (
          <div className="sast-section">
            <p className="sast-section-label">Account &amp; School</p>

            {/* Photo */}
            <div className="sast-photo-row">
              {photoPreview
                ? <img src={photoPreview} alt="Preview" className="sast-photo-preview" />
                : <div className="sast-photo-placeholder"><IcUser /></div>
              }
              <div>
                <label className="sast-label" style={{ display: 'block', marginBottom: 6 }}>Passport Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setPhotoFile(file);
                    setPhotoPreview(URL.createObjectURL(file));
                  }}
                  style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)', fontFamily: 'var(--sa-font)' }}
                />
              </div>
            </div>

            <div className="sast-grid-2" style={{ marginBottom: 12 }}>
              <Field label="First Name" name="first_name" required placeholder="Aminata" />
              <Field label="Last Name"  name="last_name"  required placeholder="Koroma" />
              <Field label="Email"      name="email"      type="email" placeholder="student@school.edu.sl" />
              <Field label="Username"   name="username"   placeholder="aminata.koroma" />
            </div>

            <div className="sast-grid-2" style={{ marginBottom: 12 }}>
              <Field label={editId ? 'New Password (leave blank to keep)' : 'Password'} name="password" type="password" placeholder="Auto-generated if blank" />
              {!isSchoolAdmin && (
                <div className="sast-field">
                  <label className="sast-label">School *</label>
                  <select
                    className={`sast-select${saveErr && !formData.school_id ? ' sast-select--err' : ''}`}
                    value={formData.school_id}
                    onChange={e => setField('school_id', e.target.value)}
                  >
                    <option value="">— select school —</option>
                    {schools.map(sc => (
                      <option key={sc.id} value={sc.id}>{sc.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        );

      case 'academic':
        return (
          <div className="sast-section">
            <p className="sast-section-label">Academic Details</p>
            <div className="sast-grid-2" style={{ marginBottom: 12 }}>
              <Field label="Admission Number" name="admission_number" placeholder="ADM/2025/001" />
              <Field label="Admission Date"   name="admission_date"   type="date" />
              <SelectField label="Student Type" name="student_type" options={[
                { value: 'day',       label: 'Day Student' },
                { value: 'boarding',  label: 'Boarding' },
                { value: 'distance',  label: 'Distance Learning' },
              ]} />
              <SelectField label="Fee Category" name="fee_category" options={[
                { value: 'standard',  label: 'Standard' },
                { value: 'subsidised',label: 'Subsidised' },
                { value: 'scholarship',label:'Scholarship' },
                { value: 'staff',     label: 'Staff Dependent' },
              ]} />
              <Field label="Classroom ID"      name="classroom_id"     placeholder="e.g. 12" />
              <Field label="Academic Year ID"  name="academic_year_id" placeholder="e.g. 3" />
            </div>
          </div>
        );

      case 'personal':
        return (
          <div className="sast-section">
            <p className="sast-section-label">Personal Details</p>
            <div className="sast-grid-2" style={{ marginBottom: 12 }}>
              <Field label="Date of Birth"  name="date_of_birth" type="date" />
              <SelectField label="Gender" name="gender" options={[
                { value: 'male',   label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other',  label: 'Other' },
              ]} />
              <Field label="Phone Number"   name="phone_number"  placeholder="+232 XX XXX XXX" />
              <Field label="Place of Birth" name="place_of_birth"placeholder="e.g. Freetown" />
              <Field label="Nationality"    name="nationality"   placeholder="Sierra Leonean" />
              <Field label="Religion"       name="religion"      placeholder="e.g. Christianity" />
              <Field label="Home Language"  name="home_language" placeholder="e.g. Krio" />
              <Field label="City"           name="city"          placeholder="Freetown" />
            </div>
            <div className="sast-field" style={{ marginBottom: 12 }}>
              <label className="sast-label">Home Address</label>
              <textarea
                className="sast-textarea"
                value={formData.home_address}
                onChange={e => setField('home_address', e.target.value)}
                placeholder="Street address…"
                rows={2}
              />
            </div>
          </div>
        );

      case 'parents':
        return (
          <div className="sast-section">
            <p className="sast-section-label">Parent / Guardian Details</p>

            {/* Father */}
            <div className="sast-parent-section">
              <p className="sast-section-label" style={{ marginBottom: 10 }}>Father</p>
              <div className="sast-grid-2" style={{ marginBottom: 8 }}>
                <Field label="Full Name"   name="father_name"       placeholder="Ibrahim Koroma" />
                <Field label="Phone"       name="father_phone"      placeholder="+232 XX XXX XXX" />
                <Field label="Email"       name="father_email"      type="email" placeholder="father@email.com" />
                <Field label="Occupation"  name="father_occupation" placeholder="e.g. Teacher" />
              </div>
              <div className="sast-field" style={{ marginBottom: 8 }}>
                <label className="sast-label">Address</label>
                <textarea
                  className="sast-textarea"
                  value={formData.father_address}
                  onChange={e => setField('father_address', e.target.value)}
                  placeholder="Father's address…"
                  rows={2}
                />
              </div>
              <CheckField label="WhatsApp available on father's phone" name="father_whatsapp" />
            </div>

            {/* Mother */}
            <div className="sast-parent-section">
              <p className="sast-section-label" style={{ marginBottom: 10 }}>Mother / Second Guardian</p>
              <div className="sast-grid-2" style={{ marginBottom: 8 }}>
                <Field label="Full Name"    name="mother_name"         placeholder="Fatmata Koroma" />
                <Field label="Phone"        name="mother_phone"        placeholder="+232 XX XXX XXX" />
                <Field label="Email"        name="mother_email"        type="email" placeholder="mother@email.com" />
                <Field label="Occupation"   name="mother_occupation"   placeholder="e.g. Nurse" />
                <SelectField label="Relationship" name="mother_relationship" options={[
                  { value: 'mother',     label: 'Mother' },
                  { value: 'guardian',   label: 'Legal Guardian' },
                  { value: 'aunt',       label: 'Aunt' },
                  { value: 'uncle',      label: 'Uncle' },
                  { value: 'sibling',    label: 'Sibling' },
                  { value: 'other',      label: 'Other' },
                ]} />
              </div>
              <div className="sast-field" style={{ marginBottom: 8 }}>
                <label className="sast-label">Address</label>
                <textarea
                  className="sast-textarea"
                  value={formData.mother_address}
                  onChange={e => setField('mother_address', e.target.value)}
                  placeholder="Mother/guardian address…"
                  rows={2}
                />
              </div>
              <CheckField label="WhatsApp available on mother/guardian's phone" name="mother_whatsapp" />
            </div>
          </div>
        );

      case 'emergency':
        return (
          <div className="sast-section">
            <p className="sast-section-label">Emergency Contact</p>
            <div className="sast-grid-2" style={{ marginBottom: 12 }}>
              <Field label="Contact Name"      name="emergency_name"         placeholder="Full name" />
              <Field label="Relationship"      name="emergency_relationship" placeholder="e.g. Uncle" />
              <Field label="Phone"             name="emergency_phone"        placeholder="+232 XX XXX XXX" />
            </div>
            <div className="sast-field" style={{ marginBottom: 12 }}>
              <label className="sast-label">Address</label>
              <textarea
                className="sast-textarea"
                value={formData.emergency_address}
                onChange={e => setField('emergency_address', e.target.value)}
                placeholder="Emergency contact address…"
                rows={2}
              />
            </div>
          </div>
        );

      case 'medical':
        return (
          <div className="sast-section">
            <p className="sast-section-label">Medical Information</p>
            <div className="sast-grid-2" style={{ marginBottom: 12 }}>
              <SelectField label="Blood Type" name="blood_type" options={[
                'A+','A-','B+','B-','AB+','AB-','O+','O-'
              ].map(v => ({ value: v, label: v }))} />
              <Field label="Doctor Name"  name="doctor_name"  placeholder="Dr. Sesay" />
              <Field label="Doctor Phone" name="doctor_phone" placeholder="+232 XX XXX XXX" />
            </div>
            <div className="sast-field" style={{ marginBottom: 8 }}>
              <label className="sast-label">Allergies</label>
              <textarea
                className="sast-textarea"
                value={formData.allergies}
                onChange={e => setField('allergies', e.target.value)}
                placeholder="List any known allergies…"
                rows={2}
              />
            </div>
            <div className="sast-field" style={{ marginBottom: 8 }}>
              <label className="sast-label">Medical Notes</label>
              <textarea
                className="sast-textarea"
                value={formData.medical_notes}
                onChange={e => setField('medical_notes', e.target.value)}
                placeholder="Any relevant medical history or conditions…"
                rows={2}
              />
            </div>
            <div className="sast-field" style={{ marginBottom: 8 }}>
              <label className="sast-label">Vaccinations</label>
              <textarea
                className="sast-textarea"
                value={formData.vaccinations}
                onChange={e => setField('vaccinations', e.target.value)}
                placeholder="List vaccinations received…"
                rows={2}
              />
            </div>
            <CheckField label="Critical medical condition — flag for staff awareness" name="is_critical_medical" />

            <p className="sast-section-label" style={{ marginTop: 16 }}>Special Educational Needs (SEN)</p>
            <div className="sast-grid-2" style={{ marginBottom: 8 }}>
              <SelectField label="SEN Tier" name="sen_tier" options={[
                { value: 'tier1', label: 'Tier 1 — Universal' },
                { value: 'tier2', label: 'Tier 2 — Targeted' },
                { value: 'tier3', label: 'Tier 3 — Intensive' },
              ]} />
            </div>
            <div className="sast-field" style={{ marginBottom: 8 }}>
              <label className="sast-label">SEN Notes</label>
              <textarea
                className="sast-textarea"
                value={formData.sen_notes}
                onChange={e => setField('sen_notes', e.target.value)}
                placeholder="Describe support needs…"
                rows={2}
              />
            </div>
            <CheckField label="Has an active Individual Education Plan (IEP)" name="sen_iep" />

            <p className="sast-section-label" style={{ marginTop: 16 }}>Disciplinary</p>
            <CheckField label="Student has prior disciplinary history" name="disciplinary_history" />
            {formData.disciplinary_history && (
              <div className="sast-field" style={{ marginTop: 8 }}>
                <label className="sast-label">Disciplinary Notes</label>
                <textarea
                  className="sast-textarea"
                  value={formData.disciplinary_notes}
                  onChange={e => setField('disciplinary_notes', e.target.value)}
                  placeholder="Brief summary of incidents…"
                  rows={3}
                />
              </div>
            )}
          </div>
        );

      case 'documents':
        return (
          <div className="sast-section">
            <p className="sast-section-label">Document Checklist</p>
            <p className="sast-hint" style={{ marginBottom: 14 }}>
              Check each document that has been received and verified for this student.
            </p>
            {[
              { name: 'documents_birth_certificate',        label: 'Birth Certificate' },
              { name: 'documents_passport_photo',           label: 'Passport Photo' },
              { name: 'documents_previous_school_report',   label: 'Previous School Report' },
              { name: 'documents_transfer_letter',          label: 'Transfer Letter' },
              { name: 'documents_medical_report',           label: 'Medical Report' },
              { name: 'documents_other',                    label: 'Other Documents' },
            ].map(doc => (
              <CheckField key={doc.name} label={doc.label} name={doc.name} />
            ))}
          </div>
        );

      default:
        return null;
    }
  }

  /* ============================================================
     Render
     ============================================================ */
  return (
    <div className="sast-wrap">

      {/* Header */}
      <div className="sast-head">
        <div>
          <h1 className="sast-title">Students</h1>
          <p className="sast-sub">Manage all student accounts across schools.</p>
        </div>
        <button className="sard-btn sard-btn--primary" onClick={openCreate}>
          <IcPlus /> Add Student
        </button>
      </div>

      {/* Action error banner */}
      {actionErr && (
        <div className="sast-err-banner" style={{ marginBottom: 12 }}>
          <IcWarn /><span>{actionErr}</span>
          <button
            onClick={() => setActionErr('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}
          >
            <IcX />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="sast-search-row">
        <input
          className="sast-search"
          placeholder="Search by name or admission no…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table card */}
      <div className="sard-card">
        {loading && (
          <div className="sard-state">
            <IcSpinner />
            <span>Loading students…</span>
          </div>
        )}
        {!loading && loadErr && (
          <div className="sard-state sard-state--err">
            <IcWarn /><span>{loadErr}</span>
          </div>
        )}
        {!loading && !loadErr && filteredStudents.length === 0 && (
          <p className="sard-empty">
            {students.length === 0 ? 'No students yet. Click "Add Student" to register one.' : 'No students match your search.'}
          </p>
        )}
        {!loading && !loadErr && filteredStudents.length > 0 && (
          <div className="sard-table">
            <div className="sard-thead" style={{ '--data-cols': isSchoolAdmin ? 3 : 4 }}>
              <span className="sard-th">NAME</span>
              <span className="sard-th">ADMISSION NO</span>
              <span className="sard-th">STATUS</span>
              {!isSchoolAdmin && <span className="sard-th">SCHOOL</span>}
              <span className="sard-th sard-th--date">ADDED</span>
              <span className="sard-th sard-th--actions">ACTIONS</span>
            </div>
            {filteredStudents.map(s => (
              <div key={s.id} className="sard-tr" style={{ '--data-cols': isSchoolAdmin ? 3 : 4 }}>
                <span className="sard-td">
                  {s.first_name} {s.last_name}
                </span>
                <span className="sard-td">{s.admission_number || '—'}</span>
                <span className="sard-td">
                  <span className={`sast-badge sast-badge--${s.is_active ? 'active' : 'inactive'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {s.status === 'blocked' && (
                    <span className="sast-badge sast-badge--blocked" style={{ marginLeft: 4 }}>Blocked</span>
                  )}
                </span>
                {!isSchoolAdmin && (
                  <span className="sard-td">
                    {schools.find(sc => String(sc.id) === String(s.school_id))?.name || '—'}
                  </span>
                )}
                <span className="sard-td sard-td--date">{fmtDate(s.created_at)}</span>
                <span className="sard-td sard-td--actions">
                  {deleteId === s.id ? (
                    <span className="sast-del-confirm">
                      <span className="sast-del-label">Delete?</span>
                      <button
                        className="sard-icon-btn sard-icon-btn--danger"
                        title="Confirm delete"
                        onClick={() => handleDelete(s.id)}
                      ><IcCheck /></button>
                      <button
                        className="sard-icon-btn"
                        title="Cancel"
                        onClick={() => setDeleteId(null)}
                      ><IcX /></button>
                    </span>
                  ) : (
                    <>
                      <button
                        className="sard-icon-btn"
                        title="Edit student"
                        onClick={() => openEdit(s)}
                      ><IcEdit /></button>
                      <button
                        className={`sard-icon-btn${s.is_active ? ' sard-icon-btn--toggle-on' : ''}`}
                        title={s.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggle(s)}
                      >
                        {s.is_active ? <IcToggleOn /> : <IcToggleOff />}
                      </button>
                      <button
                        className={`sard-icon-btn${s.status === 'blocked' ? '' : ' sard-icon-btn--danger'}`}
                        title={s.status === 'blocked' ? 'Unblock' : 'Block'}
                        onClick={() => handleBlock(s)}
                      >
                        {s.status === 'blocked' ? <IcShieldOff /> : <IcShield />}
                      </button>
                      <button
                        className="sard-icon-btn sard-icon-btn--danger"
                        title="Delete student"
                        onClick={() => setDeleteId(s.id)}
                      ><IcTrash /></button>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="sast-count">
        {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
      </p>

      {/* Drawer overlay */}
      <div
        className={`sast-overlay${drawerOpen ? ' open' : ''}`}
        onClick={closeDrawer}
      />

      {/* Drawer */}
      <div className={`sast-drawer${drawerOpen ? ' open' : ''}`}>
        <div className="sast-drawer-head">
          <h2 className="sast-drawer-title">{editId ? 'Edit Student' : 'Register Student'}</h2>
          <button className="sard-icon-btn" onClick={closeDrawer} aria-label="Close"><IcX /></button>
        </div>

        {savedCreds ? (
          /* ---- Credentials panel ---- */
          <div className="sast-drawer-body" style={{ paddingTop: 20 }}>
            <div className="sast-creds">
              <p className="sast-creds-title">Student Registered — Save Credentials</p>
              <div className="sast-creds-group" style={{ borderTop: 'none', paddingTop: 0 }}>
                <p className="sast-creds-group-title">Student Login</p>
                <div className="sast-creds-row">
                  <span className="sast-creds-key">Username</span>
                  <span className="sast-creds-val">{savedCreds.username || '—'}</span>
                </div>
                <div className="sast-creds-row">
                  <span className="sast-creds-key">Password</span>
                  <span className="sast-creds-val">{savedCreds.password || '—'}</span>
                </div>
              </div>
              {savedCreds.parents && savedCreds.parents.length > 0 && savedCreds.parents.map((p, i) => (
                <div key={i} className="sast-creds-group">
                  <p className="sast-creds-group-title">
                    Parent {savedCreds.parents.length > 1 ? i + 1 : ''} — {p.relationship || 'Guardian'}
                  </p>
                  <div className="sast-creds-row">
                    <span className="sast-creds-key">Username</span>
                    <span className="sast-creds-val">{p.username || '—'}</span>
                  </div>
                  <div className="sast-creds-row">
                    <span className="sast-creds-key">Password</span>
                    <span className="sast-creds-val">{p.password || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="sast-hint" style={{ marginTop: 12 }}>
              These credentials will not be shown again. Make sure to record them before closing.
            </p>
            <div style={{ paddingTop: 16 }}>
              <button
                className="sard-btn sard-btn--primary"
                onClick={() => { setDrawerOpen(false); setSavedCreds(null); }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="sast-tabs">
              {TABS.map(t => (
                <button
                  key={t.id}
                  className={`sast-tab${activeTab === t.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="sast-drawer-body">
              {saveErr && (
                <div className="sast-err-banner">
                  <IcWarn /><span>{saveErr}</span>
                </div>
              )}
              {renderTabContent()}
            </div>

            {/* Footer */}
            <div className="sast-drawer-foot">
              <button
                className="sard-btn sard-btn--ghost"
                onClick={closeDrawer}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className={`sard-btn sard-btn--primary${saving ? ' sard-btn--disabled' : ''}`}
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving
                  ? <><IcSpinner /> Saving…</>
                  : <><IcCheck /> {editId ? 'Update' : 'Register'}</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

