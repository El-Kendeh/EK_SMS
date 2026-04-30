import React from 'react';
import { EMPLOYMENT_TYPES, ROLE_TIERS, GENDERS, DOCUMENT_TYPES } from './teachers.constants';
import { fmtDate, daysUntil, calcWorkload, avatarInitials } from './teachers.utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const Row = ({ icon, label, value, danger }) => (
  <div className="tea-rev__row">
    <Ic name={icon} size="sm" style={{ color: 'var(--ska-text-3)' }} />
    <span className="tea-rev__label">{label}</span>
    <span className="tea-rev__val" style={danger ? { color: 'var(--ska-error)' } : {}}>{value || '—'}</span>
  </div>
);

export default function ReviewStep({
  school, form, photoPreview, classAssignments, subjects, documents, availability,
}) {
  const fullName = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ') || 'New Teacher';
  const empType  = EMPLOYMENT_TYPES.find(e => e.key === form.employment_type)?.label || form.employment_type;
  const roleTier = ROLE_TIERS.find(r => r.key === form.role_tier)?.label || form.role_tier;
  const gender   = GENDERS.find(g => g.key === form.gender)?.label || '—';
  const initials = avatarInitials(form.first_name, form.last_name);
  const totalP   = calcWorkload(classAssignments, subjects);
  const slotCount = Object.values(availability).reduce((n, row) => n + row.filter(Boolean).length, 0);
  const licDays  = daysUntil(form.license_expiry);
  const subjNames = (form.qualified_subjects || [])
    .map(id => subjects.find(s => s.id === id)?.name).filter(Boolean);

  return (
    <div className="tea-step">
      <p className="tea-step__intro">Review the full record. Use Back to revise any section before creating the account.</p>

      {/* Identity card */}
      <div className="tea-rev__card">
        <div className="tea-rev__hero">
          <div className="tea-rev__avatar">
            {photoPreview ? <img src={photoPreview} alt="" /> : <span>{initials}</span>}
          </div>
          <div className="tea-rev__hero-text">
            <h3>{fullName}</h3>
            <p>{form.qualification || 'Teacher'}</p>
            <div className="tea-rev__hero-pills">
              <span className="tea-pill">{roleTier}</span>
              <span className="tea-pill">{empType}</span>
              {form.is_class_teacher && <span className="tea-pill tea-pill--primary"><Ic name="house" size="sm" /> Homeroom</span>}
            </div>
          </div>
          <div className="tea-rev__hero-id">
            <span>STAFF</span>
            <strong>{form.employee_id || '—'}</strong>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="tea-rev__grid">
        <section className="tea-rev__sec">
          <h4><Ic name="person" size="sm" /> Identity</h4>
          <Row icon="email" label="Email"        value={form.email} />
          <Row icon="call"  label="Phone"        value={form.phone_number} />
          <Row icon="cake"  label="DOB"          value={fmtDate(form.date_of_birth)} />
          <Row icon="person" label="Gender"      value={gender} />
          <Row icon="home"  label="Address"      value={form.address} />
          <Row icon="translate" label="Languages" value={(form.languages || []).join(', ')} />
        </section>

        <section className="tea-rev__sec">
          <h4><Ic name="emergency" size="sm" /> Emergency contact</h4>
          <Row icon="person"   label="Name"     value={form.emergency_contact_name} />
          <Row icon="info"     label="Relation" value={form.emergency_contact_relationship} />
          <Row icon="phone"    label="Phone"    value={form.emergency_contact_phone} />
        </section>

        <section className="tea-rev__sec">
          <h4><Ic name="work" size="sm" /> Employment</h4>
          <Row icon="event_available" label="Hire date"    value={fmtDate(form.hire_date)} />
          <Row icon="badge"           label="Employment"   value={empType} />
          <Row icon="domain"          label="Department"   value={form.department} />
          <Row icon="workspace_premium" label="Role tier"  value={roleTier} />
          <Row icon="house"           label="Homeroom"     value={form.is_class_teacher ? `Yes — class #${form.homeroom_class_id || '?'}` : 'No'} />
        </section>

        <section className="tea-rev__sec">
          <h4><Ic name="school" size="sm" /> Teaching</h4>
          <Row icon="auto_stories" label="Qualification"     value={form.qualification} />
          <Row icon="menu_book"    label="Qualified subjects" value={subjNames.length ? `${subjNames.length} — ${subjNames.slice(0, 3).join(', ')}${subjNames.length > 3 ? ` +${subjNames.length - 3}` : ''}` : '—'} />
          <Row icon="class"        label="Class assignments" value={`${classAssignments.length} assignment${classAssignments.length === 1 ? '' : 's'}`} />
          <Row icon="schedule"     label="Total periods/week" value={`${totalP} of ${form.max_workload || 20}`} danger={totalP > (Number(form.max_workload) || 20)} />
          <Row icon="event_available" label="Availability" value={`${slotCount} of 40 slots`} />
        </section>

        <section className="tea-rev__sec">
          <h4><Ic name="payments" size="sm" /> Payroll &amp; ID</h4>
          <Row icon="badge"           label="NIN"          value={form.nin} />
          <Row icon="health_and_safety" label="NASSIT"     value={form.nassit_number} />
          <Row icon="account_balance" label="Bank"         value={form.bank_name} />
          <Row icon="account_balance_wallet" label="Account" value={form.bank_account_number} />
        </section>

        <section className="tea-rev__sec">
          <h4><Ic name="shield" size="sm" /> Compliance</h4>
          <Row icon="verified"   label="License #"         value={form.license_number} />
          <Row icon="event"      label="License expiry"    value={form.license_expiry ? `${fmtDate(form.license_expiry)}${licDays != null && licDays < 0 ? ' — EXPIRED' : licDays != null && licDays <= 60 ? ` — ${licDays}d left` : ''}` : '—'} danger={licDays != null && licDays < 0} />
          <Row icon="gpp_good"   label="Police clearance"  value={fmtDate(form.police_clearance_date)} />
          <Row icon="psychology" label="Safeguarding"      value={fmtDate(form.safeguarding_training_date)} />
          <Row icon="hourglass_top" label="On probation"   value={form.on_probation ? `Yes — until ${fmtDate(form.probation_end_date)}` : 'No'} />
        </section>

        {documents.length > 0 && (
          <section className="tea-rev__sec tea-rev__sec--full">
            <h4><Ic name="folder" size="sm" /> Documents ({documents.length})</h4>
            <div className="tea-rev__doc-list">
              {documents.map(d => (
                <div key={d.id} className="tea-rev__doc">
                  <Ic name="attach_file" size="sm" />
                  <strong>{d.file.name}</strong>
                  <span>{DOCUMENT_TYPES.find(t => t.key === d.type)?.label || d.type}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
