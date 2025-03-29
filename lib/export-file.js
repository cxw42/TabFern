/// export-file.js: Save a JSON-serializable object to a local file.
/// Requires HTML5 File API (for Blob).
/// Copyright (c) 2017 Chris White.  CC-BY 4.0 International.

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        // AMD
        define("export-file", factory);
    } else if (typeof exports === "object") {
        // Node, CommonJS-like
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.ExportFile = factory();
    }
})(this, function () {
    /// Save the given text to the given filename.  This is what is returned
    /// by the module loader.
    /// @param {Document} doc - the current document
    /// @param {mixed} contents - a string, or something that can be
    ///                passed through JSON.stringify()
    /// @param {string} fileName - the filename to use.  Note that the file
    ///                 may be saved to a different name, depending on
    ///                 browser behaviour.
    function saveText(doc, contents, fileName) {
        let text_string;
        if (typeof contents === "string") {
            text_string = contents;
        } else {
            text_string = JSON.stringify(contents);
        }

        let textToWrite = text_string.replace(/\r\n|\r|\n/g, "\r\n");
        let textFileAsBlob = new Blob([textToWrite], { type: "text/plain" });

        let downloadLink = doc.createElement("a");
        downloadLink.download = fileName;
        downloadLink.innerHTML = "Download File";
        // Chrome allows the link to be clicked without actually adding it to the DOM.
        downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
        downloadLink.click();
    } //saveText()

    return saveText;
});

// Module-loader template thanks to
// http://davidbcalhoun.com/2014/what-is-amd-commonjs-and-umd/
// Thanks for information about `this` to Kyle Simpson,
// https://github.com/getify/You-Dont-Know-JS/blob/master/this%20%26%20object%20prototypes/ch2.md
/// File I/O modified from
/// https://www.thewebflash.com/reading-and-creating-text-files-using-the-html5-file-api/
/// by Hendy Tarnando, https://www.thewebflash.com/author/frosdqy/

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
