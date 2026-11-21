import React from "react";
import ReactDOM from "react-dom/client";
import "./style.css";

// Student Web is a separate, lazy-loaded React tree. No Teacher session/profile
// requests run on /student-web, keeping startup lightweight on classroom PCs.
const App=React.lazy(()=>import("./App.jsx"));
const StudentWeb=React.lazy(()=>import("./student-web/StudentWeb.jsx"));
const StudentErrorBoundary=React.lazy(()=>import("./student-web/StudentErrorBoundary.jsx"));
const studentPath=window.location.pathname==="/student-web";
ReactDOM.createRoot(document.getElementById("root")).render(
 <React.StrictMode>
  <React.Suspense fallback={<div className="center-screen">Đang tải hệ thống...</div>}>
   {studentPath?<StudentErrorBoundary><StudentWeb/></StudentErrorBoundary>:<App/>}
  </React.Suspense>
 </React.StrictMode>
);
