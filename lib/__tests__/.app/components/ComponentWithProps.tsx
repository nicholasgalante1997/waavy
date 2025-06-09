import React from "react";

type Props = {
  message: string;
};

export default function ComponentWithProps({ message }: Props) {
  return <h2>{message}</h2>;
}
