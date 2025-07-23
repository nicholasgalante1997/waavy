import React, { useEffect } from "react";

function AnimatedBackground() {
  return (
    <div className="background-orbs">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className={`orb orb-${i + 1}`}
          style={{
            animationDelay: `${i * 2}s`,
            width: `${200 + i * 50}px`,
            height: `${200 + i * 50}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

const Layout = ({ children, theme = "glassDark" }) => {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <html lang="en" data-theme={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Create Waavy App</title>
        <meta
          name="description"
          content="The React Anti-Framework"
        />
        
      </head>
      <body>
        <AnimatedBackground />
        <div id="root">{children}</div>
      </body>
    </html>
  );
};

export default Layout;
