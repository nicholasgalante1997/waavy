import React, { useEffect } from 'react';

function App() {
    const [mounted, setMounted] = React.useState(false);
    useEffect(() => {
        setMounted(true);
        return () => {
            setMounted(false);
        }
    });
    return (
        <section>
            <h1>Test</h1>
            {mounted && <p>This component has mounted on the client.</p>}
        </section>
    );
}