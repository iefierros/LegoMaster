import { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, FolderOpen, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface UserMenuProps {
  onOpenProjects: () => void;
  onOpenSettings?: () => void;
}

export function UserMenu({ onOpenProjects, onOpenSettings }: UserMenuProps) {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  // Get initials for avatar
  const getInitials = () => {
    if (user.displayName) {
      return user.displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
      >
        {/* Avatar */}
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName || user.email}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-lego-yellow text-black flex items-center justify-center font-semibold text-sm">
            {getInitials()}
          </div>
        )}

        {/* Name */}
        <span className="text-white text-sm hidden md:block max-w-[120px] truncate">
          {user.displayName || user.email.split('@')[0]}
        </span>

        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-2 z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="font-semibold text-white truncate">
              {user.displayName || 'User'}
            </p>
            <p className="text-sm text-gray-400 truncate">{user.email}</p>
          </div>

          {/* Menu items */}
          <div className="py-2">
            <button
              onClick={() => {
                onOpenProjects();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-gray-700 transition"
            >
              <FolderOpen size={18} />
              My Projects
            </button>

            {onOpenSettings && (
              <button
                onClick={() => {
                  onOpenSettings();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-gray-700 transition"
              >
                <Settings size={18} />
                Settings
              </button>
            )}
          </div>

          {/* Sign out */}
          <div className="border-t border-gray-700 pt-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-gray-700 transition"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
