# Waavy CLI - Render

Usage: `waavy render <path-to-component> --[...options]`

## Purpose

This command can locate a Component from within the local filesystem or an S3 Bucket, and render it to a stream of data, without needing a local javascript runtime. 

The primary usecase is to spawn a render process, and stream the output of the process back to your consumer, most likely in a given request/response lifecycle.