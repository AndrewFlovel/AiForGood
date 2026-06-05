import React from 'react';
import { Menu, Bell, User } from 'lucide-react';
import { useAuthStore } from '../../../modules/auth/store/useAuthStore';

interface HeaderProps {
  toggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const username = useAuthStore((s) => s.username);

  return (
    <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10 relative">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-venaris-primary"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-semibold text-gray-800 hidden sm:block">
          Venaris Route AI — Logística Pro
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
        </button>

        <div className="flex items-center gap-3 border-l border-gray-200 pl-4 ml-2">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-sm font-medium text-gray-900">{username ?? 'Supervisor'}</span>
            <span className="text-xs text-gray-500">Industrias Venaris</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-venaris-primary flex items-center justify-center text-white font-semibold">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
};
