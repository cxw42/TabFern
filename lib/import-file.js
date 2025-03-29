/// import-file.js: Retrieve a JSON-serializable object from a user-specified
/// local file.  Requires HTML5 File API.
/// Copyright (c) 2017 Chris White.  CC-BY 4.0 International.

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        // AMD
        define("import-file", factory);
    } else if (typeof exports === "object") {
        // Node, CommonJS-like
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.ImportFile = factory();
    }
})(this, function () {
    /// Prototype for the importer
    let Proto = {};

    /// Prompt the user for a filename and provide its contents as a string,
    /// assuming UTF-8 encoding.
    /// @param {function} cbk   Callback called with (contents, filename)
    /// Note: I don't know what will happen if the user picks a non-text file.
    /// Note also there is currently no error reporting, and the callback
    /// may never be invoked.

    Proto.getFileAsString = function (cbk) {
        this.loader.addEventListener(
            "change",
            function (evt) {
                // Note: never fires if the user hits Cancel in the file selector
                let fileToLoad = evt.target.files[0];
                if (!fileToLoad) return;

                let filename = evt.target.files[0].name;
                console.log("Reading file " + filename);
                let reader = new FileReader();
                reader.addEventListener("load", function (fileLoadedEvent) {
                    let textFromFileLoaded = fileLoadedEvent.target.result;
                    cbk(textFromFileLoaded, filename);
                });

                reader.readAsText(fileToLoad, "UTF-8");
            },
            { once: true }
        ); //end of onchange

        this.loader.click(); // popup the file selector
    }; //getFileAsString()

    /// Make a new importer.
    /// @param {DOM Document}   doc         The document the importer runs in.
    /// @param {String}         filetype    Optional string of the filetypes
    ///                                     to list in the Open dialog.
    /// @return                 the new importer object, or null.
    function ctor(doc, accept) {
        if (doc == null) return null; // TODO better error reporting

        // Create the instance data
        let retval = Object.create(Proto);
        retval.doc = doc;

        let loader = (retval.loader = doc.createElement("input"));
        // Chrome doesn't seem to require us to add this to the DOM.
        // Also, we don't set an ID, so multiple importers can be created
        // for the same document.
        loader.type = "file";
        loader.style.display = "none";
        if (accept) loader.accept = accept;

        return Object.seal(retval); // the new importer
    } //ctor

    return ctor;
});

// Module-loader template thanks to
// http://davidbcalhoun.com/2014/what-is-amd-commonjs-and-umd/
// Thanks for information about `this` to Kyle Simpson,
// https://github.com/getify/You-Dont-Know-JS/blob/master/this%20%26%20object%20prototypes/ch2.md
/// File I/O modified from
/// https://www.thewebflash.com/reading-and-creating-text-files-using-the-html5-file-api/
/// by Hendy Tarnando, https://www.thewebflash.com/author/frosdqy/

// vi: set ts=4 sts=4 sw=4 et ai fo-=o: //
