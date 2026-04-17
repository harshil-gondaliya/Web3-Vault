"use client";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { AuthProvider } from "../context/AuthContext";

export default function ClientLayout({ children }) {
  return (
    <AuthProvider>
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <Topbar />
          <main className="page-content">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
