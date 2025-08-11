import type { PageConfiguration } from "@/types/cli/ssg";
import type WaavyReactPageRoute from "@/types/IWaavyReactPageRoute";

export async function handleStaticRoute<Props>(
  page: Omit<PageConfiguration<Props>, "route" | "routes">,
  route: WaavyReactPageRoute,
) {
  const { Component, filename, context, getStaticProps, options, renderOptions } = page;
  const { path, params } = route;
}

async function handleCreateAndWriteHydrationBundle() {}

function getEmbeddedHydrationBundleTemplate(useWaavy = true) {}

function getWaavyHydrationBundleTemplate() {}

function getNonWaavyHydrationBundleTemplate() {
  return `
  
  `;
}

export * from "./pages";
export * from "./waavy-react";
