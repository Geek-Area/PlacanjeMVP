import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => (
  <footer className="mt-8 text-center text-gray-400 text-xs space-y-1">
    <div>
      Placanje.RS &copy; 2026 &middot;{' '}
      <Link to="/api" className="text-gray-500 hover:text-blue-600 underline">
        API dokumentacija
      </Link>
    </div>
    <div>
      Podržano od strane{' '}
      <a
        href="https://hub.geekarea.net/t/placanje-rs/82"
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-500 hover:text-blue-600 underline"
      >
        Geek Area
      </a>
    </div>
  </footer>
);

export default Footer;
