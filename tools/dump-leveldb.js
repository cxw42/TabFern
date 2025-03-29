// dump-leveldb.js: Dump the data from a Chrome/Vivaldi
// Extension Settings database.
//
// See https://github.com/cxw42/TabFern/issues/170#issuecomment-473280320
// for usage instructions.
//
// Prerequisites:
//      npm install levelup leveldown
//
// This code by cxw42 2019, CC-BY-SA 3.0.  Thanks to the sample at
// https://github.com/Level/levelup/blob/master/README.md and to
// https://superuser.com/a/1088579/269989 by
// https://superuser.com/users/219095/daniel-b

var levelup = require("levelup");
var leveldown = require("leveldown");

// 1) Create our store
var db = levelup(leveldown("./data"));

db.createReadStream()
    .on("data", function (data) {
        console.log(
            data.key.toString("utf8"),
            "=",
            data.value.toString("utf8")
        );
    })
    .on("error", function (err) {
        console.log("Oh my!", err);
    })
    .on("close", function () {
        console.log("Stream closed");
    })
    .on("end", function () {
        console.log("Stream ended");
    });
