import React from 'react';
import Document from './components/Document';
import ComponentWithProps from './components/ComponentWithProps';

type Props = {
  message: string
}

export default function AppWithProps({ message }: Props) {
    return (
        <Document>
          <ComponentWithProps message={message} />
        </Document>
    );
}