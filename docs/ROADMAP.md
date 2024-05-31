# Roadmap

This document contains list of candidate features which are to be implemented in the future.

## 1. Switch to external text editor for body editing

`TokenTextEditor`, which is currently used as text editor throughout httpiness has distinct limitations, including but not limited to:

- Performance issues when working with large text.
- Lack of support for simple text-based formats like JSON or YAML.
- Bad support for undo and redo.

Its only true application is `UrlTextEditor` in `HttpRequestControl` as it supports custom text wrapping based on text's syntactic structure.

In *almost* all other contexts, `TokenTextEditor` should be replaced with industry-proven web-based code editor like Monaco or CodeMirror. Main challenge here is that new text editor needs to be configured to support highlighting of httpiness-style parameters (`${PARAMETER}`) in context of existing text-based formats like JSON.

## 2. Add support for Ubuntu

Almost all code is platform independent, though there are certain customization that needs to be introduced:

  1. [node-keytar](https://github.com/atom/node-keytar) on Linux depends on `libsecret` library which needs to be installed independently. Other platforms do not have explicit dependencies.
  2. `curl` compiled for Linux is not packaged in the executable. However, given the fact that `curl` is preinstalled on Ubuntu, it may not need to be packaged at all.
  3. `src\renderer\ui\ControlBar\ControlBar.ts` needs to be updated in order to facilitate native Ubuntu experience.
  4. OS-specific behavior has been implemented on multiple places; these places can be identified by searching for `currentPlatform()` function; proper support for Ubuntu needs to be introduced.

## 3. Create custom HTTP-client library and deprecating use of curl

Currently, httpiness sends HTTP request by spawning new curl process with appropriate command line arguments. This means that httpiness effectively acts as a GUI shell for curl.

Ideally, curl should be replaced by custom lightweight HTTP client library which has native interoperability with node.

## 4. Add support for global undo and redo

Current support for undo is insufficient and buggy.

## 5. Improve URL UI

- Allow URL query to be shown as a table nested within URL string
- Colorize parts of URL with different colors.
