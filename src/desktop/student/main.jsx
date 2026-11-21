import React from 'react';
import {createRoot} from 'react-dom/client';
import StudentDesktop from './StudentDesktop.jsx';
import StudentErrorBoundary from './StudentErrorBoundary.jsx';
import './studentDesktop.css';

createRoot(document.getElementById('qlpm-student-root')).render(
  <React.StrictMode><StudentErrorBoundary><StudentDesktop/></StudentErrorBoundary></React.StrictMode>
);
