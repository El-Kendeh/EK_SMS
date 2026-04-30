/**
 * Prints a full A4 enrollment dossier in a new window.
 * Pure utility — no React.
 */

const VACC_LABELS = {
  bcg: 'BCG', opv: 'OPV', pentavalent: 'Pentavalent', pcv: 'PCV',
  rotavirus: 'Rotavirus', measles: 'Measles', yellow_fever: 'Yellow Fever',
  meningitis: 'Meningitis A', covid19: 'COVID-19',
};

const DOC_LABELS = {
  birth_certificate:    'Birth Certificate *',
  passport_photo:       'Passport Photo *',
  previous_report:      'Previous School Report',
  transfer_letter:      'Transfer Letter',
  medical_report:       'Medical Report',
  national_id:          'Parent National ID',
  photo_consent:        'Photo / Media Consent',
  sibling_relationship: 'Sibling Proof',
  other:                'Other',
};

export function printEnrollmentDossier({ form, documents = [], classroomName = '', schoolName = '' }) {
  const fmt = (v) => v ? String(v) : '—';
  const fmtDate = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch { return String(iso); }
  };
  const fmtBool = (v) => v ? 'Yes' : 'No';
  const fullName = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ') || 'Student';

  const row = (label, value) => `<tr><td>${label}</td><td>${value || '—'}</td></tr>`;

  const docRow = (key, label) => {
    const d = documents.find(x => x.type === key);
    const status = d?.file
      ? `Uploaded${d.file.name ? ' — ' + d.file.name : ''}`
      : d?.verified ? `Sighted (${fmt(d.verified_date)})`
      : 'Not provided';
    return row(label, status);
  };

  const vaccRows = Object.entries(VACC_LABELS)
    .map(([k, lbl]) => row(lbl, fmtDate(form.vaccinations?.[k])))
    .join('');

  const docRows = Object.entries(DOC_LABELS).map(([k, lbl]) => docRow(k, lbl)).join('');

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Enrollment Dossier — ${fullName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Georgia,serif;padding:55px 65px;color:#111;font-size:13px;line-height:1.5}
  .hdr{text-align:center;border-bottom:3px double #1B3FAF;padding-bottom:20px;margin-bottom:28px}
  .school{font-size:24px;font-weight:800;color:#1B3FAF;letter-spacing:.02em}
  .doc-title{margin-top:10px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.2em;color:#444}
  .doc-sub{margin-top:4px;font-size:11px;color:#888}
  .sec{margin-bottom:22px}
  .sec-title{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
    color:#1B3FAF;border-bottom:1.5px solid #1B3FAF;padding-bottom:5px;margin-bottom:10px}
  table{width:100%;border-collapse:collapse}
  td{padding:8px 6px;border-bottom:1px solid #eee;font-size:12.5px;vertical-align:top}
  td:first-child{font-weight:600;color:#555;width:220px}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;
    font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
    background:#fee2e2;color:#991b1b}
  .badge-green{background:#dcfce7;color:#166534}
  .footer{margin-top:50px;display:flex;justify-content:space-between;gap:30px}
  .sig{flex:1;border-top:1px solid #333;padding-top:8px;font-size:11px;color:#666;text-align:center}
  .notice{margin-top:30px;padding-top:12px;border-top:1px dashed #ccc;
    font-size:10px;color:#aaa;text-align:center;letter-spacing:.04em}
  @media print{body{padding:35px 45px}}
</style>
</head>
<body>

<div class="hdr">
  <div class="school">${fmt(schoolName)}</div>
  <div class="doc-title">Student Enrollment Dossier</div>
  <div class="doc-sub">Official Admission Record &nbsp;·&nbsp; Printed ${today}</div>
</div>

<div class="sec">
  <div class="sec-title">Personal Information</div>
  <table>
    ${row('Full Name', fullName)}
    ${row('Gender', form.gender)}
    ${row('Date of Birth', fmtDate(form.date_of_birth))}
    ${row('Place of Birth', form.place_of_birth)}
    ${row('Nationality', form.nationality)}
    ${row('Religion', form.religion)}
    ${row('Home Language', form.home_language)}
    ${row('National ID (NIN)', form.nin)}
    ${row('Home Address', [form.home_address, form.city].filter(Boolean).join(', '))}
    ${row('Phone', form.phone_number)}
    ${row('Email', form.email)}
  </table>
</div>

<div class="sec">
  <div class="sec-title">Enrollment</div>
  <table>
    ${row('Admission Number', form.admission_number)}
    ${row('Class / Grade', classroomName)}
    ${row('Enrollment Date', fmtDate(form.enrollment_date))}
    ${row('Student Type', form.student_type)}
    ${row('Fee Category', form.fee_category)}
    ${row('Intake Term', form.intake_term)}
    ${row('Repeating Year', fmtBool(form.is_repeater))}
    ${form.student_type === 'Boarding' ? row('Hostel House', form.hostel_house) : ''}
    ${row('Transport Route', form.transport_route || 'None')}
    ${form.is_transfer ? [
      row('Transfer From', form.previous_school),
      row('Last Class Completed', form.last_class_completed),
      row('Reason for Leaving', form.leaving_reason),
    ].join('') : ''}
  </table>
</div>

<div class="sec">
  <div class="sec-title">Guardian 1 (${fmt(form.father_relationship)})</div>
  <table>
    ${row('Name', form.father_name)}
    ${row('Occupation', form.father_occupation)}
    ${row('Phone', form.father_phone)}
    ${row('Email', form.father_email)}
    ${row('Address', form.father_address)}
  </table>
</div>

${form.guardian2_name ? `
<div class="sec">
  <div class="sec-title">Guardian 2 (${fmt(form.guardian2_relationship)})</div>
  <table>
    ${row('Name', form.guardian2_name)}
    ${row('Occupation', form.guardian2_occupation)}
    ${row('Phone', form.guardian2_phone)}
    ${row('Email', form.guardian2_email)}
  </table>
</div>
` : ''}

<div class="sec">
  <div class="sec-title">Emergency Contact</div>
  <table>
    ${row('Name', form.emergency_name)}
    ${row('Relationship', form.emergency_relationship)}
    ${row('Phone', form.emergency_phone)}
  </table>
</div>

<div class="sec">
  <div class="sec-title">Health Record</div>
  <table>
    ${row('Blood Group', form.blood_group)}
    ${row('Allergies', form.allergies)}
    <tr><td>Medical Conditions</td><td>
      ${form.medical_conditions || '—'}
      ${form.is_critical_medical ? ' <span class="badge">CRITICAL ALERT</span>' : ''}
    </td></tr>
    ${row('Doctor / Clinic', [form.doctor_name, form.doctor_phone].filter(Boolean).join(' · '))}
    ${row('SEN Tier', form.sen_tier || 'Not applicable')}
    ${row('Has IEP', fmtBool(form.sen_iep))}
    ${form.sen_notes ? row('SEN Notes', form.sen_notes) : ''}
    ${row('Disciplinary History', fmtBool(form.disciplinary_history))}
    ${form.disciplinary_notes ? row('Disciplinary Notes', form.disciplinary_notes) : ''}
  </table>
</div>

<div class="sec">
  <div class="sec-title">Vaccination Record</div>
  <table>${vaccRows}</table>
</div>

<div class="sec">
  <div class="sec-title">Documents Checklist</div>
  <table>${docRows}</table>
</div>

<div class="sec">
  <div class="sec-title">Consents &amp; Declarations</div>
  <table>
    <tr><td>Photo / Media Consent</td><td>
      ${form.photo_consent
        ? `<span class="badge badge-green">Granted</span> — ${fmtDate(form.photo_consent_signed_date)}`
        : '<em>Not granted</em>'}
    </td></tr>
    <tr><td>Tax-paying Parent (NRA)</td><td>
      ${form.tax_paying_parent
        ? `<span class="badge badge-green">Signed</span> — ${fmtDate(form.tax_paying_parent_signed_date)}`
        : '<em>Not signed</em>'}
    </td></tr>
  </table>
</div>

<div class="footer">
  <div class="sig">Date</div>
  <div class="sig">Head Teacher</div>
  <div class="sig">Parent / Guardian</div>
</div>

<div class="notice">
  This document is an official record of enrollment at ${fmt(schoolName)}.
  Please retain for your records. Unauthorized alteration is prohibited.
</div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=870,height=1200');
  if (!win) { alert('Pop-up blocked — please allow pop-ups and try again.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}
