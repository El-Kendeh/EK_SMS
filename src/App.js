import React from 'react';
import './App.css';

function App() {
  const logoUrl = process.env.PUBLIC_URL + '/logo.jpeg';

  return (
    <div className="App plain-bg">
      <div className="logo-container">
        <img src={logoUrl} alt="logo" className="logo-zoom" />
      </div>
    </div>
  );
}

export default App;
