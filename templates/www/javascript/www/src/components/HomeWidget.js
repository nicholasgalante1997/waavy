import React, { useEffect, useRef } from 'react';

const HomeWidget = () => {
  const heroRef = useRef();

  useEffect(() => {
    if (heroRef.current) {
      heroRef.current.style.animation = 'fadeInUp 1s ease-out forwards';
    }
  }, []);

  return (
    <div className="hero" ref={heroRef}>
      <h1 className="title">
        Welcome to{' '}
        <span className="brand">
          Waavy
          <span className="brand-glow" />
        </span>
      </h1>
      
      <p className="description">
        The modern React framework for building{' '}
        <span className="highlight">exceptional</span>{' '}
        web experiences
      </p>
      
      <div className="actions">
        <button className="btn-primary">
          Get Started
        </button>
        <button className="btn-secondary">
          Documentation
        </button>
      </div>
    </div>
  );
};

export default HomeWidget;