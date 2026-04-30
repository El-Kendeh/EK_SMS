import { useEffect, useRef, useState } from 'react';
import './QrAttendanceScanner.css';

// Quick-mark attendance via the device camera. Uses the BarcodeDetector API
// when available (Chrome / Edge). Falls back to manual student-number entry
// on Safari/Firefox where BarcodeDetector isn't supported.
//
// Each Student dashboard issues a QR encoding /verify/id-<studentNumber>.
// We extract the student number from the URL path.
export default function QrAttendanceScanner({ students = [], onMarkPresent, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const animRef = useRef(null);
  const [supported, setSupported] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [recent, setRecent] = useState([]);   // recently marked, for the toast strip
  const [manual, setManual] = useState('');

  useEffect(() => {
    try {
      // BarcodeDetector is browser-native in modern Chrome/Edge
      // eslint-disable-next-line no-undef
      const has = typeof BarcodeDetector !== 'undefined';
      setSupported(has);
      // eslint-disable-next-line no-undef
      if (has) detectorRef.current = new BarcodeDetector({ formats: ['qr_code'] });
    } catch { setSupported(false); }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = () => {
    cancelAnimationFrame(animRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) { v.srcObject = stream; await v.play(); }
      setScanning(true);
      tick();
    } catch (e) {
      setError('Camera permission denied or unavailable.');
    }
  };

  const tick = async () => {
    const v = videoRef.current;
    const det = detectorRef.current;
    if (!v || !det || !streamRef.current) return;
    try {
      const found = await det.detect(v);
      if (found && found.length > 0) {
        for (const f of found) handleScanned(f.rawValue);
      }
    } catch {}
    animRef.current = requestAnimationFrame(tick);
  };

  const handleScanned = (raw) => {
    if (!raw) return;
    // Accept any URL containing /verify/id-<number> OR a bare student number
    const m = String(raw).match(/id-([\w-]+)/) || [null, raw];
    const studentNumber = m[1];
    const student = students.find((s) =>
      String(s.studentNumber) === String(studentNumber) ||
      String(s.id) === String(studentNumber) ||
      String(s.student_number) === String(studentNumber)
    );
    if (!student) return;
    if (recent.includes(student.id)) return; // dedupe within this session
    setRecent((cur) => [student.id, ...cur].slice(0, 8));
    onMarkPresent?.(student);
  };

  const submitManual = (e) => {
    e.preventDefault();
    if (!manual.trim()) return;
    handleScanned(manual.trim());
    setManual('');
  };

  return (
    <div className="qrs-overlay" onClick={(e) => { if (e.target === e.currentTarget) { stopCamera(); onClose?.(); } }}>
      <div className="qrs">
        <header>
          <h3><span className="material-symbols-outlined">qr_code_scanner</span> Scan student IDs</h3>
          <button onClick={() => { stopCamera(); onClose?.(); }} aria-label="Close"><span className="material-symbols-outlined">close</span></button>
        </header>

        <div className="qrs__body">
          {supported ? (
            <>
              <div className="qrs__viewport">
                <video ref={videoRef} playsInline muted />
                <div className="qrs__crosshair" />
              </div>
              {!scanning ? (
                <button className="qrs__btn qrs__btn--primary" onClick={startCamera}>
                  <span className="material-symbols-outlined">videocam</span> Start camera
                </button>
              ) : (
                <button className="qrs__btn qrs__btn--ghost" onClick={stopCamera}>Pause</button>
              )}
              {error && <p className="qrs__error">{error}</p>}
            </>
          ) : (
            <p className="qrs__fallback">
              Your browser does not support live QR scanning. Use the manual entry below — type or paste each student number.
            </p>
          )}

          <form className="qrs__manual" onSubmit={submitManual}>
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Manual: type student number"
            />
            <button type="submit" className="qrs__btn qrs__btn--primary">Mark</button>
          </form>

          {recent.length > 0 && (
            <div className="qrs__recent">
              <h4>Marked this session ({recent.length})</h4>
              <ul>
                {recent.map((id) => {
                  const s = students.find((x) => x.id === id);
                  return <li key={id}><span className="material-symbols-outlined">check_circle</span> {s?.fullName || s?.full_name || id}</li>;
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
