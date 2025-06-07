import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import Document from "./components/Document";
import ComponentWithProps from "./components/ComponentWithProps";

function AppWithReactQuery() {
  const queryClient = new QueryClient();
  return (
    <Document>
      <QueryClientProvider client={queryClient}>
        <ComponentWithProps message="@tanstack/react-query" />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Document>
  );
}

export default AppWithReactQuery
