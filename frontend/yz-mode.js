// CodeMirror mode for Yz programming language
(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

// Yz language mode
CodeMirror.defineMode("yz", function(config, parserConfig) {
  // Keywords for Yz language
  var keywords = [
    "func", "main", "var", "const", "if", "else", "for", "while", "return",
    "break", "continue", "struct", "interface", "type", "import", "package",
    "defer", "go", "select", "case", "default", "switch", "fallthrough",
    "println", "print", "len", "cap", "append", "make", "new", "delete",
    "panic", "recover", "range", "map", "chan", "bool", "int", "int8", "int16",
    "int32", "int64", "uint", "uint8", "uint16", "uint32", "uint64", "uintptr",
    "float32", "float64", "complex64", "complex128", "string", "byte", "rune",
    "error", "true", "false", "nil", "iota"
  ];

  // Built-in functions
  var builtins = [
    "println", "print", "len", "cap", "append", "make", "new", "delete",
    "panic", "recover", "close", "copy", "complex", "real", "imag"
  ];

  // String and number patterns
  var stringPrefixes = /^[a-zA-Z_$][\w$]*/;
  var numberPrefixes = /^(\d[_\d]*)/;
  var numberSuffixes = /^[fF]|^[lL]|^[uU]|^[fF][lL]|^[fF][lL][uU]|^[lL][uU]|^[uU][lL]|^[uU][lL][lL]/;

  var keywordRegex = new RegExp("\\b(" + keywords.join("|") + ")\\b");
  var builtinRegex = new RegExp("\\b(" + builtins.join("|") + ")\\b");

  function tokenBase(stream, state) {
    // Handle whitespace
    if (stream.eatSpace()) return null;

    // Handle comments
    if (stream.match(/^\/\//)) {
      stream.skipToEnd();
      return "comment";
    }
    if (stream.match(/^\/\*/)) {
      state.tokenize = tokenComment;
      return tokenComment(stream, state);
    }

    // Handle strings
    if (stream.match(/^"/)) {
      state.tokenize = tokenString;
      return tokenString(stream, state);
    }
    if (stream.match(/^'/)) {
      state.tokenize = tokenChar;
      return tokenChar(stream, state);
    }

    // Handle backticks (raw strings)
    if (stream.match(/^`/)) {
      state.tokenize = tokenRawString;
      return tokenRawString(stream, state);
    }

    // Handle numbers
    if (stream.match(/^0[xX][0-9a-fA-F]+/)) return "number";
    if (stream.match(/^0[0-7]+/)) return "number";
    if (stream.match(/^0[bB][01]+/)) return "number";
    if (stream.match(/^\d+\.\d+([eE][+-]?\d+)?/)) return "number";
    if (stream.match(/^\d+[eE][+-]?\d+/)) return "number";
    if (stream.match(/^\d+/)) return "number";

    // Handle operators
    if (stream.match(/^[+\-*/%=<>!&|^~]/)) {
      // Check for compound operators
      if (stream.match(/^[+\-*/%=<>!&|^~]=/)) return "operator";
      return "operator";
    }

    // Handle punctuation
    if (stream.match(/^[{}[\]();,.]/)) return "punctuation";

    // Handle identifiers and keywords
    if (stream.match(stringPrefixes)) {
      if (keywordRegex.test(stream.current())) {
        return "keyword";
      }
      if (builtinRegex.test(stream.current())) {
        return "builtin";
      }
      return "variable";
    }

    // Handle unknown tokens
    stream.next();
    return "error";
  }

  function tokenString(stream, state) {
    var escaped = false;
    while (!stream.eol()) {
      if (!escaped && stream.match(/^"/)) {
        state.tokenize = tokenBase;
        return "string";
      }
      escaped = !escaped && stream.match(/^\\/);
      stream.next();
    }
    return "string";
  }

  function tokenChar(stream, state) {
    var escaped = false;
    while (!stream.eol()) {
      if (!escaped && stream.match(/^'/)) {
        state.tokenize = tokenBase;
        return "string";
      }
      escaped = !escaped && stream.match(/^\\/);
      stream.next();
    }
    return "string";
  }

  function tokenRawString(stream, state) {
    while (!stream.eol()) {
      if (stream.match(/^`/)) {
        state.tokenize = tokenBase;
        return "string";
      }
      stream.next();
    }
    return "string";
  }

  function tokenComment(stream, state) {
    while (!stream.eol()) {
      if (stream.match(/\*\//)) {
        state.tokenize = tokenBase;
        return "comment";
      }
      stream.next();
    }
    return "comment";
  }

  return {
    startState: function() {
      return { tokenize: tokenBase };
    },
    token: function(stream, state) {
      if (state.tokenize) {
        return state.tokenize(stream, state);
      }
      return tokenBase(stream, state);
    },
    lineComment: "//",
    blockCommentStart: "/*",
    blockCommentEnd: "*/",
    fold: "brace"
  };
});

// Register the Yz mode
CodeMirror.defineMIME("text/x-yz", "yz");
CodeMirror.defineMIME("text/yz", "yz");

});
