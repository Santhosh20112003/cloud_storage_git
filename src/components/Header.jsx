import React from 'react';
import { useGithub } from '../context/GithubContext';
import { 
  Plus, Link as LinkIcon, Info, Mail, Bell
} from 'lucide-react';

const Header = () => {
  const { user } = useGithub();
  return (
    <header className="header">
      <div className="header-greeting">
        <h2>Welcome back, {user?.name?.split(' ')[0] || user?.login}!</h2>
        <p>Your files are safe, organized, and always accessible.</p>
      </div>
      
      {/* <div className="header-actions">
        <div className="team-avatars">
           <img src="https://i.pravatar.cc/150?u=1" alt="team" />
           <img src="https://i.pravatar.cc/150?u=2" alt="team" />
           <img src="https://i.pravatar.cc/150?u=3" alt="team" />
           <div className="avatar-more">+24</div>
        </div>
        <button className="btn-primary invite-btn">
          <Plus size={18} />
          Invite
        </button>
        <button className="icon-btn"><LinkIcon size={18} /></button>
        <button className="icon-btn"><Info size={18} /></button>
        <button className="icon-btn"><Mail size={18} /></button>
        <button className="icon-btn relative">
          <Bell size={18} />
          <span className="badge-dot" />
        </button>
      </div> */}
    </header>
  );
};

export default Header;
