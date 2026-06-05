import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, Users, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '../../../modules/auth/store/useAuthStore';

interface SidebarProps {
  isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const logout = useAuthStore((state) => state.logout);

  const navItems = [
    { name: 'Dashboard', path: '/logistica/dashboard', icon: LayoutDashboard },
    { name: 'Rutas y Mapa', path: '/logistica/rutas', icon: Map },
    { name: 'Registro y Asignación', path: '/logistica/registro', icon: Users },
    { name: 'Configuración', path: '/configuracion', icon: Settings },
  ];

  return (
    <aside
      className={`bg-gradient-to-b from-[#001E40] to-[#001228] text-white flex flex-col transition-all duration-300 ease-in-out ${
        isOpen ? 'w-64' : 'w-20'
      } h-full shadow-xl relative z-20`}
    >
      <div className="flex items-center h-16 border-b border-white/10 px-4 gap-3 overflow-hidden">
        <img
          src="/logo.svg"
          alt="Venaris Route AI"
          className="w-8 h-8 flex-shrink-0 object-contain brightness-0 invert"
        />
        {isOpen && (
          <div className="flex flex-col leading-tight overflow-hidden">
            <span className="text-[10px] font-bold tracking-[0.25em] text-amber-400 uppercase whitespace-nowrap">
              Industrias Venaris
            </span>
            <span className="text-sm font-bold text-white whitespace-nowrap">Route AI</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1.5 px-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `group flex items-center gap-4 py-3 pr-3 pl-[10px] rounded-lg transition-all duration-200 overflow-hidden border-l-2 ${
                    isActive
                      ? 'bg-white/10 border-amber-400 text-white font-semibold'
                      : 'border-transparent text-slate-300 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`w-6 h-6 flex-shrink-0 transition-colors ${
                        isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-white'
                      }`}
                    />
                    <span
                      className={`whitespace-nowrap transition-opacity duration-300 ${
                        isOpen ? 'opacity-100' : 'opacity-0 hidden'
                      }`}
                    >
                      {item.name}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-venaris-tertiary/80 w-full rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isOpen && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
};
