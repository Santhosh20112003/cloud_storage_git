import React from 'react';
import { useGithub } from '../context/GithubContext';
import { FaBell, FaSearch, FaUserCircle } from 'react-icons/fa';

const Header = () => {
  const { user } = useGithub();
  
  return (
    <header className="px-6 lg:px-10 py-6 flex items-center justify-between bg-white border-b border-slate-100">
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          Welcome back, {user?.displayName?.split(' ')[0] || user?.name?.split(' ')[0] || user?.login}!
        </h2>
        <p className="text-sm font-bold text-slate-400 italic">Your secure cloud storage is ready.</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl group focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
          <FaSearch className="text-slate-300 group-focus-within:text-blue-500" size={14} />
          <input 
            type="text" 
            placeholder="Search commands..." 
            className="bg-transparent border-none outline-none text-xs font-bold text-slate-600 placeholder:text-slate-300 w-40"
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 rounded-2xl transition-all relative group">
            <FaBell size={18} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
          </button>
          
          <div className="h-8 w-px bg-slate-100 mx-2"></div>
          
          <button className="flex items-center gap-3 pl-2 pr-4 py-1.5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-sm transition-all group">
            {user?.photoURL || user?.avatar_url ? (
              <img 
                src={user?.photoURL || user?.avatar_url} 
                alt="profile" 
                className="w-8 h-8 rounded-xl object-cover ring-2 ring-white shadow-sm" 
              />
            ) : (
              <FaUserCircle size={32} className="text-slate-300" />
            )}
            <div className="text-left hidden sm:block">
              <p className="text-xs font-black text-slate-700 leading-none">{user?.displayName || user?.login}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pro Member</p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
