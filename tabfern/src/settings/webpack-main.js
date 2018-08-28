
require("../../assets/fontawesome/css/font-awesome.css");
require("./lib/default.css");
require("./css/main.css");
require("./css/setting.css");
require("./custom.css");
require("../../assets/css/icons.css");
require("../../assets/css/spectrum.css");
require("../../assets/css/spinjs.css");

require('../common/validation.js');
require('../common/common.js');
require('../../js/loglevel.js');
require('../../js/spin-packed.js');

require('../../js/tinycolor.js');
require('../../js/import-file.js');
require('../../js/export-file.js');

require('imports-loader?this=>window!./lib/mootools-core.js');   // now $ is mootools
require('./lib/store.js');
require('./js/classes/tab.js');
require('./js/classes/setting.js');
require('./js/classes/search.js');

require('imports-loader?this=>window!./i18n.js');
require('imports-loader?this=>window!./js/i18n.js');

//require('imports-loader?i18n=./js/i18n.js!./manifest.js');
require('./manifest.js');

require('imports-loader?manifest=../../manifest.js!./js/classes/fancy-settings.js');
    // ../.. because imports-loader uses the path of the file being imported
    // as the base.  TODO fixme - use an alias or something cleaner for
    // the manifest file.

    // TODO instead? change fancy-settings.js so initWithManifest() takes
    // the manifest as a parameter

require('../../js/jquery.js');
//require('imports-loader?$=jquery!../../js/spectrum.js');
require('../../js/spectrum.js');
//import '../../js/jquery-noconflict.js';
                // now $ is back to mootools - use jQuery() instead of $

require('imports-loader?manifest=./manifest,$$=jquery!./main.js');

