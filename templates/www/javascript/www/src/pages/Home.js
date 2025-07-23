import React, { useEffect, useRef } from "react";
import Card from "../components/Card";
import HomeWidget from "../components/HomeWidget";

const cards = [];

const Home = () => {
  const cardsRef = useRef();
  useEffect(() => {
    if (cardsRef.current) {
      const cards = cardsRef.current.children;
      Array.from(cards).forEach((card, index) => {
        card.style.animation = `fadeInUp 0.8s ease-out ${0.2 + index * 0.1}s forwards`;
        card.style.opacity = "0";
        card.style.transform = "translateY(50px)";
      });
    }
  }, []);

  return (
    <main className="main">
      <div className="container">
        <HomeWidget />
        <div className="grid" ref={cardsRef}>
          {cards.map((feature) => <Card desc={feature.desc} icon={feature.icon} title={feature.title} key={JSON.stringify(feature)} />)}
        </div>
      </div>
    </main>
  );
};

export default Home;
