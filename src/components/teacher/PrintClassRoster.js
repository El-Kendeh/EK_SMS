import { useEffect, useState } from 'react';
import { teacherApi } from '../../api/teacherApi';
import { useTeacher } from '../../context/TeacherContext';
import QRCode from '../common/QRCode';
import { Skeleton } from '../common/Skeleton';
import './PrintClassRoster.css';

// One-page A4 class roster — names, photo placeholder, parent contact, allergies,
// pickup-list QRs. Carry it on field trips.
export default function PrintClassRoster() {
  const { selectedClass } = useTeacher();
  const [students, setStudents] = useState(null);

  useEffect(() => {
    if (!selectedClass?.id) return;
    teacherApi.getClassStudents(selectedClass.id).then((data) => {
      const list = Array.isArray(data) ? data : (data?.students || []);
      setStudents(list);
    }).catch(() => setStudents([]));
  }, [selectedClass?.id]);

  if (!selectedClass) return <div className="pcr"><p className="pcr__empty">Select a class first.</p></div>;
  if (!students) return <div className="pcr"><Skeleton height={420} radius={12} /></div>;

  const issued = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="pcr">
      <div className="pcr__toolbar no-print">
        <div>
          <h2>Class roster (printable)</h2>
          <p>A4 page. Use your browser to print or save as PDF for field-trip carry.</p>
        </div>
        <button onClick={() => window.print()}>
          <span className="material-symbols-outlined">print</span> Print / save PDF
        </button>
      </div>

      <article className="pcr__page">
        <header className="pcr__head">
          <div>
            <h1>El-Kendeh Smart School</h1>
            <p>{selectedClass.name} · class roster · issued {issued}</p>
          </div>
          <QRCode value={`${window.location.origin}/verify/roster-${encodeURIComponent(selectedClass.id)}`} size={70} />
        </header>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Student #</th>
              <th>Parent contact</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id}>
                <td>{i + 1}</td>
                <td>{s.fullName || s.full_name || `${s.first_name || ''} ${s.last_name || ''}`}</td>
                <td>{s.studentNumber || s.student_number || '—'}</td>
                <td>{s.guardianPhone || s.guardian_phone || s.parent_phone || '—'}</td>
                <td>{s.allergies || s.medicalNotes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="pcr__foot">
          <span>Carry this page on trips. In an emergency, contact the school office and quote the class code: {selectedClass.id}.</span>
        </footer>
      </article>
    </div>
  );
}
