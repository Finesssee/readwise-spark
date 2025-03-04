import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '@/components/Header';
import AppSidebar from '@/components/AppSidebar';
import GlobalUploadButton from '@/components/GlobalUploadButton';
import { cn } from '@/lib/utils';

const Layout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Monitor for changes in sidebar collapsed state
  useEffect(() => {
    const updateCollapsedState = () => {
      const sidebarEl = document.querySelector('[data-collapsed]');
      if (sidebarEl) {
        const isCollapsed = sidebarEl.getAttribute('data-collapsed') === 'true';
        setIsSidebarCollapsed(isCollapsed);
      }
    };

    // Initial check
    updateCollapsedState();

    // Set up mutation observer to track changes to the data-collapsed attribute
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' && 
          mutation.attributeName === 'data-collapsed'
        ) {
          updateCollapsedState();
        }
      });
    });

    const sidebarEl = document.querySelector('[data-collapsed]');
    if (sidebarEl) {
      observer.observe(sidebarEl, { attributes: true });
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="flex h-screen bg-background hardware-accelerated">
      {/* Sidebar */}
      <div 
        id="sidebar-container" 
        className={cn(
          "h-full flex-shrink-0 transition-all duration-150 ease-out",
          isSidebarCollapsed ? "w-16" : "w-64"
        )}
        style={{ 
          transform: 'translateZ(0)',
          willChange: 'width' 
        }}
      >
        <AppSidebar />
      </div>
      
      {/* Main content */}
      <div 
        className="flex-grow flex flex-col overflow-auto transition-all duration-150 ease-out"
        style={{ transform: 'translateZ(0)' }}
      >
        <Header />
        <main className="flex-grow overflow-auto">
          <Outlet />
        </main>
        <GlobalUploadButton />
      </div>
    </div>
  );
};

export default Layout; 