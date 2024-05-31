/**
 * TokenTextEditor is a custom-written text editor used in httpiness.
 * Its most important application is UrlTextEditor used in UrlControl, as it
 * supports automatic text wrapping based on text's syntactic structure. It is also
 * used as BodyTextEditor for configuration of HTTP body, however it is suboptimal
 * for that purpose and should be replaces with an industry-proven web-based code
 * editor like Monaco or CodeMirror.
 *
 * TokenTextEditor is essentially an aflon.Div which is consisted of at least single
 * Line. Each Line is consisted of at least single Token (which is a specialization of
 * aflon.Span).
 *
 * TokenTextEditor is customized by overriding its protected methods, most importantly
 * '_tokenize', which is is a method which receives new text content of the editor as
 * a parameter and returns an array of Lines, each of which contains list of Tokens.
 *
 * '_toStringCaretPosition' and '_toTokenCaretPosition' methods should
 * also be overridden if new '_tokenize' method do not use default mapping of offset of
 * a character in input string to its row-column coordinates within lines of the editor
 * (non-standard handling of new lines, for example in UrlTextEditor).
 *
 * Internally, state of TokenTextEditor is stored as an instance of StringProcessorState.
 * Each command which is intended to modify content of the editor is encoded as
 * StringProcessorDelta. When text modification is initiated, StringProcessorDelta that
 * represents the modification and current StringProcessorState are passed to 'process'
 * function of StringProcessor. 'process' function is a pure function and returns new
 * instance of StringProcessorState. TokenTextEditor reads new StringProcessorState,
 * parses and tokenize its 'text' variable, repopulates itself with proper Lines and
 * Tokens and configures text selection according to 'selection' variable from
 * StringProcessorState. Recycling of existing tokens is not currently implemented, so
 * TokenTextEditor has performance issues when large text is used.
 */

export * from "./TokenTextEditor";
export * from "./MacroedTextEditor";
export * from "./Token";
export * from "./Line";
