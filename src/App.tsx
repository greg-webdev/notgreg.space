import React from 'react';
import './App.css';
import LightPillar from './LightPillar';

function App() {
  return (
    <div className="page">
      <div className="pillar-bg">
        <div className="pillar-frame">
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

      <div className="banner">
        <span className="banner-label">Happy Birthday Mom!</span>
      </div>

      <main className="content">
        <p className="eyebrow">NOTGREG.SPACE</p>
        <h1>Welcome to Greg's Homepage</h1>
        <div className="about">
          <p>Hi, I'm Greg, 13 years old.</p>
          <p>I like coding for fun!</p>
        </div>
        <div className="actions">
          <button className="cta cta-primary" onClick={() => { window.location.href = '/about'; }}>
            Learn More About Me
          </button>
          <button className="cta" onClick={() => { window.location.href = '/happybirthdaymom'; }}>
            Birthday Page
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
