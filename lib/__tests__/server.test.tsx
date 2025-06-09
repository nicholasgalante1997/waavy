import { test, expect, describe } from "bun:test";

import React from "react";

import Component from "./.app/components/Component";
import AppWithProps from "./.app/AppWithProps";
import AppWithReactQuery from "./.app/AppWithReactQuery";

import { pipeComponentToWritableCallback } from "../server";
import { $load } from "../utils";

describe("$load", () => {
  test("loads a component", async () => {
    const component = await $load("lib/__tests__/.app/components/Component.tsx");
    expect(component).toBeDefined();
    expect(component).toBe(Component);
  });

  test("loads a named component", async () => {
    const component = await $load("lib/__tests__/.app/components/Component.tsx", "Component");
    expect(component).toBeDefined();
    expect(component).toBe(Component);
  });
});

describe("pipeComponentToWritableCallback", () => {
  test("pipes a component to a callback", async () => {
    let stream = "";
    const component = <Component />;
    await pipeComponentToWritableCallback(component, (chunk) => (stream += chunk));
    expect(stream).toBe("<div>Component <!-- -->0</div>"); // 0 is a memoized stateful value, so it has some special react flagging
  });

  test("pipes a component with props to a callback", async () => {
    let stream = "";
    const component = <AppWithProps message="Hello from the Simpsons" />;
    await pipeComponentToWritableCallback(component, (chunk) => (stream += chunk));
    expect(stream).not.toBe("");
    expect(stream.length).toBeGreaterThan(0);
    expect(stream).toContain("Hello from the Simpsons");
  });

  test("pipes a component that uses @tanstack/react-query to a callback", async () => {
    let stream = "";
    const component = <AppWithReactQuery />;
    await pipeComponentToWritableCallback(component, (chunk) => (stream += chunk));
    expect(stream).not.toBe("");
    expect(stream.length).toBeGreaterThan(0);
    expect(stream).toContain("@tanstack/react-query");
  });
});
