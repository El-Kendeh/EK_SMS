import React, { useState, useRef, useEffect } from 'react';
import './Register.css';
import ApiClient from '../api/client';
import PruhLogo from './PruhLogo';

/* ================================================================
   SVG Icons
   ================================================================ */
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ArrowLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
);
const SparkleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2 L13.5 9.5 L21 11 L13.5 12.5 L12 20 L10.5 12.5 L3 11 L10.5 9.5 Z" />
    <path d="M19 2 L19.8 5.2 L23 6 L19.8 6.8 L19 10 L18.2 6.8 L15 6 L18.2 5.2 Z" opacity="0.7" />
    <path d="M5 16 L5.6 18.4 L8 19 L5.6 19.6 L5 22 L4.4 19.6 L2 19 L4.4 18.4 Z" opacity="0.6" />
  </svg>
);
const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const WarnIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
const LocationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
const ContactIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.63a16 16 0 006.29 6.29l1.15-1.15a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);
const AdminIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41" />
  </svg>
);
const ReviewIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 15, height: 15 }}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
/* Field-specific icons */
const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
  </svg>
);
const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l10 7 10-7" />
  </svg>
);
const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const HashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);
const LegalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

/* ================================================================
   Constants
   ================================================================ */
const DEFAULT_FORM = {
  institutionName: '', institutionType: '', established: '', motto: '',
  registrationNumber: '', estimatedTeachers: '', brandColors: [],
  address: '', city: '', region: '', country: '',
  phoneCode: '+232', phoneNumber: '', email: '', website: '',
  firstName: '', lastName: '', adminUsername: '', adminEmail: '',
  adminPhoneCode: '+232', adminPhoneNumber: '', password: '', confirmPassword: '',
  enable2FA: true, capacity: '1000', academicSystem: 'trimester',
  gradingSystem: 'percentage', language: 'English',
  agreementAccuracy: false, agreementDataProtection: false, agreementAuthorized: false,
};

const STEPS = [
  { key: 'info',     label: 'Info' },
  { key: 'location', label: 'Location' },
  { key: 'contact',  label: 'Contact' },
  { key: 'admin',    label: 'Admin' },
  { key: 'settings', label: 'Settings' },
  { key: 'legal',    label: 'Legal' },
  { key: 'verify',   label: 'Verify' },
  { key: 'review',   label: 'Review' },
];

const INSTITUTION_TYPES = [
  'Primary School',
  'Secondary School / High School',
  'Primary / Secondary School',
  'International School',
];

const ACADEMIC_SYSTEMS = [
  { value: 'semester',  label: 'Semester System (2 terms)' },
  { value: 'trimester', label: 'Trimester System (3 terms)' },
  { value: 'quarter',   label: 'Quarter System (4 terms)' },
  { value: 'annual',    label: 'Annual System (1 term)' },
];

const GRADING_SYSTEMS = [
  { value: 'percentage', label: 'Percentage (0–100%)' },
  { value: 'letter',     label: 'Letter Grades (A–F)' },
  { value: 'gpa',        label: 'GPA Scale (0–4.0)' },
  { value: 'custom',     label: 'Custom System' },
];

const LANGUAGES = [
  'English', 'French', 'Arabic', 'Spanish', 'Portuguese',
  'Swahili', 'Hausa', 'Mandarin', 'Hindi', 'Other',
];

const COUNTRIES = [
  /* Primary market — listed first */
  'Sierra Leone',
  /* Rest of Africa — alphabetical */
  'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi',
  'Cameroon', 'Cape Verde', 'Central African Republic', 'Chad', 'Comoros',
  'Congo (Brazzaville)', 'Congo (DRC)', "Côte d'Ivoire", 'Djibouti',
  'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia',
  'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau',
  'Kenya', 'Lesotho', 'Liberia', 'Libya',
  'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco',
  'Mozambique', 'Namibia', 'Niger', 'Nigeria',
  'Rwanda', 'São Tomé & Príncipe', 'Senegal', 'Seychelles', 'Somalia',
  'South Africa', 'South Sudan', 'Sudan',
  'Tanzania', 'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe',
  'Other',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1799 }, (_, i) => CURRENT_YEAR - i);

/* Timezone → Country — used for auto-detecting the user's country */
const TIMEZONE_TO_COUNTRY = {
  'Africa/Abidjan':       "Côte d'Ivoire",
  'Africa/Accra':         'Ghana',
  'Africa/Addis_Ababa':   'Ethiopia',
  'Africa/Algiers':       'Algeria',
  'Africa/Asmara':        'Eritrea',
  'Africa/Bamako':        'Mali',
  'Africa/Bangui':        'Central African Republic',
  'Africa/Banjul':        'Gambia',
  'Africa/Bissau':        'Guinea-Bissau',
  'Africa/Blantyre':      'Malawi',
  'Africa/Brazzaville':   'Congo (Brazzaville)',
  'Africa/Bujumbura':     'Burundi',
  'Africa/Cairo':         'Egypt',
  'Africa/Casablanca':    'Morocco',
  'Africa/Conakry':       'Guinea',
  'Africa/Dakar':         'Senegal',
  'Africa/Dar_es_Salaam': 'Tanzania',
  'Africa/Djibouti':      'Djibouti',
  'Africa/Douala':        'Cameroon',
  'Africa/Freetown':      'Sierra Leone',
  'Africa/Gaborone':      'Botswana',
  'Africa/Harare':        'Zimbabwe',
  'Africa/Johannesburg':  'South Africa',
  'Africa/Juba':          'South Sudan',
  'Africa/Kampala':       'Uganda',
  'Africa/Khartoum':      'Sudan',
  'Africa/Kigali':        'Rwanda',
  'Africa/Kinshasa':      'Congo (DRC)',
  'Africa/Lagos':         'Nigeria',
  'Africa/Libreville':    'Gabon',
  'Africa/Lome':          'Togo',
  'Africa/Luanda':        'Angola',
  'Africa/Lubumbashi':    'Congo (DRC)',
  'Africa/Lusaka':        'Zambia',
  'Africa/Malabo':        'Equatorial Guinea',
  'Africa/Maputo':        'Mozambique',
  'Africa/Maseru':        'Lesotho',
  'Africa/Mbabane':       'Eswatini',
  'Africa/Mogadishu':     'Somalia',
  'Africa/Monrovia':      'Liberia',
  'Africa/Nairobi':       'Kenya',
  'Africa/Ndjamena':      'Chad',
  'Africa/Niamey':        'Niger',
  'Africa/Nouakchott':    'Mauritania',
  'Africa/Ouagadougou':   'Burkina Faso',
  'Africa/Porto-Novo':    'Benin',
  'Africa/Sao_Tome':      'São Tomé & Príncipe',
  'Africa/Tripoli':       'Libya',
  'Africa/Tunis':         'Tunisia',
  'Africa/Windhoek':      'Namibia',
  'Atlantic/Cape_Verde':  'Cape Verde',
  'Indian/Antananarivo':  'Madagascar',
  'Indian/Mauritius':     'Mauritius',
  'Europe/London':        'United Kingdom',
  'America/New_York':     'United States',
  'America/Chicago':      'United States',
  'America/Denver':       'United States',
  'America/Los_Angeles':  'United States',
  'America/Toronto':      'Canada',
  'America/Vancouver':    'Canada',
  'Australia/Sydney':     'Australia',
  'Australia/Melbourne':  'Australia',
  'Asia/Kolkata':         'India',
  'Asia/Calcutta':        'India',
  'Asia/Shanghai':        'China',
  'Asia/Hong_Kong':       'China',
  'Europe/Paris':         'France',
  'Europe/Berlin':        'Germany',
  'Europe/Rome':          'Italy',
  'Europe/Madrid':        'Spain',
  'Europe/Lisbon':        'Portugal',
  'Asia/Dubai':           'UAE',
  'Asia/Riyadh':          'Saudi Arabia',
  'Asia/Karachi':         'Pakistan',
  'Asia/Dhaka':           'Bangladesh',
  'America/Sao_Paulo':    'Brazil',
  'America/Mexico_City':  'Mexico',
};

/* Brand colour palette — 6 rows × 10 cols (Office-style grid)
   Each column is a colour family; rows go from lightest → darkest */
const PALETTE_ROWS = [
  /* Row 1 — Very light tints */
  ['#FFFFFF','#FFF2CC','#FCE4D6','#FDECEA','#EBF4EB','#DEEBF7','#E8EAF6','#F3E5F5','#E0F2F1','#FBE9E7'],
  /* Row 2 — Light tints */
  ['#F2F2F2','#FFE699','#FFCCB3','#FFAAAA','#B8D9A8','#9DC3E6','#9FA8DA','#CE93D8','#80CBC4','#FFAB91'],
  /* Row 3 — Medium tints */
  ['#D9D9D9','#FFD966','#FF9966','#FF6666','#70AD47','#5BA4D2','#7986CB','#BA68C8','#26A69A','#FF7043'],
  /* Row 4 — Base / saturated */
  ['#595959','#FFC000','#FF6600','#FF0000','#375623','#0070C0','#3F51B5','#9C27B0','#00897B','#E64A19'],
  /* Row 5 — Dark shades */
  ['#404040','#806000','#B34700','#CC0000','#1E3A0D','#005A9E','#283593','#6A1B9A','#00695C','#BF360C'],
  /* Row 6 — Darkest */
  ['#000000','#3D2E00','#5C2400','#800000','#0D1F06','#002060','#1A237E','#4A148C','#004D40','#7F1D09'],
];

/* Standard / named colours — displayed as a second row */
const STANDARD_COLORS = [
  { hex: '#C00000', name: 'Dark Red'    },
  { hex: '#FF0000', name: 'Red'         },
  { hex: '#FF6600', name: 'Orange'      },
  { hex: '#FFD700', name: 'Gold'        },
  { hex: '#FFFF00', name: 'Yellow'      },
  { hex: '#92D050', name: 'Lime Green'  },
  { hex: '#00B050', name: 'Green'       },
  { hex: '#00B0F0', name: 'Sky Blue'    },
  { hex: '#0070C0', name: 'Blue'        },
  { hex: '#1B3FAF', name: 'Royal Blue'  },
  { hex: '#7030A0', name: 'Purple'      },
  { hex: '#000000', name: 'Black'       },
];

