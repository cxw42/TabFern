/// export-file.js: Save a JSON-serializable object to a local file.
/// Requires HTML5 File API (for Blob).
/// Copyright (c) 2017 Chris White.  CC-BY 4.0 International.

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

module.exports = saveText;

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
