import React, { useState, useEffect } from 'react';
import ApiClient from '../api/client';
import ApprovalStatusModal from './ApprovalStatusModal';

/**
 * DashboardGate
 * Higher-order component that checks school approval status before rendering children
 * Shows appropriate modal if school is pending approval or rejected
 */
function DashboardGate({ children }) {
  const [status, setStatus] = useState('loading'); // 'loading', 'approved', 'pending', 'rejected'
  const [statusData, setStatusData] = useState(null);

  useEffect(() => {
    checkApprovalStatus();
  }, []);

  const checkApprovalStatus = async () => {
    try {
      const response = await ApiClient.get('/registration/check-status');
      const { approval_status, school_name, submitted_at, rejection_reason } = response.data;

      setStatusData({
        status: approval_status,
        schoolName: school_name,
        submittedAt: submitted_at,
        rejectionReason: rejection_reason,
      });

      if (approval_status === 'approved') {
        setStatus('approved');
      } else if (approval_status === 'pending') {
        setStatus('pending');
      } else if (approval_status === 'rejected') {
        setStatus('rejected');
      }
    } catch (err) {
      // If endpoint returns 404 or similar, user might not have a school yet
      // Allow dashboard to render anyway (will handle null school gracefully)
      console.error('Failed to check approval status:', err);
      setStatus('approved'); // Default to approved if check fails
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