/* Public email domains — warning only, not blocking */
const PUBLIC_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'aol.com', 'live.com', 'msn.com',
];

/* Country dial codes — Africa first */
const COUNTRY_CODES = [
  { code: 'SL', name: 'Sierra Leone',   dial: '+232' },
  { code: 'GH', name: 'Ghana',          dial: '+233' },
  { code: 'NG', name: 'Nigeria',        dial: '+234' },
  { code: 'KE', name: 'Kenya',          dial: '+254' },
  { code: 'ZA', name: 'South Africa',   dial: '+27'  },
  { code: 'GM', name: 'Gambia',         dial: '+220' },
  { code: 'LR', name: 'Liberia',        dial: '+231' },
  { code: 'GN', name: 'Guinea',         dial: '+224' },
  { code: 'SN', name: 'Senegal',        dial: '+221' },
  { code: 'GW', name: 'Guinea-Bissau',  dial: '+245' },
  { code: 'CI', name: "Côte d'Ivoire",  dial: '+225' },
  { code: 'ML', name: 'Mali',           dial: '+223' },
  { code: 'BF', name: 'Burkina Faso',   dial: '+226' },
  { code: 'TG', name: 'Togo',           dial: '+228' },
  { code: 'BJ', name: 'Benin',          dial: '+229' },
  { code: 'NE', name: 'Niger',          dial: '+227' },
  { code: 'ET', name: 'Ethiopia',       dial: '+251' },
  { code: 'TZ', name: 'Tanzania',       dial: '+255' },
  { code: 'UG', name: 'Uganda',         dial: '+256' },
  { code: 'RW', name: 'Rwanda',         dial: '+250' },
  { code: 'CM', name: 'Cameroon',       dial: '+237' },
  { code: 'ZM', name: 'Zambia',         dial: '+260' },
  { code: 'ZW', name: 'Zimbabwe',       dial: '+263' },
  { code: 'MZ', name: 'Mozambique',     dial: '+258' },
  { code: 'AO', name: 'Angola',         dial: '+244' },
  { code: 'EG', name: 'Egypt',          dial: '+20'  },
  { code: 'MA', name: 'Morocco',        dial: '+212' },
  { code: 'TN', name: 'Tunisia',        dial: '+216' },
  { code: 'GB', name: 'United Kingdom', dial: '+44'  },
  { code: 'US', name: 'United States',  dial: '+1'   },
  { code: 'CA', name: 'Canada',         dial: '+1'   },
  { code: 'AU', name: 'Australia',      dial: '+61'  },
  { code: 'IN', name: 'India',          dial: '+91'  },
  { code: 'CN', name: 'China',          dial: '+86'  },
  { code: 'FR', name: 'France',         dial: '+33'  },
  { code: 'DE', name: 'Germany',        dial: '+49'  },
  { code: 'IT', name: 'Italy',          dial: '+39'  },
  { code: 'ES', name: 'Spain',          dial: '+34'  },
  { code: 'PT', name: 'Portugal',       dial: '+351' },
  { code: 'AE', name: 'UAE',            dial: '+971' },
  { code: 'SA', name: 'Saudi Arabia',   dial: '+966' },
  { code: 'PK', name: 'Pakistan',       dial: '+92'  },
  { code: 'BD', name: 'Bangladesh',     dial: '+880' },
  { code: 'BR', name: 'Brazil',         dial: '+55'  },
  { code: 'MX', name: 'Mexico',         dial: '+52'  },
];

