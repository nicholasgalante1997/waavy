# Don't README (Or preferably, DREADME)

Alright, I've made it pretty far without documenting fucking anything. Probably an oversight to be honest. Let's recap where we are so far.

## Nick's Raw Workspace

### Next Feature Sets

#### Caching

Convert props to deterministic dataset then to a hash
Write Component stream to hash/file in local fs cache somewhere
In subsequent requests we can skip rendering the component again
if the hash of props + Component is the same, we can just stream the local cached file,
skipping the bulk of the work of rendering with React

### Assumptions

#### Frontend Competency

- Frontend teams have bundlers/build tools that they prefer that they want to use. They should have the autonomy to bundle javascript however they want. They do not want us choosing their build tooling. In this case, they likely have static client side hydration scripts that they need us to bootstrap into their Server Side Rendered React markup. We can achieve this using the `bootstrapModules` field of the the ReactDOMServer renderToReadableStream options, which we make available through an executable argument `--bootstrap` which accepts an arbitrary number of strings and passes them all as an array of strings to `options#bootstrapModules`.
- For hydration to work properly, there is some level of synchronization necessary between what's rendered on the server, and what is hydrated on the client. The main thing we need to synchronize is **props**. The props that we used to render the React component need to be the same props that the client hydrates the React component with, otherwise we'll experience hydration errors in the browser. 
  - There's a couple mechanisms we can use to pass props from the server to the client. The most straightforward, and least invasive, route to go here is to assign the props to a property on the window object. Then the client script can index the props off the window with the correct property key, parse them, and render the component with them. For this to work, we need 
    1. **a deterministic window property name that the client and the server agree on**
    2. **a way for a non javascript server to indicate to `waavy` where to assign the props to on the window**

**We probably want to extend the Waavy Command Line Interface `render` command to accept an additional option `-w, --window-cache` where a user/consumer can specify where they want `waavy` to put server side props so that the client can access them. The most common pattern here is window assignment. So let's lean into that. 

There's a couple quality of life things that we'll do here beyond extending the options for the cli render action. Since we offer an importable node/browser API, consumers can lean on exported waavy functions to do the work of "finding the props" for them. 

#### Backend Complacency

- Competent backend engineers that wanted to learn React/Frontend Web Development would have done so by now. If they cared to learn the intricacies of javascript build tooling and bundling, they would have done so by now. They 

## Command Line Interface - Actions/Commands

### Render

Ah, the prodigal son. So far, we can 

- Load a component (default or named export) from a supplied file
- Parse props from options supplied to the executable.
- Pass props into the loaded Component and render it to a stream or string
- Stream the rendered output to
    - stdout
    - a provided pipe
- Accept an array of strings that it maps to [bootstrap modules](https://react.dev/reference/react-dom/server/renderToReadableStream#parameters) from options, and parse the bootstrapModules to the ReactDOMServer renderToReadableStrea options in the `bootstrapModules` field. 
- We've started kicking around some concepts for hydration, where we'll actually bundle a supplied component into client side hydration js
    - This is working, but problematic for a couple reasons. See our section on hydration below.

#### Hydration

How are we handling hydration?

If you pass us a `--hydrate` flag, we'll do the following:

1. Create an empty instance of the `Hydra` class
2. Give it the following
    1. A Component
    2. A path to that component's source file (where did you load it from so we can set up mock import statement)
    3. Props
    4. An extension (one of [.ts, .tsx, .js. jsx])

After all that, the hydra class does the following when we call `h.createBundle()`:

1. Creates an on the fly typescript/javascript template based on the file extension provided that looks like the following


import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import ${getImportName(options?.name)} from "${normalizedPath}";

const props = window?.__WAAVY__?.$react?.root?.props || {};
const selector = "${options?.selector || "#waavyroot"}";
const container = document.querySelector(selector);

if (container) {
  hydrateRoot(
    container, 
    React.createElement(${getComponentName(options?.name)}, props)
  );
} else {
  console.error("Container not found:", selector);
}

2. Then we bundle that inline code
    Except Bun doesn't have that ability, so we set up this whole workaround
    that creates a tmp file in a cache and writes the ts/js to it then bundles it
    with Bun's bundler into a single bundle containing all the client side code

This code is then rreturned to the calling scope inside that render function

This is where we started hitting issues.

It's easy enough to stick the props in the template and not do this window assignment but even if we wanna stick the props in the template and bundle everything in one go that leads to other problems. 

If we separate the props from the on the fly generated bundle, we can bundle ahead of the request/response cycle (prehydration) which is what we want to do because bundling during that cycle is timely and expensive. So we want our bundle to be "props" agnostic basically. So we can bundle it ahead of time. That means we need to make our props available on the client somehow. A good pattern for this is to use window assignment, which is what we're doing. We have another method on Hydra (h.createBootstrapPropsInlineScript) which takes some props and embeds it in some deterministic place in the window object, so that we can grab our props in a deterministic way in our client side script, without the client side script actually needing the props to be bundled. The client side script can just assume the props will be at the deterministic place on the window:

```tsx
...
  createBootstrapPropsInlineScript() {
    const waavyBrowserDTO = {
      $react: {
        root: { props: this.props || {} },
      },
    };
    return `
console.log('Page loaded, React will attempt hydration now...');
window.__WAAVY__ = ${JSON.stringify(waavyBrowserDTO)};
`;
  }
...
```

```tsx
...
const props = window?.__WAAVY__?.$react?.root?.props || {};
const selector = "${options?.selector || "#waavyroot"}";
const container = document.querySelector(selector);

if (container) {
  hydrateRoot(
    container, 
    React.createElement(${getComponentName(options?.name)}, props)
  );
} else {
  console.error("Container not found:", selector);
}
...
```

So with this pattern, we can 

- Bundle our client side hydration scripts ahead of time
- Avoid bundling our client side hydration scripts in the handler where we have access to per request props
- Just grab a quick cache of the bundled output from somewhere
- Render the Component with the per req/res props on the server
- Embed the result of `h.createBootstrapPropsInlineScript()` into the rendered component markup using the ReactDOMServer renderToReadableStream options `bootstrapScriptContent` field.

This is where it gets a little hairy.

Right now we have this bundled client side hydration code 

- In ESM format, not commonjs, so this needs to be loaded as a module script. This has limited us. If we wanted our build output as commonjs, we could likely just add it into the `bootstrapScriptContent` field of the ReactDOMServer renderToReadableStream which is intended for common js scripts. But we want to preserve esm. We don't want to give up on esm. 
- As a string in the response handler because we want to embed it in the response stream because we can't assume that the consuming application is going to serve static hydration files. 
  - We may need to change our stance on this assumption. By no means is it acceptable to run the bundle of the client side javascript in the response handler. It's a tradeoff we're not

### Prehydrate (Might rename to bundle)

## Issues

[x] Issues around bundling React into the executable. React & React DOM need to be peer dependencies to `waavy` due to React internal state singleton issues. We now do not bundle "react", "react-dom" into the final build, and have marked our package's peer dependencies as external to the bundler.
[ ] Hydration:  