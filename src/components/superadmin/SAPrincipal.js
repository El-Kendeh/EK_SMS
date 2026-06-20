import React from 'react';
import SAStaffManager from './SAStaffManager';

/* Principal management — powered by the shared staff manager:
   sectioned add/edit form, school selector for superadmin, working search
   and status filters, and a one-time credentials modal after creation. */
export default function SAPrincipal() {
  return <SAStaffManager kind="principal" />;
}
