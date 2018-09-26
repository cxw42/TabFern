/// justhtmlescape: An HTML-escaping function.
/// However, see  the cautions in http://wonko.com/post/html-escaping .
/// Adapted from https://github.com/janl/mustache.js/blob/master/mustache.js
/// MIT license --- see end of file

// Returns { escape(text), unescape(text) }.

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define('justhtmlescape',factory);
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.JustHTMLEscape = factory();
    }
}(this, function () {

    let entityMap, reverseEntityMap={};

    // Entity map listing the ones from http://wonko.com/post/html-escaping .
    // Even these may not be appropriate for all contexts.
    // Thanks to https://dev.w3.org/html5/html-author/charref
    entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
        '`': '&grave;',
        ' ': '&#x20;',
        '!': '&excl;',
        '@': '&commat;',
        '$': '&dollar;',
        '%': '&percnt;',
        '(': '&lpar;',
        ')': '&rpar;',
        '=': '&equals;',
        '+': '&plus;',
        '{': '&lbrace;',
        '}': '&rbrace;',
        '[': '&lbrack;',
        ']': '&rbrack;',
        '/': '&sol;',
        };

    for(let key in entityMap) {
        reverseEntityMap[entityMap[key]] = key;
    }

    let reverseRegex;
    {   // Make the reverse-entity regex
        let reverseRegexPattern = '(';
        for(let key in reverseEntityMap) {
            reverseRegexPattern += key + '|';
        }
        // Change the trailing bar to an rparen.
        reverseRegexPattern = reverseRegexPattern.replace(/.$/,')');
        reverseRegex = new RegExp(reverseRegexPattern, 'g');
    }

    function escapeHTML(str) {
        return String(str).replace(/[&<>"'` !@$%()=+{}\[\]\/]/g,
            function fromEntityMap (s) {
                return entityMap[s];
            }
        );
    } //escapeHTML

    function unescapeHTML(str) {
        return String(str).replace(reverseRegex,
            function fromReverseEntityMap(s) {
                return reverseEntityMap[s];
            }
        );
    }

    return Object.seal({ 'escape': escapeHTML, 'unescape': unescapeHTML });
}));

// Module-loader template thanks to
// http://davidbcalhoun.com/2014/what-is-amd-commonjs-and-umd/

// License:
// The MIT License
//
// Copyright (c) 2009 Chris Wanstrath (Ruby)
// Copyright (c) 2010-2014 Jan Lehnardt (JavaScript)
// Copyright (c) 2010-2015 The mustache.js community
// Updates copyright (c) 2017 Chris White.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
// of the Software, and to permit persons to whom the Software is furnished to do
// so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
