import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <h1>404</h1>
      <p>This website is currently down.</p>
      <button onClick={() => window.location.href='/happybirthdaymom'}>Happy Birthday Mom!</button>
    </div>
  );
}

export default App;