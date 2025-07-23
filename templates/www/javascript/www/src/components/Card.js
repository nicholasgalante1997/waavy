import React from "react";

function Card({ icon, title, desc }) {
  return (
    <div key={idx} className="card">
      <div className="shimmer" />
      <div className="card-icon">{icon}</div>
      <h3 className="card-title">{title}</h3>
      <p className="card-description">{desc}</p>
      <div className="card-gradient-border" />
    </div>
  );
}

export default Card;
