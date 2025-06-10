import { describe, test, expect } from "bun:test";
import React from "react";
import Document from "./components/Document";
import ComponentWithProps from "./components/ComponentWithProps";
import { pipeComponentToWritableCallback } from "@/server";

type Props = {
  message: string;
};

export default function AppWithProps({ message }: Props) {
  return (
    <Document>
      <ComponentWithProps message={message} />
    </Document>
  );
}

describe("<MinimalWithProps />", () => {
  test("`pipeComponentToWritableCallback` Renders <MinimalWithProps /> and returns HTML", async () => {
    let stream = "";
    const message = "Hello from the Simpsons";
    const component = <AppWithProps message={message} />;
    await pipeComponentToWritableCallback(component, (chunk) => (stream += chunk));
    expect(stream).toContain(message);
  });
});