/* Country-specific placeholder data — city, region, address sample, email TLD, dial code, phone format, cities list */
const COUNTRY_META = {
  'Sierra Leone':      { city: 'Freetown',        region: 'Western Urban',       address: '23 Wilkinson Road, Aberdeen',          emailDomain: 'edu.sl',  dial: '+232', phone: '76 000 000',   cities: ['Freetown', 'Bo', 'Kenema', 'Makeni', 'Koidu', 'Lunsar', 'Port Loko', 'Waterloo'] },
  'Liberia':           { city: 'Monrovia',         region: 'Montserrado',         address: '14 Broad Street, Sinkor',             emailDomain: 'edu.lr',  dial: '+231', phone: '88 000 000',   cities: ['Monrovia', 'Gbarnga', 'Kakata', 'Buchanan', 'Voinjama', 'Zwedru', 'Harper', 'Robertsport'] },
  'Ghana':             { city: 'Accra',            region: 'Greater Accra',       address: '12 Independence Avenue',              emailDomain: 'edu.gh',  dial: '+233', phone: '20 000 0000',  cities: ['Accra', 'Kumasi', 'Tamale', 'Sekondi-Takoradi', 'Cape Coast', 'Obuasi', 'Sunyani', 'Koforidua'] },
  'Nigeria':           { city: 'Lagos',            region: 'Lagos State',         address: '15 Victoria Island Road',             emailDomain: 'edu.ng',  dial: '+234', phone: '80 000 0000',  cities: ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt', 'Benin City', 'Kaduna', 'Enugu', 'Onitsha'] },
  'Kenya':             { city: 'Nairobi',          region: 'Nairobi County',      address: '45 Kenyatta Avenue',                  emailDomain: 'ac.ke',   dial: '+254', phone: '70 000 0000',  cities: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Nyeri'] },
  'Gambia':            { city: 'Banjul',           region: 'Banjul Division',     address: '10 Independence Drive',               emailDomain: 'edu.gm',  dial: '+220', phone: '300 0000',     cities: ['Banjul', 'Serekunda', 'Brikama', 'Bakau', 'Farafenni', 'Lamin', 'Basse Santa Su'] },
  'Guinea':            { city: 'Conakry',          region: 'Conakry',             address: '24 Rue du Commerce',                  emailDomain: 'edu.gn',  dial: '+224', phone: '62 000 000',   cities: ['Conakry', 'Nzérékoré', 'Kankan', 'Kindia', 'Labé', 'Siguiri', 'Mamou'] },
  'Guinea-Bissau':     { city: 'Bissau',           region: 'Bissau',              address: 'Rua Justino Lopes',                   emailDomain: 'edu.gw',  dial: '+245', phone: '96 000 000',   cities: ['Bissau', 'Bafatá', 'Gabú', 'Bissorã', 'Bolama', 'Cacheu', 'Mansôa'] },
  'Senegal':           { city: 'Dakar',            region: 'Dakar',               address: '30 Rue Vincens',                      emailDomain: 'edu.sn',  dial: '+221', phone: '77 000 0000',  cities: ['Dakar', 'Thiès', 'Kaolack', 'Ziguinchor', 'Saint-Louis', 'Touba', 'Diourbel'] },
  "Côte d'Ivoire":     { city: 'Abidjan',          region: 'Abidjan',             address: '18 Boulevard de la République',       emailDomain: 'edu.ci',  dial: '+225', phone: '07 000 0000',  cities: ['Abidjan', 'Bouaké', 'Daloa', 'Yamoussoukro', 'San-Pédro', 'Korhogo', 'Man'] },
  'Mali':              { city: 'Bamako',           region: 'District de Bamako',  address: 'Rue 12, Quartier du Fleuve',          emailDomain: 'edu.ml',  dial: '+223', phone: '66 000 000',   cities: ['Bamako', 'Sikasso', 'Mopti', 'Koutiala', 'Kayes', 'Ségou', 'Gao'] },
  'Burkina Faso':      { city: 'Ouagadougou',      region: 'Kadiogo',             address: 'Avenue Kwame Nkrumah',                emailDomain: 'edu.bf',  dial: '+226', phone: '70 000 000',   cities: ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Ouahigouya', 'Banfora', 'Kaya'] },
  'Togo':              { city: 'Lomé',             region: 'Maritime',            address: 'Boulevard du 13 Janvier',             emailDomain: 'edu.tg',  dial: '+228', phone: '90 000 000',   cities: ['Lomé', 'Sokodé', 'Kara', 'Atakpamé', 'Kpalimé', 'Tsévié', 'Aného'] },
  'Benin':             { city: 'Cotonou',          region: 'Littoral',            address: 'Boulevard Saint-Michel',              emailDomain: 'edu.bj',  dial: '+229', phone: '96 000 000',   cities: ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey', 'Bohicon', 'Kandi', 'Natitingou'] },
  'Niger':             { city: 'Niamey',           region: 'Niamey',              address: "Avenue du Président Luebke",          emailDomain: 'edu.ne',  dial: '+227', phone: '96 000 000',   cities: ['Niamey', 'Zinder', 'Maradi', 'Agadez', 'Tahoua', 'Dosso', 'Diffa'] },
  'South Africa':      { city: 'Cape Town',        region: 'Western Cape',        address: '1 Adderley Street',                   emailDomain: 'edu.za',  dial: '+27',  phone: '71 000 0000',  cities: ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'East London', 'Polokwane'] },
  'Tanzania':          { city: 'Dar es Salaam',    region: 'Dar es Salaam',       address: '5 Ohio Street',                       emailDomain: 'ac.tz',   dial: '+255', phone: '71 000 0000',  cities: ['Dar es Salaam', 'Dodoma', 'Mwanza', 'Arusha', 'Mbeya', 'Morogoro', 'Tanga', 'Zanzibar City'] },
  'Uganda':            { city: 'Kampala',          region: 'Kampala',             address: '12 Kampala Road',                     emailDomain: 'ac.ug',   dial: '+256', phone: '77 000 0000',  cities: ['Kampala', 'Gulu', 'Mbarara', 'Jinja', 'Entebbe', 'Mbale', 'Fort Portal', 'Lira'] },
  'Rwanda':            { city: 'Kigali',           region: 'Kigali City',         address: '50 KG 7 Avenue',                      emailDomain: 'ac.rw',   dial: '+250', phone: '78 000 0000',  cities: ['Kigali', 'Butare', 'Gitarama', 'Musanze', 'Gisenyi', 'Byumba', 'Rwamagana'] },
  'Cameroon':          { city: 'Yaoundé',          region: 'Centre',              address: '24 Rue Joseph Essono',                emailDomain: 'edu.cm',  dial: '+237', phone: '67 000 000',   cities: ['Yaoundé', 'Douala', 'Garoua', 'Bamenda', 'Bafoussam', 'Maroua', 'Ngaoundéré'] },
  'Ethiopia':          { city: 'Addis Ababa',      region: 'Addis Ababa',         address: 'Bole Road, Kirkos',                   emailDomain: 'edu.et',  dial: '+251', phone: '91 000 0000',  cities: ['Addis Ababa', 'Dire Dawa', 'Mekelle', 'Bahir Dar', 'Gondar', 'Hawassa', 'Jimma'] },
  'Egypt':             { city: 'Cairo',            region: 'Cairo Governorate',   address: '5 Tahrir Square, Downtown',           emailDomain: 'edu.eg',  dial: '+20',  phone: '10 000 0000',  cities: ['Cairo', 'Alexandria', 'Giza', 'Luxor', 'Aswan', 'Hurghada', 'Port Said', 'Suez'] },
  'Morocco':           { city: 'Casablanca',       region: 'Grand Casablanca',    address: '35 Boulevard Mohammed V',             emailDomain: 'ac.ma',   dial: '+212', phone: '60 000 0000',  cities: ['Casablanca', 'Rabat', 'Fez', 'Marrakech', 'Agadir', 'Tangier', 'Meknès', 'Oujda'] },
  'Zambia':            { city: 'Lusaka',           region: 'Lusaka Province',     address: '10 Cairo Road',                       emailDomain: 'edu.zm',  dial: '+260', phone: '97 000 0000',  cities: ['Lusaka', 'Kitwe', 'Ndola', 'Kabwe', 'Chingola', 'Livingstone', 'Mufulira', 'Luanshya'] },
  'Zimbabwe':          { city: 'Harare',           region: 'Harare Province',     address: '20 Samora Machel Avenue',             emailDomain: 'ac.zw',   dial: '+263', phone: '77 000 0000',  cities: ['Harare', 'Bulawayo', 'Chitungwiza', 'Mutare', 'Gweru', 'Kwekwe', 'Kadoma', 'Masvingo'] },
  'Angola':            { city: 'Luanda',           region: 'Luanda Province',     address: '18 Avenida 4 de Fevereiro',           emailDomain: 'edu.ao',  dial: '+244', phone: '92 000 0000',  cities: ['Luanda', 'Huambo', 'Lobito', 'Benguela', 'Namibe', 'Malanje', 'Lubango', 'Kuito'] },
  'Mozambique':        { city: 'Maputo',           region: 'Maputo Province',     address: '10 Avenida 25 de Setembro',           emailDomain: 'edu.mz',  dial: '+258', phone: '82 000 0000',  cities: ['Maputo', 'Matola', 'Beira', 'Nampula', 'Quelimane', 'Tete', 'Nacala', 'Lichinga'] },
  'Madagascar':        { city: 'Antananarivo',     region: 'Analamanga',          address: '5 Avenue de l\'Indépendance',         emailDomain: 'edu.mg',  dial: '+261', phone: '32 000 0000',  cities: ['Antananarivo', 'Toamasina', 'Antsirabe', 'Fianarantsoa', 'Mahajanga', 'Toliara', 'Antsiranana'] },
  'Malawi':            { city: 'Lilongwe',         region: 'Central Region',      address: '1 Kamuzu Procession Road',            emailDomain: 'ac.mw',   dial: '+265', phone: '88 000 0000',  cities: ['Lilongwe', 'Blantyre', 'Mzuzu', 'Zomba', 'Kasungu', 'Mangochi', 'Karonga'] },
  'Congo (DRC)':       { city: 'Kinshasa',         region: 'Kinshasa',            address: 'Boulevard du 30 Juin',                emailDomain: 'edu.cd',  dial: '+243', phone: '81 000 0000',  cities: ['Kinshasa', 'Lubumbashi', 'Mbuji-Mayi', 'Kananga', 'Kisangani', 'Bukavu', 'Goma', 'Matadi'] },
  'Congo (Brazzaville)': { city: 'Brazzaville',   region: 'Brazzaville',         address: 'Avenue Amilcar Cabral',               emailDomain: 'edu.cg',  dial: '+242', phone: '06 000 0000',  cities: ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Impfondo', 'Owando', 'Ouésso'] },
  'Gabon':             { city: 'Libreville',       region: 'Estuaire',            address: "Boulevard de l'Indépendance",         emailDomain: 'edu.ga',  dial: '+241', phone: '07 000 000',   cities: ['Libreville', 'Port-Gentil', 'Franceville', 'Oyem', 'Moanda', 'Mouila', 'Lambaréné'] },
  'Namibia':           { city: 'Windhoek',         region: 'Khomas',              address: '10 Independence Avenue',              emailDomain: 'edu.na',  dial: '+264', phone: '81 000 0000',  cities: ['Windhoek', 'Swakopmund', 'Walvis Bay', 'Oshakati', 'Rundu', 'Katima Mulilo', 'Lüderitz'] },
  'Botswana':          { city: 'Gaborone',         region: 'South-East District', address: '8 Khama Crescent',                    emailDomain: 'ac.bw',   dial: '+267', phone: '71 000 000',   cities: ['Gaborone', 'Francistown', 'Molepolole', 'Selebi-Phikwe', 'Kanye', 'Maun', 'Serowe'] },
  'Eswatini':          { city: 'Mbabane',          region: 'Hhohho',              address: 'Allister Miller Street',              emailDomain: 'ac.sz',   dial: '+268', phone: '76 000 000',   cities: ['Mbabane', 'Manzini', 'Big Bend', 'Malkerns', 'Nhlangano', 'Siteki'] },
  'Lesotho':           { city: 'Maseru',           region: 'Maseru District',     address: '1 Kingsway Road',                     emailDomain: 'ac.ls',   dial: '+266', phone: '58 000 000',   cities: ['Maseru', 'Teyateyaneng', 'Mafeteng', 'Hlotse', "Mohale's Hoek", 'Quthing'] },
  'Somalia':           { city: 'Mogadishu',        region: 'Banaadir',            address: 'Via Roma, Hamar-Weyne',               emailDomain: 'edu.so',  dial: '+252', phone: '61 000 000',   cities: ['Mogadishu', 'Hargeisa', 'Bosaso', 'Kismayo', 'Berbera', 'Merca', 'Baidoa'] },
  'Sudan':             { city: 'Khartoum',         region: 'Khartoum State',      address: 'El Nile Street',                      emailDomain: 'edu.sd',  dial: '+249', phone: '91 000 0000',  cities: ['Khartoum', 'Omdurman', 'Port Sudan', 'Kassala', 'Gedaref', 'El Obeid', 'Wad Madani'] },
  'South Sudan':       { city: 'Juba',             region: 'Central Equatoria',   address: 'Juba Town Road',                      emailDomain: 'edu.ss',  dial: '+211', phone: '92 000 0000',  cities: ['Juba', 'Malakal', 'Wau', 'Yambio', 'Rumbek', 'Bentiu', 'Bor'] },
  'United Kingdom':    { city: 'London',           region: 'Greater London',      address: '10 Downing Street',                   emailDomain: 'ac.uk',   dial: '+44',  phone: '7700 000000',  cities: ['London', 'Birmingham', 'Manchester', 'Leeds', 'Glasgow', 'Liverpool', 'Edinburgh', 'Bristol'] },
  'United States':     { city: 'Washington D.C.',  region: 'District of Columbia','address': '1600 Pennsylvania Avenue',          emailDomain: 'edu',     dial: '+1',   phone: '202 000 0000', cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'Washington D.C.', 'Atlanta'] },
  'Canada':            { city: 'Toronto',          region: 'Ontario',             address: '100 Queen Street West',               emailDomain: 'edu',     dial: '+1',   phone: '416 000 0000', cities: ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City'] },
  'France':            { city: 'Paris',            region: 'Île-de-France',       address: '1 Rue de Rivoli',                     emailDomain: 'edu.fr',  dial: '+33',  phone: '6 00 00 0000', cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Bordeaux'] },
  'India':             { city: 'New Delhi',        region: 'Delhi',               address: '5 Rajpath, Chanakyapuri',             emailDomain: 'edu.in',  dial: '+91',  phone: '98 000 00000', cities: ['New Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'] },
};

function getCountryMeta(country) {
  return COUNTRY_META[country] || {
    city: '', region: '', address: '', emailDomain: 'edu', dial: null, phone: '',
  };
}

/* ================================================================
   Password Strength Indicator
   ================================================================ */
function PasswordStrength({ password }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8)            score++;
  if (/[A-Z]/.test(password))         score++;
  if (/[0-9]/.test(password))         score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const colors = ['', '#EF4444', '#F97316', '#EAB308', '#22D3A3'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div className="pwd-strength">
      <div className="pwd-strength-bars">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="pwd-strength-bar"
            style={i <= score ? { background: colors[score] } : undefined} />
        ))}
      </div>
      {score > 0 && (
        <span className="pwd-strength-label" style={{ color: colors[score] }}>
          {labels[score]}
        </span>
      )}
    </div>
  );
}

/* ================================================================
   Brand Color Picker — input + Choose button reveals palette popup
   ================================================================ */
function BrandColorPicker({ value, onChange }) {
  const [colorInput, setColorInput] = useState('');
  const [showPalette, setShowPalette] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!showPalette) return;
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowPalette(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPalette]);

  const toggleColor = (hex) => {
    if (value.includes(hex)) {
      onChange(value.filter((c) => c !== hex));
    } else {
      onChange([...value, hex]);
    }
  };

  const addCustom = () => {
    const trimmed = colorInput.trim();
    if (!trimmed || value.includes(trimmed)) { setColorInput(''); return; }
    onChange([...value, trimmed]);
    setColorInput('');
  };

  const removeColor = (c) => onChange(value.filter((x) => x !== c));

  return (
    <div className="brand-color-picker">

      {/* ── Input row: text field + Add + Choose ── */}
      <div className="color-input-wrapper" ref={wrapperRef}>
        <div className="color-input-row">
          <input
            className="reg-input"
            type="text"
            placeholder="Type a colour name and press Enter…"
            value={colorInput}
            onChange={(e) => setColorInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          />
          <button
            type="button"
            className={`color-choose-btn${showPalette ? ' active' : ''}`}
            onClick={() => setShowPalette((v) => !v)}
          >
            Choose
          </button>
        </div>

        {/* ── Palette popup ── */}
        {showPalette && (
          <div className="color-palette-popup">
            <div className="palette-popup-header">
              <span className="palette-popup-title">Pick Colours</span>
              <button
                type="button"
                className="palette-popup-close"
                onClick={() => setShowPalette(false)}
                aria-label="Close colour picker"
              >
                &times;
              </button>
            </div>

            <p className="palette-section-label">Theme Colours</p>
            <div className="palette-grid">
              {PALETTE_ROWS.map((row, ri) => (
                <div key={ri} className="palette-row">
                  {row.map((hex, ci) => (
                    <button
                      key={`${ri}-${ci}`}
                      type="button"
                      className={`palette-swatch${value.includes(hex) ? ' selected' : ''}`}
                      style={{ background: hex }}
                      onClick={() => toggleColor(hex)}
                      title={hex}
                      aria-label={`${value.includes(hex) ? 'Remove' : 'Select'} ${hex}`}
                    />
                  ))}
                </div>
              ))}
            </div>

            <p className="palette-section-label" style={{ marginTop: '10px' }}>Standard Colours</p>
            <div className="palette-row palette-row--std">
              {STANDARD_COLORS.map(({ hex, name }) => (
                <button
                  key={hex}
                  type="button"
                  className={`palette-swatch palette-swatch--std${value.includes(hex) ? ' selected' : ''}`}
                  style={{ background: hex }}
                  onClick={() => toggleColor(hex)}
                  title={name}
                  aria-label={`${value.includes(hex) ? 'Remove' : 'Select'} ${name}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Selected colours as tags ── */}
      {value.length > 0 && (
        <div className="color-tags">
          {value.map((c) => {
            const std = STANDARD_COLORS.find((s) => s.hex === c);
            return (
              <div key={c} className="color-tag">
                <span className="color-tag-dot" style={{ background: c }} />
                <span className="color-tag-name">{std ? std.name : c}</span>
                <button type="button" className="color-tag-remove" onClick={() => removeColor(c)}>
                  &times;
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Logo / Badge Upload
   ================================================================ */
function LogoUpload({ preview, inputRef, onChange, onRemove }) {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onChange({ target: { files: [file] } });
  };

  return (
    <div className="logo-upload">
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg"
        style={{ display: 'none' }}
        onChange={onChange}
        aria-label="Upload school badge"
      />
      {preview ? (
        <div className="logo-preview-wrap">
          <img src={preview} alt="School badge preview" className="logo-preview" />
          <div className="logo-preview-info">
            <span className="logo-preview-ok">Badge uploaded</span>
            <button type="button" className="logo-remove-btn" onClick={onRemove}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`logo-dropzone${isDragActive ? ' logo-dropzone--drag' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <span className="logo-dropzone-icon"><UploadIcon /></span>
          <span className="logo-dropzone-label">
            {isDragActive ? 'Drop to upload' : 'Upload School Badge'}
          </span>
          <span className="logo-dropzone-sub">PNG or JPG · Max 5 MB · Drag &amp; drop or click</span>
          <span className="logo-dropzone-btn">
            {isDragActive ? '⬇ Release to upload' : 'Choose File'}
          </span>
        </button>
      )}
      <p className="input-hint">
        Used in report cards, certificates, transcripts, and dashboards.
      </p>
    </div>
  );
}

/* ================================================================
   Phone Input — country code dropdown + numbers-only field
   ================================================================ */
function PhoneInput({ codeValue, numberValue, onCodeChange, onNumberChange, id, placeholder }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef             = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = COUNTRY_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial.includes(search)
  );

  const selected = COUNTRY_CODES.find((c) => c.dial === codeValue) || COUNTRY_CODES[0];

  return (
    <div className="phone-input-wrap" ref={wrapRef}>
      {/* Dial code selector */}
      <button
        type="button"
        className="phone-dial-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Select country code"
        aria-expanded={open}
      >
        <span className="phone-dial-code">{selected.dial}</span>
        <span className="phone-dial-flag">▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="phone-dropdown" role="listbox">
          <div className="phone-search-wrap">
            <input
              className="phone-search-input"
              type="text"
              placeholder="Search country or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="phone-dropdown-list">
            {filtered.map((c) => (
              <button
                key={`${c.code}-${c.dial}`}
                type="button"
                role="option"
                aria-selected={codeValue === c.dial}
                className={`phone-dropdown-item${codeValue === c.dial ? ' active' : ''}`}
                onClick={() => { onCodeChange(c.dial); setOpen(false); setSearch(''); }}
              >
                <span className="phone-item-name">{c.name}</span>
                <span className="phone-item-dial">{c.dial}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="phone-no-results">No results</p>
            )}
          </div>
        </div>
      )}

      {/* Numbers-only input */}
      <input
        id={id}
        className="phone-number-input"
        type="text"
        inputMode="numeric"
        placeholder={placeholder || '76 000 000'}
        value={numberValue}
        onChange={(e) => onNumberChange(e.target.value.replace(/\D/g, ''))}
      />
    </div>
  );
}

/* ================================================================
   Leave Warning Modal
   ================================================================ */
function LeaveModal({ onStay, onLeave }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="leave-title" onClick={onStay}>
      <div className="leave-modal" onClick={(e) => e.stopPropagation()}>
        <div className="leave-modal-icon">⚠</div>
        <h2 className="leave-modal-title" id="leave-title">Leave this page?</h2>
        <p className="leave-modal-desc">Your registration progress will be lost.</p>
        <div className="leave-modal-actions">
          <button type="button" className="leave-stay-btn" onClick={onStay} autoFocus>
            Stay on page
          </button>
          <button type="button" className="leave-leave-btn" onClick={onLeave}>
            Leave anyway
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Legal Modal — Terms of Service & Privacy Policy (placeholder)
   ================================================================ */
function LegalModal({ tab, onClose }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{tab === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</h2>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="modal-body">
          {tab === 'terms' ? (
            <>
              <p className="modal-draft-badge">Draft — Version 1.0 · Effective: April 2026</p>

              <h3>1. Acceptance of Terms</h3>
              <p>By registering your institution on EK-SMS ("the Platform"), you ("Institution Administrator") agree to be bound by these Terms. If you do not agree, do not use the Platform.</p>

              <h3>2. Platform Use</h3>
              <p>EK-SMS is a school management system for educational institutions to manage student records, attendance, grades, reports, and communications. Access is restricted to registered institutions and their authorised staff.</p>

              <h3>3. Account Responsibility</h3>
              <p>The Institution Administrator is responsible for the security of account credentials and all activities under the institution's account. Notify EK-SMS immediately of any unauthorised use.</p>

              <h3>4. Data Ownership</h3>
              <p>Your institution retains full ownership of all data entered into EK-SMS. EK-SMS will not sell, share, or transfer your data to third parties without explicit consent, except as required by law.</p>

              <h3>5. Acceptable Use</h3>
              <p>You agree not to use EK-SMS for unlawful purposes, upload malicious content, or attempt to access other institutions' data.</p>

              <h3>6. Termination</h3>
              <p>EK-SMS may suspend or terminate accounts found in violation of these Terms. Institutions may request account closure at any time by contacting support.</p>

              <h3>7. Limitation of Liability</h3>
              <p>EK-SMS is provided "as is." EK-SMS shall not be liable for indirect, incidental, or consequential damages from use of the Platform.</p>

              <h3>8. Governing Law</h3>
              <p>These Terms are governed by the laws of the Republic of Sierra Leone.</p>

              <h3>9. Contact</h3>
              <p>Questions about these Terms? Email <strong>legal@eksms.sl</strong>.</p>
            </>
          ) : (
            <>
              <p className="modal-draft-badge">Draft — Version 1.0 · Effective: April 2026</p>

              <h3>1. Information We Collect</h3>
              <p>EK-SMS collects institution details, administrator contact information provided during registration, and operational data entered by your institution (student records, grades, attendance).</p>

              <h3>2. How We Use Your Information</h3>
              <p>We use collected information to operate the Platform, provide support, and send service-related notifications. We do not use your data for marketing or advertising.</p>

              <h3>3. Data Storage & Security</h3>
              <p>All data is stored on secure servers with encryption in transit (TLS) and at rest. Institution data is logically segregated and accessible only to authorised users of your institution.</p>

              <h3>4. Data Retention</h3>
              <p>Data is retained for the duration of the active account. Upon closure, data is retained for 90 days before permanent deletion, unless earlier deletion is requested.</p>

              <h3>5. Third-Party Services</h3>
              <p>EK-SMS may use third-party providers for hosting and email delivery. These providers are bound by data processing agreements and may not use your data for their own purposes.</p>

              <h3>6. Your Rights</h3>
              <p>Institutions have the right to access, correct, export, and request deletion of their data. Submit requests to <strong>privacy@eksms.sl</strong>.</p>

              <h3>7. Children's Privacy</h3>
              <p>Student data is entered and controlled by the institution. Institutions are responsible for compliance with applicable child data protection laws in their jurisdiction.</p>

              <h3>8. Contact</h3>
              <p>Privacy inquiries: <strong>privacy@eksms.sl</strong>.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Helper: Field wrapper
   ================================================================ */
function Field({ id, label, required, hint, error, children }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required && <span className="req"> *</span>}
      </label>
      {children}
      {error
        ? <p className="field-error" role="alert">{error}</p>
        : hint && <p className="input-hint">{hint}</p>
      }
    </div>
  );
}

/* ================================================================
   Main Register Component
   ================================================================ */
function Register({ onNavigate }) {
  /* ── Restore step + form from sessionStorage on mount ── */
  const [step, setStep] = useState(() => {
    try { const s = sessionStorage.getItem('ek_reg_step'); return s ? parseInt(s, 10) : 1; }
    catch { return 1; }
  });
  const [form, setForm] = useState(() => {
    try {
      const saved = sessionStorage.getItem('ek_reg_form');
      return saved ? { ...DEFAULT_FORM, ...JSON.parse(saved) } : DEFAULT_FORM;
    } catch { return DEFAULT_FORM; }
  });

  const [submitted, setSubmitted]       = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [checkingName, setCheckingName] = useState(false);
  const [error, setError]               = useState('');
  const [showPwd, setShowPwd]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [cityOther, setCityOther]       = useState(false);

  /* Inline per-field validation */
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched]         = useState({}); // eslint-disable-line no-unused-vars

  /* OTP verification (step 7) */
  const [otpSent, setOtpSent]             = useState(false);
  const [otpInput, setOtpInput]           = useState('');
  const [otpVerified, setOtpVerified]     = useState(false);
  const [otpError, setOtpError]           = useState('');
  const [otpLoading, setOtpLoading]       = useState(false);
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const [otpSkipped, setOtpSkipped]       = useState(false);

  /* Badge file state (separate — File objects can't be JSON-serialised) */
  const [badgeFile, setBadgeFile]       = useState(null);
  const [badgePreview, setBadgePreview] = useState('');
  const badgeInputRef = useRef(null);

  const [legalModal, setLegalModal]             = useState(null);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [autoDetectedCountry, setAutoDetectedCountry] = useState(null);

  const set    = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));
  const setChk = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.checked }));

  /* ---- Badge upload handler ---- */
  const handleBadgeChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setError('Please upload a PNG or JPG image.'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Badge image must be smaller than 5 MB.'); return;
    }
    setBadgeFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setBadgePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeBadge = () => {
    setBadgeFile(null);
    setBadgePreview('');
    if (badgeInputRef.current) badgeInputRef.current.value = '';
  };

  /* ---- Country auto-detect (runs once on mount) ---- */
  useEffect(() => {
    try {
      const tz       = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const detected = TIMEZONE_TO_COUNTRY[tz];
      if (detected && COUNTRIES.includes(detected)) {
        setAutoDetectedCountry(detected);
        setForm((p) => {
          if (p.country) return p; // user already selected — don't overwrite
          const meta = getCountryMeta(detected);
          return {
            ...p,
            country:        detected,
            phoneCode:      meta.dial || p.phoneCode,
            adminPhoneCode: meta.dial || p.adminPhoneCode,
          };
        });
      }
    } catch { /* Intl not available */ }
  }, []);

  /* ---- Leave-page: warn browser on refresh / close when form is dirty ---- */
  const isDirty = !!(
    form.institutionName || form.address || form.email ||
    form.firstName || form.adminEmail || form.password || step > 1
  );

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleBackToHome = () => {
    if (isDirty) setShowLeaveWarning(true);
    else onNavigate && onNavigate('home');
  };

  /* ---- sessionStorage auto-save (form + step) ---- */
  useEffect(() => {
    try { sessionStorage.setItem('ek_reg_form', JSON.stringify(form)); } catch {}
  }, [form]);
  useEffect(() => {
    try { sessionStorage.setItem('ek_reg_step', String(step)); } catch {}
  }, [step]);

  /* ---- OTP resend countdown ---- */
  useEffect(() => {
    if (otpResendTimer <= 0) return;
    const id = setTimeout(() => setOtpResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [otpResendTimer]);

  /* ---- Auto-send OTP when user reaches Verify step ---- */
  useEffect(() => {
    if (step === 7 && !otpSent && !otpLoading && !otpVerified && !otpSkipped) {
      sendOtp(); // eslint-disable-line react-hooks/exhaustive-deps
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Inline field validation ---- */
  const validateFieldInline = (field) => {
    const v = form[field] ?? '';
    switch (field) {
      case 'institutionName': return !v.trim() ? 'Institution name is required.' : null;
      case 'institutionType': return !v ? 'Please select an institution type.' : null;
      case 'address':         return !v.trim() ? 'Street address is required.' : null;
      case 'city':            return !v.trim() ? 'City is required.' : null;
      case 'country':         return !v ? 'Please select a country.' : null;
      case 'phoneNumber':
        if (!v.trim()) return 'Phone number is required.';
        if (v.length < 6) return 'Must be at least 6 digits.';
        return null;
      case 'email':
        if (!v.trim()) return 'Email is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
        return null;
      case 'firstName':     return !v.trim() ? 'First name is required.' : null;
      case 'lastName':      return !v.trim() ? 'Last name is required.' : null;
      case 'adminUsername':
        if (!v.trim()) return 'Username is required.';
        if (!/^[a-zA-Z0-9_-]{3,30}$/.test(v)) return '3–30 chars: letters, numbers, _ or -';
        return null;
      case 'adminEmail':
        if (!v.trim()) return 'Admin email is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
        return null;
      case 'adminPhoneNumber':
        if (!v.trim()) return 'Phone number is required.';
        if (v.length < 6) return 'Must be at least 6 digits.';
        return null;
      case 'password':
        if (v.length < 8) return 'At least 8 characters required.';
        if (!/[A-Z]/.test(v)) return 'Include an uppercase letter.';
        if (!/[0-9]/.test(v)) return 'Include a number.';
        if (!/[^A-Za-z0-9]/.test(v)) return 'Include a symbol (e.g. !@#).';
        return null;
      case 'confirmPassword':
        return v !== form.password ? 'Passwords do not match.' : null;
      default: return null;
    }
  };

  const blur = (field) => () => {
    setTouched((p) => ({ ...p, [field]: true }));
    setFieldErrors((p) => ({ ...p, [field]: validateFieldInline(field) }));
  };

  /* ---- OTP: send initial code to adminEmail ---- */
  const sendOtp = async () => {
    setOtpLoading(true);
    setOtpError('');
    try {
      await ApiClient.post('/api/send-otp/', { 
        email: form.adminEmail 
      });
      setOtpSent(true);
      setOtpResendTimer(60);
    } catch (err) {
      if (err.status === 429) {
        // CODE ALREADY SENT: Server has an active OTP but cooldown is on. 
        // We SHOULD show the input field so they can enter the code already in their inbox.
        setOtpSent(true);
        if (err.data?.retry_after) setOtpResendTimer(err.data.retry_after);
        setOtpError('An OTP has already been sent to your email.');
      } else if (err.name === 'TimeoutError' || err.name === 'AbortError' || err.message?.includes('fetch')) {
        setOtpError('Email service unavailable. You can skip verification and continue.');
        setOtpSent(false);
      } else {
        setOtpError(err.message || 'Could not send code. Try again or skip.');
        setOtpSent(false);
      }
    } finally {
      setOtpLoading(false);
    }
  };

  /* ---- OTP: resend code (uses dedicated /api/resend-otp/ with server-side cooldown) ---- */
  const resendOtp = async () => {
    setOtpLoading(true);
    setOtpError('');
    setOtpInput('');
    try {
      await ApiClient.post('/api/resend-otp/', { 
        email: form.adminEmail 
      });
      setOtpResendTimer(60);
    } catch (err) {
      // If server says cooldown is still active, sync the timer
      if (err.status === 429 && err.data?.retry_after) {
        setOtpResendTimer(err.data.retry_after);
        setOtpError(`Please wait before requesting another code.`);
      } else if (err.name === 'TimeoutError' || err.name === 'AbortError' || err.message?.includes('fetch')) {
        setOtpError('Email service unavailable. Please try again later.');
      } else {
        setOtpError(err.message || 'Could not resend code. Try again.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  /* ---- OTP: verify entered code ---- */
  const verifyOtp = async () => {
    if (otpInput.length !== 6) { setOtpError('Please enter the full 6-digit code.'); return; }
    setOtpLoading(true);
    setOtpError('');
    try {
      const data = await ApiClient.post('/api/verify-otp/', { 
        email: form.adminEmail, 
        otp: otpInput 
      });
      if (!data.success) throw new Error(data.message || 'Invalid or expired code.');
      setOtpVerified(true);
      setOtpError('');
    } catch (err) {
      setOtpError(err.message || 'Verification failed. Check the code and try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  /* ---- Public email domain check (non-blocking warning) ---- */
  const adminEmailDomainWarning = (() => {
    if (!form.adminEmail.includes('@')) return null;
    const domain = form.adminEmail.split('@')[1]?.toLowerCase();
    return PUBLIC_DOMAINS.includes(domain) ? domain : null;
  })();

  /* ---- Async duplicate school name check ---- */
  const checkDuplicateName = async (name) => {
    try {
      const data = await ApiClient.get(`/api/check-school-name/?name=${encodeURIComponent(name)}`);
      // Check both available and exists keys (backend uses both for compatibility)
      return data.exists === true || data.available === false;
    } catch { /* API unavailable — allow registration to proceed */ }
    return false;
  };

  /* ---- Step validation ---- */
  const validate = () => {
    setError('');
    if (step === 1) {
      if (!form.institutionName.trim()) { setError('Institution name is required.'); return false; }
      if (!form.institutionType)        { setError('Please select an institution type.'); return false; }
      if (form.estimatedTeachers) {
        const n = parseInt(form.estimatedTeachers, 10);
        if (isNaN(n) || n < 1) { setError('Please enter a valid number of teachers.'); return false; }
      }
    }
    if (step === 2) {
      if (!form.address.trim()) { setError('Street address is required.'); return false; }
      if (!form.city.trim())    { setError('City is required.'); return false; }
      if (!form.country)        { setError('Please select a country.'); return false; }
    }
    if (step === 3) {
      if (!form.phoneNumber.trim()) { setError('Phone number is required.'); return false; }
      if (form.phoneNumber.length < 6) { setError('Phone number must be at least 6 digits.'); return false; }
      if (!form.email.trim())       { setError('Institutional email is required.'); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        setError('Please enter a valid email address.'); return false;
      }
    }
    if (step === 4) {
      if (!form.firstName.trim())     { setError('First name is required.'); return false; }
      if (!form.lastName.trim())      { setError('Last name is required.'); return false; }
      if (!form.adminUsername.trim()) { setError('Admin username is required.'); return false; }
      if (!/^[a-zA-Z0-9_-]{3,30}$/.test(form.adminUsername)) {
        setError('Username must be 3–30 characters: letters, numbers, _ or -'); return false;
      }
      if (!form.adminEmail.trim()) { setError('Admin email is required.'); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)) {
        setError('Please enter a valid admin email address.'); return false;
      }
      if (!form.adminPhoneNumber.trim()) { setError('Admin phone number is required.'); return false; }
      if (form.adminPhoneNumber.length < 6) { setError('Admin phone number must be at least 6 digits.'); return false; }
      if (form.password.length < 8)              { setError('Password must be at least 8 characters.'); return false; }
      if (!/[A-Z]/.test(form.password))          { setError('Password must contain at least one uppercase letter.'); return false; }
      if (!/[0-9]/.test(form.password))          { setError('Password must contain at least one number.'); return false; }
      if (!/[^A-Za-z0-9]/.test(form.password))  { setError('Password must contain at least one symbol.'); return false; }
      if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return false; }
    }
    if (step === 5) {
      const cap = parseInt(form.capacity, 10);
      if (isNaN(cap) || cap < 1) { setError('Please enter a valid student capacity.'); return false; }
    }
    if (step === 6) {
      if (!form.agreementAccuracy)       { setError('Please confirm the school information is accurate.'); return false; }
      if (!form.agreementDataProtection) { setError('Please agree to the data protection policy.'); return false; }
      if (!form.agreementAuthorized)     { setError('Please confirm you are authorised to register this institution.'); return false; }
    }
    if (step === 7) {
      if (!otpVerified) {
        setError('Please verify your email address before continuing.'); return false;
      }
    }
    return true;
  };

  /* ---- Next (async for step 1 duplicate check) ---- */
  const next = async () => {
    if (!validate()) return;
    if (step === 1 && form.institutionName.trim()) {
      setCheckingName(true);
      const isDuplicate = await checkDuplicateName(form.institutionName.trim());
      setCheckingName(false);
      if (isDuplicate) {
        setError(`"${form.institutionName}" is already registered in EK-SMS. If this is your school, please sign in instead.`);
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const back = () => { setError(''); setStep((s) => Math.max(s - 1, 1)); };

  /* ---- Submit ---- */
  const handleSubmit = async () => {
    if (!validate()) return;
    setError('');
    setIsLoading(true);
    try {
      let payload;
      if (badgeFile) {
        payload = new FormData();
        Object.entries(form).forEach(([key, val]) => {
          if (key === 'brandColors') {
            payload.append(key, JSON.stringify(val));
          } else {
            payload.append(key, val);
          }
        });
        payload.append('phone', form.phoneCode + form.phoneNumber);
        payload.append('adminPhone', form.adminPhoneCode + form.adminPhoneNumber);
        payload.append('brandColor', form.brandColors.join(', '));
        payload.append('schoolBadge', badgeFile);
      } else {
        payload = {
          ...form,
          phone:      form.phoneCode + form.phoneNumber,
          adminPhone: form.adminPhoneCode + form.adminPhoneNumber,
          brandColor: form.brandColors.join(', '),
        };
      }
      const data = await ApiClient.post('/api/register/', payload);
      if (!data.success) {
        throw new Error(data.message || 'Registration failed. Please try again.');
      }
      setSubmitted(true);
      try { sessionStorage.removeItem('ek_reg_form'); sessionStorage.removeItem('ek_reg_step'); } catch {}
    } catch (err) {
      console.error('Registration submission error:', err);
      // More helpful error message for "Failed to fetch"
      if (err.message === 'Failed to fetch' || err.status === 0) {
        setError('Network error: Could not reach the server. Please check your internet connection or try again later.');
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillPct = step === 1 ? 0 : ((step - 1) / (STEPS.length - 1)) * 100;

  /* ================================================================
     Success Screen
     ================================================================ */
  if (submitted) {
    return (
      <div className="reg-page">
        <div className="reg-card">
          <div className="reg-success">
            <div className="success-icon-wrap"><CheckIcon /></div>
            <h2 className="success-title">Application Received!</h2>
            <p className="success-desc">
              <span className="success-school-name">{form.institutionName}</span> has been
              successfully submitted for review.
            </p>
            <p className="success-email-note">
              Our team will review your application. You will receive an email once your 
              institution has been <strong>approved</strong>. You cannot sign in until the 
              approval process is complete.
            </p>
            <button className="btn-go-signin" onClick={() => onNavigate && onNavigate('login')}>
              Go to Sign In
            </button>
          </div>
        </div>
        <p className="reg-footer">© 2026 EK-SMS. School Management System.</p>
      </div>
    );
  }

  /* ================================================================
     Wizard
     ================================================================ */
  return (
    <div className="reg-page">
      <button className="reg-back-link" type="button" onClick={handleBackToHome}>
        <SparkleIcon /> Back to home
      </button>

      <div className="reg-card">
        {/* Card Header */}
        <div className="reg-header">
          <PruhLogo size={52} showText={false} variant="blue" />
          <h1 className="reg-title">Register Your Institution</h1>
          <p className="reg-step-label">
            Step {step} of {STEPS.length} — <span>{STEPS[step - 1].label}</span>
          </p>
        </div>

        {/* Stepper */}
        <div className="stepper" aria-label="Registration progress">
          <div className="stepper-track">
            <div className="stepper-fill" style={{ width: `${fillPct}%` }} />
          </div>
          {STEPS.map((s, i) => {
            const num = i + 1;
            const isDone   = step > num;
            const isActive = step === num;
            return (
              <div className="step-item" key={s.key}>
                <div className={`step-circle${isDone ? ' done' : ''}${isActive ? ' active' : ''}`}
                  aria-label={`Step ${num}: ${s.label}`}>
                  {isDone ? <CheckIcon /> : num}
                </div>
                <span className={`step-name${isDone ? ' done' : ''}${isActive ? ' active' : ''}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div className="reg-error" role="alert" style={{ marginBottom: '16px' }}>
            <AlertIcon /> {error}
          </div>
        )}

        {/* ── STEP 1: Basic Information ── */}
        {step === 1 && (
          <div className="reg-form">
            <p className="step-intro">
              Tell us about your institution. This is how it will appear across EK-SMS —
              on reports, dashboards, and certificates.
            </p>

            {/* School Badge Upload */}
            <div className="form-field">
              <label>School Badge / Logo <span className="field-tag">Optional</span></label>
              <LogoUpload
                preview={badgePreview}
                inputRef={badgeInputRef}
                onChange={handleBadgeChange}
                onRemove={removeBadge}
              />
            </div>

            <Field id="institutionName" label="Institution Name" required error={fieldErrors.institutionName}>
              <div className="input-wrap">
                <span className="input-icon"><BuildingIcon /></span>
                <input id="institutionName" className={`reg-input with-icon${fieldErrors.institutionName ? ' has-error' : ''}`} type="text"
                  placeholder="e.g. Greenfield Academy"
                  value={form.institutionName} onChange={set('institutionName')} onBlur={blur('institutionName')} autoFocus />
              </div>
            </Field>

            <Field id="institutionType" label="Institution Type" required error={fieldErrors.institutionType}>
              <select id="institutionType" className={`reg-select${fieldErrors.institutionType ? ' has-error' : ''}`}
                value={form.institutionType} onChange={set('institutionType')} onBlur={blur('institutionType')}>
                <option value="">Select type...</option>
                {INSTITUTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>

            <Field id="registrationNumber" label="Government Registration Number"
              hint="Helps verify your institution as an official school.">
              <div className="input-wrap">
                <span className="input-icon"><HashIcon /></span>
                <input id="registrationNumber" className="reg-input with-icon" type="text"
                  placeholder="e.g. EDU-SL-2024-00123"
                  value={form.registrationNumber} onChange={set('registrationNumber')} />
              </div>
            </Field>

            <div className="reg-form-grid">
              <Field id="established" label="Year Established">
                <select id="established" className="reg-select"
                  value={form.established} onChange={set('established')}>
                  <option value="">Select year...</option>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>

              <Field id="estimatedTeachers" label="Est. Number of Teachers" error={fieldErrors.estimatedTeachers}>
                <div className="input-wrap">
                  <span className="input-icon"><UsersIcon /></span>
                  <input id="estimatedTeachers" className="reg-input with-icon" type="number"
                    min="1" placeholder="e.g. 40"
                    value={form.estimatedTeachers} onChange={set('estimatedTeachers')} onBlur={blur('estimatedTeachers')} />
                </div>
              </Field>
            </div>

            <Field id="motto" label="School Motto">
              <input id="motto" className="reg-input" type="text"
                placeholder="e.g. Excellence in Education"
                value={form.motto} onChange={set('motto')} />
            </Field>

            {/* Brand Colors — multi-select */}
            <div className="form-field">
              <label>
                School Branding Colours
                <span className="field-tag">Used in portal, dashboards &amp; report cards</span>
              </label>
              <p className="input-hint" style={{ marginBottom: 8 }}>
                Type a colour name and press Enter, or click <strong>Choose</strong> to pick from the palette.
              </p>
              <BrandColorPicker
                value={form.brandColors}
                onChange={(v) => setForm((p) => ({ ...p, brandColors: v }))}
              />
            </div>
          </div>
        )}

        {/* ── STEP 2: Location ── */}
        {step === 2 && (
          <div className="reg-form">
            <p className="step-intro">
              Where is your institution located? This helps with directory listings and reports.
            </p>
            <Field id="address" label="Street Address" required error={fieldErrors.address}>
              <div className="input-wrap">
                <span className="input-icon"><LocationIcon /></span>
                <input id="address" className={`reg-input with-icon${fieldErrors.address ? ' has-error' : ''}`} type="text"
                  placeholder={getCountryMeta(form.country).address ? `e.g. ${getCountryMeta(form.country).address}` : 'e.g. 123 Main Street'}
                  value={form.address} onChange={set('address')} onBlur={blur('address')} autoFocus />
              </div>
            </Field>
            <div className="reg-form-grid">
              <Field id="city" label="City / Town" required error={fieldErrors.city}>
                {(() => {
                  const cities = getCountryMeta(form.country).cities || [];
                  if (cities.length === 0) {
                    return (
                      <input id="city" className={`reg-input${fieldErrors.city ? ' has-error' : ''}`} type="text"
                        placeholder="e.g. Capital City"
                        value={form.city} onChange={set('city')} onBlur={blur('city')} />
                    );
                  }
                  return (
                    <>
                      <select id="city" className={`reg-select${fieldErrors.city ? ' has-error' : ''}`}
                        value={cityOther ? 'other' : form.city}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === 'other') {
                            setCityOther(true);
                            setForm(p => ({ ...p, city: '' }));
                          } else {
                            setCityOther(false);
                            setForm(p => ({ ...p, city: v }));
                          }
                        }}
                        onBlur={blur('city')}>
                        <option value="">Select city / town…</option>
                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="other">Other (specify below)</option>
                      </select>
                      {cityOther && (
                        <input className={`reg-input${fieldErrors.city ? ' has-error' : ''}`} type="text"
                          placeholder="Type your city / town"
                          value={form.city} onChange={set('city')} onBlur={blur('city')}
                          style={{ marginTop: '0.5rem' }} autoFocus />
                      )}
                    </>
                  );
                })()}
              </Field>
              <Field id="region" label="Region / State">
                <input id="region" className="reg-input" type="text"
                  placeholder={getCountryMeta(form.country).region || 'e.g. Central Region'}
                  value={form.region} onChange={set('region')} />
              </Field>
            </div>
            <Field id="country" label="Country" required error={fieldErrors.country}>
              <select id="country" className={`reg-select${fieldErrors.country ? ' has-error' : ''}`} value={form.country}
                onChange={(e) => {
                  const c = e.target.value;
                  const meta = getCountryMeta(c);
                  setCityOther(false);
                  setForm((p) => ({
                    ...p,
                    country:        c,
                    city:           '',
                    phoneCode:      meta.dial || p.phoneCode,
                    adminPhoneCode: meta.dial || p.adminPhoneCode,
                  }));
                }}
                onBlur={blur('country')}>
                <option value="">Select country</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {autoDetectedCountry && form.country === autoDetectedCountry && (
                <p className="country-auto-note">📍 Auto-detected from your timezone — change if incorrect</p>
              )}
            </Field>
          </div>
        )}

        {/* ── STEP 3: Contact ── */}
        {step === 3 && (
          <div className="reg-form">
            <p className="step-intro">
              Provide your institution's official contact details for communication and verification.
            </p>
            <Field id="phoneNumber" label="Phone Number" required error={fieldErrors.phoneNumber}>
              <PhoneInput
                id="phoneNumber"
                codeValue={form.phoneCode}
                numberValue={form.phoneNumber}
                onCodeChange={(v) => setForm((p) => ({ ...p, phoneCode: v }))}
                onNumberChange={(v) => { setForm((p) => ({ ...p, phoneNumber: v })); setFieldErrors((p) => ({ ...p, phoneNumber: v.length > 0 && v.length < 6 ? 'Must be at least 6 digits.' : null })); }}
                placeholder={getCountryMeta(form.country).phone || '00 000 0000'}
              />
            </Field>
            <Field id="email" label="Institutional Email" required error={fieldErrors.email}>
              <div className="input-wrap">
                <span className="input-icon"><MailIcon /></span>
                <input id="email" className={`reg-input with-icon${fieldErrors.email ? ' has-error' : ''}`} type="email"
                  placeholder={`info@yourschool.${getCountryMeta(form.country).emailDomain || 'edu'}`}
                  value={form.email} onChange={set('email')} onBlur={blur('email')} />
              </div>
            </Field>
            <Field id="website" label="Website" hint="Optional — include https://...">
              <div className="input-wrap">
                <span className="input-icon"><GlobeIcon /></span>
                <input id="website" className="reg-input with-icon" type="url"
                  placeholder={`https://yourschool.${getCountryMeta(form.country).emailDomain || 'edu'}`}
                  value={form.website} onChange={set('website')} />
              </div>
            </Field>
          </div>
        )}

        {/* ── STEP 4: Admin Account ── */}
        {step === 4 && (
          <div className="reg-form">
            <p className="step-intro">
              Create the primary administrator account. This person will have full access
              to manage your institution on EK-SMS.
            </p>

            <div className="reg-form-grid">
              <Field id="firstName" label="First Name" required error={fieldErrors.firstName}>
                <div className="input-wrap">
                  <span className="input-icon"><AdminIcon /></span>
                  <input id="firstName" className={`reg-input with-icon${fieldErrors.firstName ? ' has-error' : ''}`} type="text"
                    placeholder="Amara" value={form.firstName} onChange={set('firstName')} onBlur={blur('firstName')} autoFocus />
                </div>
              </Field>
              <Field id="lastName" label="Last Name" required error={fieldErrors.lastName}>
                <div className="input-wrap">
                  <span className="input-icon"><AdminIcon /></span>
                  <input id="lastName" className={`reg-input with-icon${fieldErrors.lastName ? ' has-error' : ''}`} type="text"
                    placeholder="Kamara" value={form.lastName} onChange={set('lastName')} onBlur={blur('lastName')} />
                </div>
              </Field>
            </div>

            <Field id="adminUsername" label="Admin Username" required
              hint="3–30 characters: letters, numbers, _ or -. Used to sign in."
              error={fieldErrors.adminUsername}>
              <div className="input-wrap">
                <span className="input-icon"><AdminIcon /></span>
                <input id="adminUsername" className={`reg-input with-icon${fieldErrors.adminUsername ? ' has-error' : ''}`} type="text"
                  placeholder="e.g. amara_kamara"
                  value={form.adminUsername} onChange={set('adminUsername')} onBlur={blur('adminUsername')}
                  autoComplete="username" />
              </div>
            </Field>

            <Field id="adminEmail" label="Admin Email" required error={fieldErrors.adminEmail}>
              <div className="input-wrap">
                <span className="input-icon"><MailIcon /></span>
                <input id="adminEmail" className={`reg-input with-icon${fieldErrors.adminEmail ? ' has-error' : ''}`} type="email"
                  placeholder={`admin@yourschool.${getCountryMeta(form.country).emailDomain || 'edu'}`}
                  value={form.adminEmail} onChange={set('adminEmail')} onBlur={blur('adminEmail')} autoComplete="email" />
              </div>
              {adminEmailDomainWarning && (
                <div className="field-warning" role="alert">
                  <WarnIcon />
                  Admin email uses a public domain (@{adminEmailDomainWarning}).
                  Using your school's official email is recommended for professional use.
                </div>
              )}
            </Field>

            <Field id="adminPhoneNumber" label="Admin Phone Number" required
              hint="Used for two-factor authentication and account recovery."
              error={fieldErrors.adminPhoneNumber}>
              <PhoneInput
                id="adminPhoneNumber"
                codeValue={form.adminPhoneCode}
                numberValue={form.adminPhoneNumber}
                onCodeChange={(v) => setForm((p) => ({ ...p, adminPhoneCode: v }))}
                onNumberChange={(v) => { setForm((p) => ({ ...p, adminPhoneNumber: v })); setFieldErrors((p) => ({ ...p, adminPhoneNumber: v.length > 0 && v.length < 6 ? 'Must be at least 6 digits.' : null })); }}
                placeholder={getCountryMeta(form.country).phone || '00 000 0000'}
              />
            </Field>

            <Field id="password" label="Password" required error={fieldErrors.password}>
              <div className="input-wrap">
                <span className="input-icon"><LockIcon /></span>
                <input id="password" type={showPwd ? 'text' : 'password'}
                  className={`reg-input with-icon with-toggle${fieldErrors.password ? ' has-error' : ''}`}
                  placeholder="Min. 8 characters"
                  value={form.password} onChange={set('password')} onBlur={blur('password')} autoComplete="new-password" />
                <button type="button" className="input-toggle"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}>
                  {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </Field>

            <Field id="confirmPassword" label="Confirm Password" required
              hint="Use uppercase, lowercase, numbers and a symbol."
              error={fieldErrors.confirmPassword}>
              <div className="input-wrap">
                <span className="input-icon"><LockIcon /></span>
                <input id="confirmPassword" type={showConfirm ? 'text' : 'password'}
                  className={`reg-input with-icon with-toggle${fieldErrors.confirmPassword ? ' has-error' : ''}`}
                  placeholder="Re-enter password"
                  value={form.confirmPassword} onChange={set('confirmPassword')} onBlur={blur('confirmPassword')} autoComplete="new-password" />
                <button type="button" className="input-toggle"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {form.confirmPassword && (
                <div className={`pwd-match${form.password === form.confirmPassword ? ' pwd-match--ok' : ' pwd-match--err'}`}>
                  {form.password === form.confirmPassword
                    ? <><CheckIcon /> Passwords match</>
                    : <>✕ Passwords do not match</>
                  }
                </div>
              )}
            </Field>

            {/* 2FA Option */}
            <div className="tfa-option">
              <input type="checkbox" id="enable2FA" checked={form.enable2FA}
                onChange={setChk('enable2FA')} />
              <label htmlFor="enable2FA" className="tfa-option-label">
                <div className="tfa-option-title">
                  <ShieldIcon />
                  Enable Two-Factor Authentication
                  <span className="tfa-badge">Recommended</span>
                </div>
                <p className="tfa-option-desc">
                  Adds an extra layer of security using your phone number. You will receive
                  a verification code each time you sign in.
                </p>
              </label>
            </div>
          </div>
        )}

        {/* ── STEP 5: School Settings ── */}
        {step === 5 && (
          <div className="reg-form">
            <p className="step-intro">
              Configure how EK-SMS operates for your institution. These can be updated later
              from your admin dashboard.
            </p>
            <Field id="capacity" label="Student Capacity"
              hint="Approximate maximum number of enrolled students">
              <div className="input-wrap">
                <span className="input-icon"><UsersIcon /></span>
                <input id="capacity" className="reg-input with-icon" type="number"
                  min="1" placeholder="1000"
                  value={form.capacity} onChange={set('capacity')} autoFocus />
              </div>
            </Field>
            <Field id="academicSystem" label="Academic System">
              <select id="academicSystem" className="reg-select"
                value={form.academicSystem} onChange={set('academicSystem')}>
                {ACADEMIC_SYSTEMS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field id="gradingSystem" label="Grading System">
              <select id="gradingSystem" className="reg-select"
                value={form.gradingSystem} onChange={set('gradingSystem')}>
                {GRADING_SYSTEMS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </Field>
            <Field id="language" label="Primary Language of Instruction">
              <select id="language" className="reg-select"
                value={form.language} onChange={set('language')}>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
          </div>
        )}

        {/* ── STEP 6: Legal & Compliance ── */}
        {step === 6 && (
          <div className="reg-form">
            <p className="step-intro">
              EK-SMS handles sensitive student records. Please review and confirm the
              following before proceeding.
            </p>

            <div className="legal-checks">
              <label className={`legal-check-item${form.agreementAccuracy ? ' checked' : ''}`}>
                <input type="checkbox" checked={form.agreementAccuracy}
                  onChange={setChk('agreementAccuracy')} />
                <div className="legal-check-text">
                  <strong>Accuracy of Information</strong>
                  <span>I confirm that the school information provided in this registration
                    is accurate and complete to the best of my knowledge.</span>
                </div>
              </label>

              <label className={`legal-check-item${form.agreementDataProtection ? ' checked' : ''}`}>
                <input type="checkbox" checked={form.agreementDataProtection}
                  onChange={setChk('agreementDataProtection')} />
                <div className="legal-check-text">
                  <strong>Data Protection Agreement</strong>
                  <span>I agree to protect all student, staff, and parent data stored
                    in EK-SMS in accordance with applicable data protection laws and
                    EK-SMS platform policies.</span>
                </div>
              </label>

              <label className={`legal-check-item${form.agreementAuthorized ? ' checked' : ''}`}>
                <input type="checkbox" checked={form.agreementAuthorized}
                  onChange={setChk('agreementAuthorized')} />
                <div className="legal-check-text">
                  <strong>Authorization Confirmation</strong>
                  <span>I confirm that I am an authorised representative of this institution
                    and have the authority to register it on EK-SMS.</span>
                </div>
              </label>
            </div>

            <p className="terms-note" style={{ marginTop: '20px' }}>
              By proceeding you also agree to the EK-SMS{' '}
              <button type="button" className="terms-link-btn"
                onClick={() => setLegalModal('terms')}>
                Terms of Service
              </button>{' '}and{' '}
              <button type="button" className="terms-link-btn"
                onClick={() => setLegalModal('privacy')}>
                Privacy Policy
              </button>.
            </p>
          </div>
        )}

        {/* ── STEP 7: Verify Email ── */}
        {step === 7 && (
          <div className="reg-form">
            <p className="step-intro">
              We sent a 6-digit verification code to{' '}
              <strong style={{ color: '#0dccf2' }}>{form.adminEmail}</strong>.
              Enter it below to confirm your email address.
            </p>

            {/* Sending state */}
            {otpLoading && !otpSent && (
              <div className="otp-send-wrap">
                <span className="spin" style={{ width: 22, height: 22 }} />
                <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: 12 }}>Sending code…</p>
              </div>
            )}

            {/* Send failed / service unavailable */}
            {!otpLoading && !otpSent && otpError && (
              <div className="otp-unavailable">
                <p className="otp-unavailable-msg">{otpError}</p>
                <button type="button" className="btn-send-otp" onClick={sendOtp} disabled={otpLoading}>
                  Try Again
                </button>
                <div className="otp-skip-wrap">
                  <button type="button" className="btn-otp-skip"
                    onClick={() => { setOtpSkipped(true); setOtpError(''); }}>
                    Skip verification and continue →
                  </button>
                  <p className="otp-skip-warning">⚠ Your email will remain unverified</p>
                </div>
              </div>
            )}

            {/* OTP sent — show input */}
            {otpSent && !otpVerified && (
              <>
                <div className="otp-input-wrap">
                  <label className="otp-label" htmlFor="otpInput">Verification Code</label>
                  <input
                    id="otpInput"
                    className="reg-input otp-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={otpInput}
                    onChange={(e) => { setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                  />
                  {otpError && <p className="field-error" role="alert">{otpError}</p>}
                </div>
                <div className="otp-actions">
                  <button type="button" className="btn-verify-otp"
                    onClick={verifyOtp} disabled={otpLoading || otpInput.length !== 6}>
                    {otpLoading ? <><span className="spin" /> Verifying…</> : 'Verify Code'}
                  </button>
                  <button type="button" className="btn-resend-otp"
                    onClick={resendOtp} disabled={otpResendTimer > 0 || otpLoading}>
                    {otpResendTimer > 0 ? `Resend in ${otpResendTimer}s` : 'Resend Code'}
                  </button>
                </div>
                <div className="otp-skip-wrap">
                  <button type="button" className="btn-otp-skip"
                    onClick={() => { setOtpSkipped(true); setOtpError(''); }}>
                    Skip verification →
                  </button>
                  <p className="otp-skip-warning">⚠ Your email will remain unverified</p>
                </div>
              </>
            )}

            {/* Verified */}
            {otpVerified && (
              <div className="otp-verified-badge">
                <CheckIcon /> Email verified — you can continue to review your registration.
              </div>
            )}

            {/* Skipped */}
            {otpSkipped && !otpVerified && (
              <div className="otp-skipped-badge">
                ⚠ Verification skipped. You can continue, but your email is unverified.
              </div>
            )}
          </div>
        )}

        {/* ── STEP 8: Review ── */}
        {step === 8 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: 10 }}>
              <p className="step-intro" style={{ margin: 0 }}>
                Review your information carefully before submitting. Go back to any step to make changes.
              </p>
              <button
                type="button"
                className="reg-pdf-btn"
                onClick={() => window.print()}
                title="Download review as PDF"
              >
                <DownloadIcon /> Download PDF
              </button>
            </div>

            {/* Print-only header — hidden on screen */}
            <div className="reg-print-header">
              {badgePreview && <img src={badgePreview} alt="School badge" className="reg-print-logo" />}
              <div>
                <h1 className="reg-print-title">{form.institutionName || 'Institution Registration'}</h1>
                <p className="reg-print-sub">EK-SMS Registration Review — {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            <ReviewSection title="Basic Information" icon={<InfoIcon />}>
              {badgePreview && (
                <div className="review-badge-row">
                  <img src={badgePreview} alt="School badge" className="review-badge" />
                  <span className="review-badge-label">Badge uploaded</span>
                </div>
              )}
              <ReviewRow label="Institution Name"    value={form.institutionName} />
              <ReviewRow label="Type"                value={form.institutionType} />
              <ReviewRow label="Reg. Number"         value={form.registrationNumber || '—'} />
              <ReviewRow label="Established"         value={form.established || '—'} />
              <ReviewRow label="Est. Teachers" value={form.estimatedTeachers || '—'} />
              <ReviewRow label="Motto"          value={form.motto || '—'} />
              <div className="review-row">
                <span className="review-label">Brand Colours</span>
                <span className="review-value" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                  {form.brandColors.length === 0 ? '—' : form.brandColors.map((c) => (
                    <span key={c} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className="review-color-dot" style={{ background: c }} />
                      <span style={{ fontSize: '0.8rem' }}>{c}</span>
                    </span>
                  ))}
                </span>
              </div>
            </ReviewSection>

            <ReviewSection title="Location" icon={<LocationIcon />}>
              <ReviewRow label="Address" value={form.address} />
              <ReviewRow label="City"    value={form.city} />
              <ReviewRow label="Region"  value={form.region || '—'} />
              <ReviewRow label="Country" value={form.country} />
            </ReviewSection>

            <ReviewSection title="Contact" icon={<ContactIcon />}>
              <ReviewRow label="Phone"   value={`${form.phoneCode} ${form.phoneNumber}`} />
              <ReviewRow label="Email"   value={form.email} />
              <ReviewRow label="Website" value={form.website || '—'} muted={!form.website} />
            </ReviewSection>

            <ReviewSection title="Administrator" icon={<AdminIcon />}>
              <ReviewRow label="Name"     value={`${form.firstName} ${form.lastName}`} />
              <ReviewRow label="Username" value={form.adminUsername} />
              <ReviewRow label="Email"    value={form.adminEmail} />
              <ReviewRow label="Phone"    value={`${form.adminPhoneCode} ${form.adminPhoneNumber}`} />
              <ReviewRow label="2FA"      value={form.enable2FA ? 'Enabled' : 'Disabled'} />
            </ReviewSection>

            <ReviewSection title="School Settings" icon={<SettingsIcon />}>
              <ReviewRow label="Capacity"       value={`${form.capacity} students`} />
              <ReviewRow label="Academic System" value={ACADEMIC_SYSTEMS.find(s => s.value === form.academicSystem)?.label} />
              <ReviewRow label="Grading"        value={GRADING_SYSTEMS.find(g => g.value === form.gradingSystem)?.label} />
              <ReviewRow label="Language"       value={form.language} />
            </ReviewSection>

            <ReviewSection title="Legal & Compliance" icon={<LegalIcon />}>
              <ReviewRow label="Accuracy"        value="Confirmed" />
              <ReviewRow label="Data Protection" value="Agreed" />
              <ReviewRow label="Authorization"   value="Confirmed" />
            </ReviewSection>
          </div>
        )}

        {/* Navigation */}
        <div className={`reg-nav${step === 1 ? ' solo' : ''}`}>
          {step > 1 ? (
            <button type="button" className="btn-back" onClick={back}>
              <ArrowLeftIcon /> Back
            </button>
          ) : (
            <div />
          )}

          {step < STEPS.length ? (
            <button type="button" className="btn-next" onClick={next}
              disabled={checkingName || (step === 7 && !otpVerified && !otpSkipped)}>
              {checkingName
                ? <><span className="spin" /> Checking…</>
                : <>Continue <ArrowRightIcon /></>
              }
            </button>
          ) : (
            <button type="button" className="btn-submit" onClick={handleSubmit}
              disabled={isLoading}>
              {isLoading
                ? <><span className="spin" /> Submitting…</>
                : <><ReviewIcon /> Submit Registration</>
              }
            </button>
          )}
        </div>
      </div>

      <p className="reg-footer-signin">
        Already have an account?{' '}
        <button type="button" onClick={() => onNavigate && onNavigate('login')}>Sign in here</button>
      </p>
      <p className="reg-footer">© 2026  ·  EL-KENDEH School Management System (EK-SMS).</p>

      {/* Legal modals */}
      {legalModal && (
        <LegalModal tab={legalModal} onClose={() => setLegalModal(null)} />
      )}

      {/* Leave warning */}
      {showLeaveWarning && (
        <LeaveModal
          onStay={() => setShowLeaveWarning(false)}
          onLeave={() => { setShowLeaveWarning(false); onNavigate && onNavigate('home'); }}
        />
      )}
    </div>
  );
}

/* ================================================================
   Sub-components for Review step
   ================================================================ */
function ReviewSection({ title, icon, children }) {
  return (
    <div className="review-section">
      <div className="review-section-header">
        <span className="review-section-icon">{icon}</span>
        <h3 className="review-section-title">{title}</h3>
      </div>
      <div className="review-rows">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value, muted }) {
  return (
    <div className="review-row">
      <span className="review-label">{label}</span>
      <span className={`review-value${muted ? ' muted' : ''}`}>{value}</span>
    </div>
  );
}

export default Register;
