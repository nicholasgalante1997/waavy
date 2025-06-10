import { describe, test, expect } from "bun:test";
import React from "react";
import Document from "./components/Document";

import { pipeComponentToWritableCallback } from "../../server";

function App() {
  return (
    <Document>
      <p>Static React App Body</p>
    </Document>
  );
}

describe("<Minimal />", () => {
  test("`pipeComponentToWritableCallback` Renders <Minimal /> and returns HTML", async () => {
    let stream = "";
    const component = <App />;
    await pipeComponentToWritableCallback(component, (chunk) => (stream += chunk));
    expect(stream).toContain("<p>Static React App Body</p>");
  });
});
