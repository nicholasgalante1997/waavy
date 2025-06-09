import React from "react";

export default function Component() {
  /** Mock State */
  const [state,] = React.useState(0);

  /** Mock Lifecycle Hook (Effect) */
  React.useEffect(() => {
    console.log("state", state);
  }, []);

  /** Mock Memoized Value */
  const memoizedStateValue = React.useMemo(() => {
    return state;
  }, [state]);

  return <div>Component {memoizedStateValue}</div>;
}

export { Component };
