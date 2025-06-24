# Waavy - `render`

This command is responsible for the following tasks:

- Loading a Component from a local filespace
- Parsing props from either
    - A command line option
    - A loader function export pattern
- Creating a script that assigns props to a deterministic field on the window, so they can be used for rehydration.
- Parsing a list of scripts to append to the rendered markup
- 