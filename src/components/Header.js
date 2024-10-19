import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../firebase';

const Header = () => {
  const { currentUser } = useAuth();

  return (
    <nav>
      {currentUser && (
        <>
          <Link to="/feed">Feed</Link>
          <Link to="/create">Write Post</Link>
          <button onClick={signOut}>Sign Out</button>
        </>
      )}
    </nav>
  );
};

export default Header;
