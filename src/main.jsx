import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import {supabase} from './lib/supabase.js';
import {installTeacherNativeAuthListener,isTeacherNative} from './lib/nativeGoogleOAuth.js';

if(isTeacherNative()&&supabase){
 installTeacherNativeAuthListener(supabase.auth).catch(error=>{
  window.dispatchEvent(new CustomEvent('qlpm-native-oauth-error',{detail:{message:error?.message||String(error)}}));
 });
}

import "./style.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><App /></React.StrictMode>
);
