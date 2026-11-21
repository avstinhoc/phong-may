import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./style.css";

// Student Web is a separate, lazy-loaded React tree. No Teacher session/profile
// requests run on /student-web, keeping startup lightweight on classroom PCs.
const StudentWeb=React.lazy(()=>import("./student-web/StudentWeb.jsx"));
const StudentErrorBoundary=React.lazy(()=>import("./student-web/StudentErrorBoundary.jsx"));
const studentPath=window.location.pathname==="/student-web";
ReactDOM.createRoot(document.getElementById("root")).render(
 <React.StrictMode>
  {studentPath?<React.Suspense fallback={<div className="center-screen">Đang mở Student Web...</div>}>
    <StudentErrorBoundary><StudentWeb/></StudentErrorBoundary>
   </React.Suspense>:<App/>}
 </React.StrictMode>
);
