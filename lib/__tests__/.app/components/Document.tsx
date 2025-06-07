import React from "react";

type Props = {
  children: React.ReactNode
}

export default function Document({ children }: Props) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Document</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
