// src/pages/LandingPage.jsx

import React from 'react';

const LandingPage = () => {
  const handleStartClick = () => {
    alert('Start clicked!');
    // navigate or open another page here
  };

  const handleLearnMoreClick = () => {
    alert('Learn More clicked!');
    // open external link or scroll to section
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Welcome to TBS</h1>
      <div style={styles.buttonContainer}>
        <button style={styles.button} onClick={handleStartClick}>Get Started</button>
        <button style={styles.buttonOutline} onClick={handleLearnMoreClick}>Learn More</button>
      </div>
    </div>
  );
};

    const styles = {
        container: {
          height: '100vh',
          width: '100vw',
          background: '#f0f4f8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        },
        title: {
          fontSize: '2rem',
          marginBottom: '3rem',
        },
        buttonContainer: {
          display: 'flex',
          gap: '2rem',
        },
        button: {
          width: '200px',            // fixed width
          height: '120px',           // fixed height
          background: '#1d4ed8',
          color: '#fff',
          border: 'none',
          borderRadius: '16px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '1.5rem',
          boxShadow: '0 8px 15px rgba(29, 78, 216, 0.3)',  // shadow for card effect
          transition: 'transform 0.2s',
        },
        buttonOutline: {
          width: '200px',
          height: '120px',
          background: 'transparent',
          color: '#1d4ed8',
          border: '3px solid #1d4ed8',
          borderRadius: '16px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '1.5rem',
          boxShadow: '0 8px 15px rgba(29, 78, 216, 0.1)',
          transition: 'transform 0.2s',
        },
      };
      
export default LandingPage;
