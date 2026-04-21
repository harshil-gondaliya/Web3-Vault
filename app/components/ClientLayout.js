"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { AuthProvider } from "../context/AuthContext";

export default function ClientLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <AuthProvider>
      <div className="app-container">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <div
          className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
          onClick={closeSidebar}
          aria-hidden="true"
        />
        <div className="main-content">
          <Topbar onMenuClick={() => setSidebarOpen((prev) => !prev)} />
          <main className="page-content">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
