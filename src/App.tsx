import React from 'react';
import './App.css';
import LightPillar from './LightPillar';

function App() {
  return (
    <div className="page">
      <div className="pillar-bg">
        <div style={{ width: '1080px', height: '1080px', position: 'relative' }}>
          <LightPillar
            topColor="#5227FF"
            bottomColor="#FF9FFC"
            intensity={1.0}
            rotationSpeed={0.3}
            interactive={false}
            glowAmount={0.005}
            pillarWidth={3.0}
            pillarHeight={0.4}
            noiseIntensity={0.5}
            mixBlendMode="screen"
            pillarRotation={0}
            quality="high"
          />
        </div>
      </div>

      <div className="banner">Happy Birthday Mom!</div>

      <main className="content">
        <h1>Welcome to Greg's Homepage</h1>
        <div className="about">
          <p>Hi, I'm Greg, 13 years old.</p>
          <p>I like coding for fun!</p>
        </div>
        <button className="cta" onClick={() => { window.location.href = '/about'; }}>
          Learn More About Me
        </button>
      </main>
    </div>
  );
}

export default App;
