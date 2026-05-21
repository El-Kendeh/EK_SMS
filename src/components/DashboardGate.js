import React, { useState, useEffect } from 'react';
import ApiClient from '../api/client';
import ApprovalStatusModal from './ApprovalStatusModal';

/**
 * DashboardGate
 * Higher-order component that checks school approval status before rendering children
 * Shows appropriate modal if school is pending approval or rejected
 */
function DashboardGate({ children }) {
  const [status, setStatus] = useState('loading'); // 'loading', 'approved', 'pending', 'rejected', 'error'
  const [statusData, setStatusData] = useState(null);

  useEffect(() => {
    checkApprovalStatus();
  }, []);

  const checkApprovalStatus = async () => {
    try {
      const response = await ApiClient.get('/api/registration/check-status');
      const {
        status: approvalStatus,
        school_name,
        submitted_at,
        rejection_reason,
        can_access_dashboard,
      } = response;

      setStatusData({
        status: approvalStatus,
        schoolName: school_name,
        submittedAt: submitted_at,
        rejectionReason: rejection_reason,
        canAccessDashboard: can_access_dashboard,
      });

      const canAccess = approvalStatus === 'approved' && (can_access_dashboard ?? true);
      if (canAccess) {
        setStatus('approved');
      } else if (approvalStatus === 'rejected') {
        setStatus('rejected');
      } else {
        setStatus('pending');
      }
    } catch (err) {
      console.error('Failed to check approval status:', err);
      if (err?.status === 401) {
        ApiClient.clearAuth();
        window.location.href = '/login';
        return;
      }

      setStatusData({
        status: 'error',
        schoolName: 'Unable to verify status',
        rejectionReason: err.message || 'Unable to verify approval status. Please try again.',
      });
      setStatus('error');
    }
  };

  const handleLogout = () => {
    ApiClient.clearAuth();
    window.location.href = '/login';
  };

  // Show modal if not approved
  if (status === 'pending' || status === 'rejected') {
    return (
      <ApprovalStatusModal
        status={statusData?.status || status}
        schoolName={statusData?.schoolName || 'Your School'}
        submittedAt={statusData?.submittedAt}
        rejectionReason={statusData?.rejectionReason}
        onLogout={handleLogout}
      />
    );
  }

  if (status === 'error') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1B3FAF 0%, #0f2c7d 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: '40px 32px',
          maxWidth: 540,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ margin: '0 0 16px', fontSize: 26, color: '#111827' }}>Unable to load dashboard</h2>
          <p style={{ margin: '0 0 24px', color: '#4b5563', fontSize: 16, lineHeight: 1.6 }}>
            {statusData?.rejectionReason || 'There was a problem verifying your account approval status.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setStatus('loading'); checkApprovalStatus(); }}
              style={{
                background: '#1B3FAF',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                padding: '12px 20px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
            <button
              onClick={handleLogout}
              style={{
                background: '#f3f4f6',
                color: '#111827',
                border: '1px solid #d1d5db',
                borderRadius: 10,
                padding: '12px 20px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (status === 'loading') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1B3FAF 0%, #0f2c7d 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          textAlign: 'center',
          color: 'white',
        }}>
          <div style={{
            fontSize: 48,
            marginBottom: 16,
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}>
            ⏳
          </div>
          <p style={{ fontSize: 16, fontWeight: 600 }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // User approved - render children (dashboard)
  return <>{children}</>;
}

export default DashboardGate;
