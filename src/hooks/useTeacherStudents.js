import { useState, useEffect, useCallback } from 'react';
import { teacherApi } from '../api/teacherApi';
import { useTeacher } from '../context/TeacherContext';

export function useTeacherStudents() {
  const { assignedClasses } = useTeacher();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStudents = useCallback(async () => {
    if (!assignedClasses || assignedClasses.length === 0) {
      setStudents([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch students per class in parallel
      const results = await Promise.all(
        assignedClasses.map(cls =>
          teacherApi.getClassStudents(cls.id).then(data => {
            const list = data.students || (Array.isArray(data) ? data : []);
            return list.map(s => ({
              id: s.id,
              fullName: s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
              firstName: s.first_name,
              lastName: s.last_name,
              studentNumber: s.admission_number || s.student_id || '',
              email: s.email || '',
              classId: String(cls.id),
              className: cls.name,
              subjectName: cls.subject?.name || '',
            }));
          })
        )
      );
      // Flatten and deduplicate by student id
      const seen = new Set();
      const merged = results.flat().filter(s => {
        if (seen.has(`${s.id}-${s.classId}`)) return false;
        seen.add(`${s.id}-${s.classId}`);
        return true;
      });
      setStudents(merged);
    } catch (err) {
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [assignedClasses]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return { students, loading, error, refetch: fetchStudents };
}
