(function(global) {
"use strict";

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
//var _runOnNode = "process" in global;
//var _runOnWorker = "WorkerLocation" in global;
//var _runOnBrowser = "document" in global;

var OTHER  = 1

var DOCOMO = 2, KDDI = 3, SOFTBANK = 4;
var DEVICE_BRAND = { 2: "DOCOMO", 3: "KDDI", 4: "SOFTBANK" };

// --- class / interfaces ----------------------------------
function FPSpec(env) { // @arg Object = {} - { USER_AGENT }
                                 // @env.USER_AGENT String = ""

//{@dev
    $valid($type(env, "Object|omit"), FPSpec, "env");
    $valid($keys(env, "USER_AGENT"),  FPSpec, "env");
//}@dev

    env = env || {};

    var nav      = global["navigator"] || {};
    var ua       = env["USER_AGENT"]   || nav["userAgent"] || "";
    var brandID  = _detectBrandID(ua);
    var deviceID = "";
    var displayLong = 0;
    var displayShort = 0;
    var browserVersion = 0.0;
    var flashLiteVersion = 0.0;
    var data = null;

    if (brandID) {
        deviceID = _detectDeviceID(ua, brandID);
        if (deviceID) {
            data = FPSpec["catalog"][deviceID];
            if (data) {
                displayLong  = Math.max(data[2], data[3]);
                displayShort = Math.min(data[2], data[3]);
                browserVersion = data[4];
                flashLiteVersion = data[1];
            }
        }
    }
    this["DEVICE_ID"]           = deviceID;
    this["DEVICE_BRAND"]        = DEVICE_BRAND[brandID] || "OTHER";
    this["DISPLAY_LONG"]        = displayLong;
    this["DISPLAY_SHORT"]       = displayShort;
    this["BROWSER_VERSION"]     = browserVersion;
    this["FLASH_LITE_VERSION"]  = flashLiteVersion;
}

FPSpec["prototype"] = {
    "constructor":          FPSpec,                     // new FPSpec(env:Object = {}):this
    "hasDeviceID":          FPSpec_hasDeviceID,         // FPSpec#hasDeviceID(deviceID:String):Boolean
    "canDeviceFeature":     FPSpec_canDeviceFeature,    // FPSpec#canDeviceFeature(feature:IgnoreCaseString):Boolean
    // --- property accessor ---
    "getDisplayLong":       function() { return this["DISPLAY_LONG"]; },    // FPSpec#getDisplayLong():Integer
    "getDisplayShort":      function() { return this["DISPLAY_SHORT"]; },   // FPSpec#getDisplayShort():Integer
    "getBrowserVersion":    function() { return this["BROWSER_VERSION"]; }, // FPSpec#getBrowserVersion():String
    "getFlashLiteVersion":  function() { return this["FLASH_LITE_VERSION"];}// FPSpec#getFlashLiteVersion():Number - 1.0, 1.1, 2.0, 3.0, 3.1 or 0.0
};

// --- implements ------------------------------------------
function _detectBrandID(ua) { // @arg UserAgentString
                              // @ret DeviceBrandID
    switch (true) {
    case /DoCoMo/.test(ua):             return DOCOMO;
    case /KDDI/.test(ua):               return KDDI;
    case /SoftBank|Vodafone/.test(ua):  return SOFTBANK;
    }
    return OTHER;
}

function _detectDeviceID(ua,        // @arg UserAgentString
                         brandID) { // @ret DeviceBrandInteger
    switch (brandID) {
    case DOCOMO:
        // DoCoMo/2.0 P07A3(c500;TB;W24H15)
        //            ~~~~~
        return ua.split("DoCoMo/2.0 ")[1].split("(")[0];
    case KDDI:
        // KDDI-TS3H UP.Browser/6.2_7.2.7.1.K.1.400 (GUI) MMP/2.0
        //      ~~~~
        return ua.split("KDDI-")[1].split(" ")[0];
    case SOFTBANK:
        // Vodafone/1.0/V905SH/SHJ001[/Serial] Browser/VF-NetFront/3.3 Profile/MIDP-2.0 Configuration/CLDC-1.1
        //               ~~~~~
        // SoftBank/1.0/301P/PJP10[/Serial] Browser/NetFront/3.4 Profile/MIDP-2.0 Configuration/CLDC-1.1
        //              ~~~~
        if (/^Vodafone/.test(ua)) {
            return ua.split("/")[2].slice(1); // V905SH -> 905SH
        }
        return ua.split("/")[2];
    }
    return "";
}

function FPSpec_hasDeviceID(deviceID) { // @arg String
                                        // @ret Boolean
                                        // @desc device in the device catalog.
//{@dev
    $valid($type(deviceID, "String"), FPSpec_hasDeviceID, "deviceID");
//}@dev

    return deviceID && deviceID in FPSpec["catalog"];
}

function FPSpec_canDeviceFeature(feature) { // @arg IgnoreCaseString - "UTF8" or "UTF-8" or "TLS" or "COOKIE"
                                            // @ret Boolean
                                            // @desc can feature function.
//{@dev
    $valid($type(feature, "IgnoreCaseString"), FPSpec_canDeviceFeature, "feature");
    $valid($some(feature, "UTF8|UTF-8|TLS|COOKIE", true), FPSpec_canDeviceFeature, "feature");
//}@dev

    switch ( feature.toUpperCase() ) {
    case "UTF-8":
    case "UTF8":    return _canUTF8(this);
    case "TLS":     return _canTLS(this);
    case "COOKIE":  return _canCookie(this);
    }
    return false;
}

function _canUTF8(that) { // @ret Boolean
    switch (that["DEVICE_BRAND"]) {
    case "DOCOMO":
        // | Charset    | i-mode 1.0  | i-mode 2.0 | i-mode 2.1 |
        // |------------|-------------|------------|------------|
        // | Shift_JIS  | OK          | OK         | OK         |
        // | UTF-8      |             | OK         | OK         |
        return that["BROWSER_VERSION"] >= 2.0;
    case "KDDI":
        // | Charset           | Browser 6.2 | Browser 7.2 |
        // |-------------------|-------------|-------------|
        // | Shift_JIS         | OK          | OK          |
        // | UTF-8 (HTML)      |             | WRONG       |
        // | UTF-8 (HTML+SSL)  |             | OK          |
        // | UTF-8 (XHTML)     |             | OK          |
        // | UTF-8 (XHTML+SSL) |             | OK          |
        return that["BROWSER_VERSION"] >= 7.2;
    case "SOFTBANK":
        // | Charset    | Browser     |
        // |------------|-------------|
        // | Shift_JIS  | OK          |
        // | UTF-8      | OK          |
        // | EUC-JP     | OK          |
        return true;
    }
    return false;
}

function _canTLS(that) { // @ret Boolean - TLS 1.0 supported
    switch (that["DEVICE_BRAND"]) {
    case "DOCOMO":
        // https://www.nttdocomo.co.jp/service/developer/make/content/ssl/spec/index.html
        //
        // | SSL/TLS    | i-mode 1.0  | i-mode 2.0  | i-mode 2.1 |
        // |------------|-------------|-------------|------------|
        // | SSL 2.0    | OK          | OK          | OK         |
        // | SSL 3.0    | OK          | OK          | OK         |
        // | TLS 1.0    |             | OK          | OK         |
        return that["BROWSER_VERSION"] >= 2.0;
    case "KDDI":
        // http://www.au.kddi.com/ezfactory/web/pdf/contents_guide.pdf (P42)
        //
        // | SSL/TLS    | Browser 6.2 | Browser 7.2 |
        // |------------|-------------|-------------|
        // | SSL 3.0    | OK          | OK          |
        // | TLS 1.0    | OK          | OK          |
        return true;
    case "SOFTBANK":
        // http://creation.mb.softbank.jp/mc/tech/tech_web/web_ssl.html
        //
        // | SSL/TLS    | Browser     |
        // |------------|-------------|
        // | SSL 3.0    | OK          |
        // | TLS 1.0    | OK          |
        return true;
    }
    return false;
}

function _canCookie(that) { // @ret Boolean
    switch (that["DEVICE_BRAND"]) {
    case "DOCOMO":
        // |            | i-mode 1.0  | i-mode 2.0   | i-mode 2.1 |
        // |------------|-------------|--------------|------------|
        // | Cookie     |             | OK           | OK         |
        return that["BROWSER_VERSION"] >= 2.0;
    case "KDDI":
        // |            | Browser 6.2 | Browser 7.2  |
        // |------------|-------------|--------------|
        // | Cookie     | OK          | OK           |
        return that["BROWSER_VERSION"] >= 7.2;
    case "SOFTBANK":
        // |            | Browser     |
        // |------------|-------------|
        // | Cookie     | OK          |
        return true;
    }
    return false;
}

FPSpec["catalog"] = {
        // --- docomo ---
        // https://www.nttdocomo.co.jp/binary/pdf/service/developer/make/content/spec/imode_spec.pdf
        //          [0]         [1]     [2]      [4]
        //          BRAND       Flash   DISP     Browser
        //                      Lite             Version
        "F900i":    [DOCOMO,    1.0,    230,240, 1.0],
        "N900i":    [DOCOMO,    1.0,    240,269, 1.0],
        "P900i":    [DOCOMO,    1.0,    240,266, 1.0],
        "SH900i":   [DOCOMO,    1.0,    240,252, 1.0],
        "F900iT":   [DOCOMO,    1.0,    230,240, 1.0],
        "P900iV":   [DOCOMO,    1.0,    240,266, 1.0],
        "N900iS":   [DOCOMO,    1.0,    240,269, 1.0],
        "D900i":    [DOCOMO,    1.0,    240,270, 1.0],
        "F900iC":   [DOCOMO,    1.0,    230,240, 1.0],
        "N900iL":   [DOCOMO,    1.0,    240,269, 1.0],
        "N900iG":   [DOCOMO,    1.0,    240,269, 1.0],
        "SH901iC":  [DOCOMO,    1.1,    240,252, 1.0],
        "F901iC":   [DOCOMO,    1.1,    230,240, 1.0],
        "N901iC":   [DOCOMO,    1.1,    240,270, 1.0],
        "D901i":    [DOCOMO,    1.1,    230,240, 1.0],
        "P901i":    [DOCOMO,    1.1,    240,270, 1.0],
        "SH901iS":  [DOCOMO,    1.1,    240,252, 1.0],
        "F901iS":   [DOCOMO,    1.1,    230,240, 1.0],
        "D901iS":   [DOCOMO,    1.1,    230,240, 1.0],
        "P901iS":   [DOCOMO,    1.1,    240,270, 1.0],
        "N901iS":   [DOCOMO,    1.1,    240,270, 1.0],
        "P901iTV":  [DOCOMO,    1.1,    240,270, 1.0],
        "F700i":    [DOCOMO,    1.1,    230,240, 1.0],
        "SH700i":   [DOCOMO,    1.1,    240,252, 1.0],
        "N700i":    [DOCOMO,    1.1,    240,270, 1.0],
        "P700i":    [DOCOMO,    1.1,    240,270, 1.0],
        "F700iS":   [DOCOMO,    1.1,    230,240, 1.0],
        "SH700iS":  [DOCOMO,    1.1,    240,252, 1.0],
        "SA700iS":  [DOCOMO,    1.1,    240,252, 1.0],
        "SH851i":   [DOCOMO,    1.1,    240,252, 1.0],
        "P851i":    [DOCOMO,    1.1,    240,270, 1.0],
        "D851iWM":  [DOCOMO,    1.1,    230,320, 1.0],
        "D701i":    [DOCOMO,    1.1,    230,240, 1.0],
        "N701i":    [DOCOMO,    1.1,    240,270, 1.0],
        "P701iD":   [DOCOMO,    1.1,    240,270, 1.0],
        "D701iWM":  [DOCOMO,    1.1,    230,240, 1.0],
        "N701iECO": [DOCOMO,    1.1,    240,270, 1.0],
        "F902i":    [DOCOMO,    1.1,    230,240, 1.0],
        "D902i":    [DOCOMO,    1.1,    230,320, 1.0],
        "N902i":    [DOCOMO,    1.1,    240,270, 1.0],
        "P902i":    [DOCOMO,    1.1,    240,270, 1.0],
        "SH902i":   [DOCOMO,    1.1,    240,240, 1.0],
        "SO902i":   [DOCOMO,    1.1,    240,256, 1.0],
        "SH902iS":  [DOCOMO,    1.1,    240,240, 1.0],
        "P902iS":   [DOCOMO,    1.1,    240,270, 1.0],
        "N902iS":   [DOCOMO,    1.1,    240,270, 1.0],
        "D902iS":   [DOCOMO,    1.1,    230,320, 1.0],
        "F902iS":   [DOCOMO,    1.1,    230,240, 1.0],
        "SO902iWP+":[DOCOMO,    1.1,    240,256, 1.0],
        "SH902iSL": [DOCOMO,    1.1,    240,240, 1.0],
        "N902iX":   [DOCOMO,    1.1,    240,270, 1.0],
        "N902iL":   [DOCOMO,    1.1,    240,270, 1.0],
        "P702i":    [DOCOMO,    1.1,    240,270, 1.0],
        "N702iD":   [DOCOMO,    1.1,    240,270, 1.0],
        "F702iD":   [DOCOMO,    1.1,    230,240, 1.0],
        "SH702iD":  [DOCOMO,    1.1,    240,240, 1.0],
        "D702i":    [DOCOMO,    1.1,    230,240, 1.0],
        "SO702i":   [DOCOMO,    1.1,    240,256, 1.0],
        "D702iBCL": [DOCOMO,    1.1,    230,240, 1.0],
        "SA702i":   [DOCOMO,    1.1,    240,252, 1.0],
        "SH702iS":  [DOCOMO,    1.1,    240,240, 1.0],
        "N702iS":   [DOCOMO,    1.1,    240,270, 1.0],
        "P702iD":   [DOCOMO,    1.1,    240,270, 1.0],
        "D702iF":   [DOCOMO,    1.1,    230,240, 1.0],
        "M702iS":   [DOCOMO,    1.1,    240,267, 1.0],
        "M702iG":   [DOCOMO,    1.1,    240,267, 1.0],
        "SA800i":   [DOCOMO,    1.1,    240,252, 1.0],
        "D800iDS":  [DOCOMO,    1.1,    230,240, 1.0],
        "F882iES":  [DOCOMO,    1.1,    240,256, 1.0],
        "SH903i":   [DOCOMO,    1.1,    240,320, 1.0],
        "P903i":    [DOCOMO,    1.1,    240,270, 1.0],
        "N903i":    [DOCOMO,    1.1,    240,270, 1.0],
        "D903i":    [DOCOMO,    1.1,    230,320, 1.0],
        "F903i":    [DOCOMO,    1.1,    230,240, 1.0],
        "SO903i":   [DOCOMO,    1.1,    240,368, 1.0],
        "D903iTV":  [DOCOMO,    1.1,    230,320, 1.0],
        "F903iX":   [DOCOMO,    1.1,    230,240, 1.0],
        "P903iTV":  [DOCOMO,    1.1,    240,350, 1.0],
        "SH903iTV": [DOCOMO,    1.1,    240,320, 1.0],
        "F903iBSC": [DOCOMO,    1.1,    230,240, 1.0],
        "P903iX":   [DOCOMO,    1.1,    240,270, 1.0],
        "SO903iTV": [DOCOMO,    1.1,    240,368, 1.0],
        "N601i":    [DOCOMO,    1.1,    240,270, 1.0],
        "N703iD":   [DOCOMO,    1.1,    240,270, 1.0],
        "F703i":    [DOCOMO,    1.1,    230,240, 1.0],
        "P703i":    [DOCOMO,    1.1,    240,270, 1.0],
        "D703i":    [DOCOMO,    1.1,    230,240, 1.0],
        "SH703i":   [DOCOMO,    1.1,    240,240, 1.0],
        "P703iμ":  [DOCOMO,    1.1,    240,270, 1.0],
        "N703iμ":  [DOCOMO,    1.1,    240,270, 1.0],
        "SO703i":   [DOCOMO,    1.1,    240,368, 1.0],
        "F883i":    [DOCOMO,    1.1,    240,256, 1.0],
        "F883iES":  [DOCOMO,    1.1,    240,256, 1.0],
        "F883iESS": [DOCOMO,    1.1,    240,256, 1.0],
        "F883iS":   [DOCOMO,    1.1,    240,256, 1.0],
        "SH904i":   [DOCOMO,    1.1,    240,320, 1.0],
        "N904i":    [DOCOMO,    1.1,    240,352, 1.0],
        "F904i":    [DOCOMO,    1.1,    240,240, 1.0],
        "D904i":    [DOCOMO,    1.1,    240,320, 1.0],
        "P904i":    [DOCOMO,    1.1,    240,350, 1.0],
        "SO704i":   [DOCOMO,    1.1,    240,368, 1.0],
        "F704i":    [DOCOMO,    1.1,    230,240, 1.0],
        "N704iμ":  [DOCOMO,    1.1,    240,270, 1.0],
        "P704iμ":  [DOCOMO,    1.1,    240,270, 1.0],
        "SH704i":   [DOCOMO,    1.1,    240,320, 1.0],
        "D704i":    [DOCOMO,    1.1,    230,240, 1.0],
        "P704i":    [DOCOMO,    1.1,    240,270, 1.0],
        "L704i":    [DOCOMO,    1.1,    240,280, 1.0],
        "F801i":    [DOCOMO,    1.1,    240,352, 1.0],
        "F705i":    [DOCOMO,    1.1,    240,352, 1.0],
        "D705i":    [DOCOMO,    1.1,    240,320, 1.0],
        "D705iμ":  [DOCOMO,    1.1,    240,240, 1.0],
        "L705i":    [DOCOMO,    1.1,    240,280, 1.0],
        "SH705i":   [DOCOMO,    1.1,    240,320, 1.0],
        "L705iX":   [DOCOMO,    1.1,    240,280, 1.0],
        "SH705iII": [DOCOMO,    1.1,    240,320, 1.0],
        "L852i":    [DOCOMO,    1.1,    240,298, 1.0],
        "L706ie":   [DOCOMO,    1.1,    240,280, 1.0],
        "SH706ie":  [DOCOMO,    1.1,    240,320, 1.0],
        "SH905i":   [DOCOMO,    3.0,    480,640, 1.0],
        "D905i":    [DOCOMO,    3.0,    480,704, 1.0],
        "N905i":    [DOCOMO,    3.0,    480,640, 1.0],
        "P905i":    [DOCOMO,    3.0,    480,700, 1.0],
        "F905i":    [DOCOMO,    3.0,    480,480, 1.0],
        "SO905i":   [DOCOMO,    3.0,    480,736, 1.0],
        "N905iμ":  [DOCOMO,    3.0,    480,640, 1.0],
        "N905iBiz": [DOCOMO,    3.0,    480,640, 1.0],
        "SH905iTV": [DOCOMO,    3.0,    480,640, 1.0],
        "SO905iCS": [DOCOMO,    3.0,    480,736, 1.0],
        "F905iBiz": [DOCOMO,    3.0,    480,704, 1.0],
        "P905iTV":  [DOCOMO,    3.0,    480,700, 1.0],
        "P705i":    [DOCOMO,    3.0,    240,350, 1.0],
        "N705i":    [DOCOMO,    3.0,    240,320, 1.0],
        "N705iμ":  [DOCOMO,    3.0,    240,320, 1.0],
        "P705iμ":  [DOCOMO,    3.0,    240,350, 1.0],
        "SO705i":   [DOCOMO,    3.0,    240,320, 1.0],
        "P705iCL":  [DOCOMO,    3.0,    240,350, 1.0],
        "F884i":    [DOCOMO,    3.0,    240,364, 1.0],
        "F884iES":  [DOCOMO,    3.0,    240,282, 1.0],
        "P906i":    [DOCOMO,    3.0,    480,700, 1.0],
        "SO906i":   [DOCOMO,    3.0,    480,736, 1.0],
        "SH906i":   [DOCOMO,    3.0,    480,640, 1.0],
        "N906iμ":  [DOCOMO,    3.0,    480,640, 1.0],
        "F906i":    [DOCOMO,    3.0,    480,704, 1.0],
        "N906i":    [DOCOMO,    3.0,    480,640, 1.0],
        "N906iL":   [DOCOMO,    3.0,    480,640, 1.0],
        "SH906iTV": [DOCOMO,    3.0,    480,640, 1.0],
        "F706i":    [DOCOMO,    3.0,    240,352, 1.0],
        "N706i":    [DOCOMO,    3.0,    240,320, 1.0],
        "SO706i":   [DOCOMO,    3.0,    240,320, 1.0],
        "SH706i":   [DOCOMO,    3.0,    480,640, 1.0],
        "P706iμ":  [DOCOMO,    3.0,    240,350, 1.0],
        "P706ie":   [DOCOMO,    3.0,    240,350, 1.0],
        "N706ie":   [DOCOMO,    3.0,    240,320, 1.0],
        "N706iII":  [DOCOMO,    3.0,    240,320, 1.0],
        "SH706iw":  [DOCOMO,    3.0,    480,640, 1.0],
        "F01A":     [DOCOMO,    3.1,    480,704, 1.0], // 2008
        "P01A":     [DOCOMO,    3.1,    480,700, 1.0], // 2008
        "SH01A":    [DOCOMO,    3.1,    480,640, 1.0], // 2008
        "N03A":     [DOCOMO,    3.0,    240,320, 1.0], // 2008
        "N01A":     [DOCOMO,    3.1,    480,640, 1.0], // 2008
        "N02A":     [DOCOMO,    3.1,    480,640, 1.0], // 2008
        "F02A":     [DOCOMO,    3.0,    480,704, 1.0], // 2008
        "SH03A":    [DOCOMO,    3.1,    480,640, 1.0], // 2008
        "P03A":     [DOCOMO,    3.1,    240,350, 1.0], // 2008
        "L01A":     [DOCOMO,    1.1,    240,350, 1.0], // 2008
        "SH02A":    [DOCOMO,    3.0,    480,640, 1.0], // 2008
        "N04A":     [DOCOMO,    3.1,    480,640, 1.0], // 2009
        "F03A":     [DOCOMO,    3.1,    480,704, 1.0], // 2009
        "F06A":     [DOCOMO,    3.0,    480,704, 1.0], // 2009
        "P02A":     [DOCOMO,    3.1,    480,700, 1.0], // 2009
        "F05A":     [DOCOMO,    1.1,    240,352, 1.0], // 2009
        "F04A":     [DOCOMO,    3.0,    480,704, 1.0], // 2009
        "P04A":     [DOCOMO,    3.1,    240,350, 1.0], // 2009
        "SH04A":    [DOCOMO,    3.1,    480,640, 1.0], // 2009
        "P05A":     [DOCOMO,    3.1,    240,350, 1.0], // 2009
        "L03A":     [DOCOMO,    1.1,    240,280, 1.0], // 2009
        "N05A":     [DOCOMO,    3.0,    240,320, 1.0], // 2009
        "P06A":     [DOCOMO,    3.0,    240,350, 1.0], // 2009
        "F07A":     [DOCOMO,    3.0,    240,256, 1.0], // 2009
        "P07A3":    [DOCOMO,    3.1,    480,662, 2.0], // 2009
        "N06A3":    [DOCOMO,    3.1,    480,640, 2.0], // 2009
        "N08A3":    [DOCOMO,    3.1,    480,640, 2.0], // 2009
        "F09A3":    [DOCOMO,    3.1,    480,648, 2.0], // 2009
        "SH06A3":   [DOCOMO,    3.1,    480,592, 2.0], // 2009
        "SH05A3":   [DOCOMO,    3.1,    480,592, 2.0], // 2009
        "F08A3":    [DOCOMO,    3.1,    480,648, 2.0], // 2009
        "P10A":     [DOCOMO,    3.1,    240,350, 1.0], // 2009
        "N09A3":    [DOCOMO,    3.1,    480,640, 2.0], // 2009
        "P09A3":    [DOCOMO,    3.1,    480,662, 2.0], // 2009
        "SH07A3":   [DOCOMO,    3.1,    480,592, 2.0], // 2009
        "P08A3":    [DOCOMO,    3.1,    480,662, 2.0], // 2009
        "N07A3":    [DOCOMO,    3.1,    480,640, 2.0], // 2009
        "F10A":     [DOCOMO,    3.0,    240,330, 1.0], // 2009
        "L06A":     [DOCOMO,    1.1,    240,313, 1.0], // 2009
        "SH08A":    [DOCOMO,    3.1,    480,592, 2.0], // 2009
        "L04A":     [DOCOMO,    1.1,    240,313, 1.0], // 2009
        "F01B":     [DOCOMO,    3.1,    480,648, 2.0], // 2009
        "SH01B":    [DOCOMO,    3.1,    480,646, 2.0], // 2009
        "F02B":     [DOCOMO,    3.1,    480,648, 2.0], // 2009
        "P01B":     [DOCOMO,    3.1,    480,662, 2.0], // 2009
        "SH02B":    [DOCOMO,    3.1,    480,646, 2.0], // 2009
        "F03B":     [DOCOMO,    3.1,    480,648, 2.0], // 2009
        "SH04B":    [DOCOMO,    3.1,    480,592, 2.0], // 2009
        "N02B":     [DOCOMO,    3.1,    480,640, 2.0], // 2009
        "N01B":     [DOCOMO,    3.1,    480,640, 2.0], // 2009
        "L02B":     [DOCOMO,    1.1,    240,330, 1.0], // 2009
        "N03B":     [DOCOMO,    3.1,    480,640, 2.0], // 2010
        "SH05B":    [DOCOMO,    3.1,    480,646, 2.0], // 2010
        "P03B":     [DOCOMO,    3.1,    240,331, 2.0], // 2010 2.0LE
        "SH03B":    [DOCOMO,    3.1,    480,592, 2.0], // 2010
        "P02B":     [DOCOMO,    3.1,    480,662, 2.0], // 2010
        "L03B":     [DOCOMO,    1.1,    240,330, 1.0], // 2010
        "L01B":     [DOCOMO,    3.1,    480,660, 2.0], // 2010 2.0LE
        "F04B":     [DOCOMO,    3.1,    480,648, 2.0], // 2010
        "SH06B":    [DOCOMO,    3.1,    480,646, 2.0], // 2010
        "F07B":     [DOCOMO,    3.1,    480,648, 2.0], // 2010
        "P04B":     [DOCOMO,    3.1,    480,662, 2.0], // 2010
        "N04B":     [DOCOMO,    3.1,    480,640, 2.0], // 2010
        "SH07B":    [DOCOMO,    3.1,    480,656, 2.0], // 2010
        "SH08B":    [DOCOMO,    3.1,    480,646, 2.0], // 2010
        "N05B":     [DOCOMO,    3.1,    480,640, 2.0], // 2010
        "N06B":     [DOCOMO,    3.0,    240,320, 1.0], // 2010
        "F06B":     [DOCOMO,    3.1,    480,656, 2.0], // 2010
        "N07B":     [DOCOMO,    3.1,    480,640, 2.0], // 2010
        "F08B":     [DOCOMO,    3.1,    480,648, 2.0], // 2010
        "P05B":     [DOCOMO,    3.1,    240,331, 2.0], // 2010 2.0LE
        "L04B":     [DOCOMO,    1.1,    240,250, 1.0], // 2010
        "P06B":     [DOCOMO,    3.1,    480,650, 2.0], // 2010
        "F09B":     [DOCOMO,    3.1,    480,660, 1.0], // 2010 *
        "SH09B":    [DOCOMO,    3.1,    480,646, 2.0], // 2010
        "N08B":     [DOCOMO,    3.1,    480,480, 2.0], // 2010
        "F10B":     [DOCOMO,    3.1,    480,648, 2.0], // 2010
        "P07B":     [DOCOMO,    3.1,    240,331, 2.0], // 2010 2.0LE
        "N01C":     [DOCOMO,    3.1,    480,650, 2.1], // 2010
        "P02C":     [DOCOMO,    3.1,    480,662, 2.0], // 2010
        "P01C":     [DOCOMO,    3.1,    240,331, 2.0], // 2010 2.0LE
        "N02C":     [DOCOMO,    3.1,    480,650, 2.1], // 2010
        "SH01C":    [DOCOMO,    3.1,    480,656, 2.1], // 2010
        "F01C":     [DOCOMO,    3.1,    480,656, 2.1], // 2010
        "SH02C":    [DOCOMO,    3.1,    480,656, 2.1], // 2010
        "F03C":     [DOCOMO,    3.1,    480,656, 2.1], // 2010
        "F02C":     [DOCOMO,    3.1,    480,656, 2.1], // 2010
        "SH04C":    [DOCOMO,    3.1,    480,656, 2.1], // 2010
        "P03C":     [DOCOMO,    3.1,    480,650, 2.1], // 2010
        "L01C":     [DOCOMO,    1.1,    240,330, 1.0], // 2010
        "N03C":     [DOCOMO,    3.1,    480,650, 2.1], // 2011
        "F04C":     [DOCOMO,    3.1,    480,648, 2.0], // 2011
        "SH05C":    [DOCOMO,    3.1,    480,592, 2.1], // 2011
        "L03C":     [DOCOMO,    3.1,    480,640, 2.0], // 2011
        "SH06C":    [DOCOMO,    3.1,    480,592, 2.1], // 2011
        "F05C":     [DOCOMO,    3.1,    480,648, 2.0], // 2011
        "SH09C":    [DOCOMO,    3.1,    480,656, 2.1], // 2011
        "SH08C":    [DOCOMO,    3.1,    480,592, 2.1], // 2011
        "F08C":     [DOCOMO,    3.1,    240,330, 1.0], // 2011 *
        "SH10C":    [DOCOMO,    3.1,    480,656, 2.1], // 2011
        "SH11C":    [DOCOMO,    3.1,    480,656, 2.1], // 2011
        "F10C":     [DOCOMO,    3.1,    480,656, 2.1], // 2011
        "F09C":     [DOCOMO,    3.1,    480,656, 2.1], // 2011
        "N05C":     [DOCOMO,    3.1,    480,650, 2.1], // 2011
        "P04C":     [DOCOMO,    3.1,    480,650, 2.1], // 2011
        "F11C":     [DOCOMO,    3.1,    480,648, 2.0], // 2011
        "P05C":     [DOCOMO,    3.1,    480,650, 2.1], // 2011
        "CA01C":    [DOCOMO,    3.1,    480,650, 2.1], // 2011
        "F07C":     [DOCOMO,    3.1,    480,630, 2.0], // 2011
        "P06C":     [DOCOMO,    3.1,    480,650, 2.1], // 2011
        "L10C":     [DOCOMO,    1.1,    240,330, 1.0], // 2011
        "F02D":     [DOCOMO,    3.1,    480,656, 2.1], // 2011
        "P03D":     [DOCOMO,    3.1,    480,650, 2.1], // 2011
        "N03D":     [DOCOMO,    3.1,    480,650, 2.1], // 2011
        "SH03D":    [DOCOMO,    3.1,    480,656, 2.1], // 2011
        "N02D":     [DOCOMO,    3.1,    480,650, 2.1], // 2011
        "F04D":     [DOCOMO,    3.1,    480,656, 2.1], // 2012
        "F06D":     [DOCOMO,    3.1,    480,656, 2.1], // 2012
        "SH05D":    [DOCOMO,    3.1,    480,656, 2.1], // 2012
        "P01E":     [DOCOMO,    3.1,    480,650, 2.1], // 2012
        "F01E":     [DOCOMO,    3.1,    480,656, 2.1], // 2012
        "N01E":     [DOCOMO,    3.1,    480,650, 2.1], // 2012
        "SH03E":    [DOCOMO,    3.1,    480,656, 2.1], // 2012
        "N07E":     [DOCOMO,    3.1,    480,650, 2.1], // 2013
        "P01F":     [DOCOMO,    3.1,    480,650, 2.1], // 2013
        "N01F":     [DOCOMO,    3.1,    480,650, 2.1], // 2013
        "F07F":     [DOCOMO,    3.1,    480,656, 2.1], // 2014
        "SH07F":    [DOCOMO,    3.1,    480,656, 2.1], // 2014
        "F08F":     [DOCOMO,    3.1,    480,660, 1.0], // 2014 *
        "F01G":     [DOCOMO,    3.1,    240,330, 1.0], // 2014 *
        "P01G":     [DOCOMO,    3.1,    480,650, 2.1], // 2014
        // --- au ---
        // https://gist.github.com/uupaa/30518eb157cfb48fd071
        //          [0]         [1]     [2]      [4]
        //          BRAND       Flash   DISP     Browser
        //                      Lite             Version
//      "KC4G":     [KDDI,      3.0,    233,358, 7.2], // 2014 MARVERA2
        "KC4F":     [KDDI,      3.0,    233,358, 7.2], // 2013 MARVERA
        "KC4D":     [KDDI,      3.0,    232,325, 6.2], // 2013 GRATINA
        "KC4C":     [KDDI,      3.0,    232,268, 7.2], // 2013 mamorino3 *
        "PT37":     [KDDI,      3.0,    230,324, 6.2], // 2012 PT003
        "KC4A":     [KDDI,      3.0,    233,358, 7.2], // 2012 K011
        "KC4B":     [KDDI,      3.0,    232,325, 6.2], // 2012 K012
        "FJ31":     [KDDI,      3.0,    233,358, 7.2], // 2011 F001
        "SN3V":     [KDDI,      3.0,    233,358, 7.2], // 2011 URBANO AFFARE
//      "KC47":     [KDDI,      0,      232,268, 7.2], // 2011 Mi-Look *
        "TS3Z":     [KDDI,      3.0,    233,358, 7.2], // 2011 T007
        "KC46":     [KDDI,      3.0,    233,358, 7.2], // 2011 K009
        "SN3U":     [KDDI,      3.0,    233,358, 7.2], // 2011 S007
        "TS3Y":     [KDDI,      3.0,    233,358, 7.2], // 2011 T008
        "CA3K":     [KDDI,      3.0,    232,358, 7.2], // 2011 CA007
        "KC45":     [KDDI,      2.0,    232,325, 6.2], // 2011 K010
        "KC44":     [KDDI,      2.0,    232,268, 7.2], // 2011 mamorino2 *
        "SN3T":     [KDDI,      3.0,    233,358, 7.2], // 2011 G11[iida]
        "PT36":     [KDDI,      2.0,    230,324, 6.2], // 2011 PT002
        "TS3X":     [KDDI,      3.0,    233,358, 7.2], // 2011 T006
        "KC42":     [KDDI,      3.0,    233,358, 7.2], // 2011 K007
        "SH3L":     [KDDI,      3.0,    234,358, 7.2], // 2011 SH011
        "SN3S":     [KDDI,      3.0,    233,358, 7.2], // 2011 S006
        "KC43":     [KDDI,      2.0,    232,325, 6.2], // 2011 K008
        "CA3J":     [KDDI,      3.0,    232,336, 7.2], // 2010 CA006
        "CA3I":     [KDDI,      3.0,    232,336, 7.2], // 2010 G'zOne TYPE-X
        "SH3K":     [KDDI,      3.0,    232,336, 7.2], // 2010 SH010
        "TS3W":     [KDDI,      3.0,    233,358, 7.2], // 2010 X-RAY[iida]
        "SN3Q":     [KDDI,      3.0,    233,358, 7.2], // 2010 S005
        "TS3V":     [KDDI,      3.0,    233,358, 7.2], // 2010 T005
        "SN3R":     [KDDI,      3.0,    233,358, 7.2], // 2010 URBANO MOND
        "KC41":     [KDDI,      2.0,    232,325, 6.2], // 2010 K006 (no camera) *
        "SH3J":     [KDDI,      3.0,    234,358, 7.2], // 2010 SH009
        "KC3Z":     [KDDI,      2.0,    232,325, 6.2], // 2010 K006
        "TS3U":     [KDDI,      3.0,    233,358, 7.2], // 2010 LIGHT POOL[iida]
        "KC3Y":     [KDDI,      2.0,    232,325, 6.2], // 2010 K005
        "SH3I":     [KDDI,      3.0,    234,358, 7.2], // 2010 SH008
        "SN3O":     [KDDI,      3.0,    233,358, 7.2], // 2010 S003
        "KC3X":     [KDDI,      3.0,    233,358, 7.2], // 2010 SA002
        "TS3S":     [KDDI,      3.0,    233,358, 7.2], // 2010 T004
        "SN3P":     [KDDI,      3.0,    233,358, 7.2], // 2010 S004
        "HI3H":     [KDDI,      3.0,    232,336, 7.2], // 2010 beskey
        "CA3H":     [KDDI,      3.0,    232,336, 7.2], // 2010 CA005
        "SH3H":     [KDDI,      3.0,    234,358, 7.2], // 2010 SH007
//      "KC3W":     [KDDI,      0,      232,268, 7.2], // 2010 mamorino *
        "SH3G":     [KDDI,      3.0,    234,358, 7.2], // 2010 SH006
        "KC3V":     [KDDI,      2.0,    232,325, 6.2], // 2010 lotta[iida]
        "KC3U":     [KDDI,      2.0,    232,325, 6.2], // 2010 K004
        "SN3N":     [KDDI,      3.0,    233,358, 7.2], // 2010 URBANO BARONE
        "SH3F":     [KDDI,      3.0,    234,358, 7.2], // 2010 SH005
        "SN3L":     [KDDI,      3.0,    233,358, 7.2], // 2009 BRAVIA Phone U1
        "SH3E":     [KDDI,      3.0,    233,331, 7.2], // 2009 SH004
        "KC3S":     [KDDI,      2.0,    232,325, 6.2], // 2009 PRISMOID[iida]
        "TS3R":     [KDDI,      3.0,    233,358, 7.2], // 2009 T003
        "SH3D":     [KDDI,      3.0,    234,358, 7.2], // 2009 SH003
        "CA3G":     [KDDI,      2.0,    232,336, 7.2], // 2009 CA004
        "SN3M":     [KDDI,      2.0,    228,345, 6.2], // 2009 S002
        "KC3R":     [KDDI,      3.0,    233,358, 7.2], // 2009 SA001
        "CA3F":     [KDDI,      3.0,    232,336, 7.2], // 2009 CA003
        "TS3Q":     [KDDI,      3.0,    233,358, 7.2], // 2009 PLY[iida]
        "KC3P":     [KDDI,      2.0,    232,325, 6.2], // 2009 K003
        "HI3G":     [KDDI,      3.0,    232,336, 7.2], // 2009 Mobile Hi-Vision CAM Wooo
        "KC3Q":     [KDDI,      2.0,    232,325, 6.2], // 2009 misora[iida]
        "TS3O":     [KDDI,      3.0,    233,358, 7.2], // 2009 biblio
        "TS3P":     [KDDI,      3.0,    233,358, 7.2], // 2009 T002
        "SH3B":     [KDDI,      3.0,    234,358, 7.2], // 2009 SH002
        "KC3O":     [KDDI,      2.0,    232,325, 6.2], // 2009 K002
        "SH3C":     [KDDI,      3.0,    234,358, 7.2], // 2009 Sportio water beat
        "CA3E":     [KDDI,      2.0,    232,333, 7.2], // 2009 CA002
        "SN3K":     [KDDI,      3.0,    232,358, 7.2], // 2009 G9[iida]
        "SN3J":     [KDDI,      3.0,    233,358, 7.2], // 2009 S001
        "PT35":     [KDDI,      2.0,    230,324, 6.2], // 2009 NS02
        "MA35":     [KDDI,      2.0,    233,331, 7.2], // 2009 P001
        "TS3N":     [KDDI,      3.0,    233,331, 7.2], // 2009 T001
        "HI3F":     [KDDI,      3.0,    232,336, 7.2], // 2009 H001
        "SH38":     [KDDI,      3.0,    233,331, 7.2], // 2009 SH001
        "CA3D":     [KDDI,      3.0,    232,336, 7.2], // 2009 CA001
        "SN3I":     [KDDI,      2.0,    233,358, 7.2], // 2009 Premier3
        "KC3N":     [KDDI,      2.0,    232,325, 6.2], // 2009 NS01
        "KC3M":     [KDDI,      2.0,    232,325, 6.2], // 2009 K001
        "SN3H":     [KDDI,      2.0,    233,251, 7.2], // Xmini
        "HI3E":     [KDDI,      2.0,    232,333, 7.2], // W63H
        "TS3M":     [KDDI,      2.0,    233,331, 7.2], // W65T
        "CA3C":     [KDDI,      2.0,    232,333, 7.2], // W63CA
        "SH37":     [KDDI,      2.0,    228,331, 7.2], // W64SH
        "KC3I":     [KDDI,      2.0,    232,325, 6.2], // W65K
        "SN3G":     [KDDI,      2.0,    228,345, 6.2], // W64S
        "MA34":     [KDDI,      2.0,    232,323, 6.2], // W62P
        "TS3L":     [KDDI,      2.0,    233,331, 7.2], // W64T
        "KC3K":     [KDDI,      2.0,    232,325, 6.2], // W63K (no camera) *
        "SH36":     [KDDI,      2.0,    229,323, 6.2], // URBANO
        "PT34":     [KDDI,      2.0,    230,246, 6.2], // W62PT
        "SA3E":     [KDDI,      2.0,    230,331, 7.2], // W64SA
        "CA3B":     [KDDI,      2.0,    232,333, 7.2], // W62CA
        "HI3D":     [KDDI,      2.0,    232,333, 7.2], // W62H
        "SH35":     [KDDI,      2.0,    228,331, 7.2], // W62SH
        "SN3F":     [KDDI,      2.0,    233,331, 7.2], // re
        "KC3H":     [KDDI,      2.0,    232,325, 6.2], // W63K
        "TS3K":     [KDDI,      2.0,    229,236, 7.2], // Sportio
        "TS3J":     [KDDI,      2.0,    233,331, 7.2], // W62T
        "SA3D":     [KDDI,      2.0,    230,331, 7.2], // W63SA
        "KC3G":     [KDDI,      2.0,    232,245, 6.2], // W62K
        "SN3D":     [KDDI,      2.0,    233,331, 7.2], // W61S
        "SA3C":     [KDDI,      2.0,    230,331, 7.2], // W61SA
        "SN3E":     [KDDI,      2.0,    228,345, 6.2], // W62S
        "TS3I":     [KDDI,      2.0,    233,331, 7.2], // W61T
        "HI3C":     [KDDI,      2.0,    232,323, 7.2], // W61H
        "ST34":     [KDDI,      2.0,    228,323, 6.2], // W62SA
        "PT33":     [KDDI,      2.0,    230,240, 6.2], // W61PT
        "MA33":     [KDDI,      2.0,    232,323, 6.2], // W61P
        "CA3A":     [KDDI,      2.0,    232,323, 6.2], // W61CA
        "KC3D":     [KDDI,      2.0,    240,325, 7.2], // W61K
        "SA3B":     [KDDI,      2.0,    230,331, 7.2], // W54SA
        "SH34":     [KDDI,      2.0,    229,323, 6.2], // W61SH
        "SN3C":     [KDDI,      2.0,    233,331, 7.2], // W54S
        "TS3H":     [KDDI,      2.0,    233,331, 7.2], // W56T
        "TS3G":     [KDDI,      2.0,    229,245, 6.2], // W55T
        "HI3B":     [KDDI,      2.0,    232,323, 6.2], // W53H
        "KC3B":     [KDDI,      2.0,    232,325, 6.2], // W53K/W64K
        "ST33":     [KDDI,      2.0,    228,323, 6.2], // INFOBAR 2
        "SN3B":     [KDDI,      2.0,    228,345, 6.2], // W53S
        "CA39":     [KDDI,      2.0,    232,323, 6.2], // W53CA
        "TS3E":     [KDDI,      2.0,    229,325, 6.2], // W54T
        "SH33":     [KDDI,      2.0,    229,323, 6.2], // W52SH
        "CA38":     [KDDI,      2.0,    232,323, 6.2], // W52CA
        "SN3A":     [KDDI,      2.0,    228,345, 6.2], // W52S
        "TS3D":     [KDDI,      2.0,    229,325, 6.2], // W53T
        "SA3A":     [KDDI,      2.0,    228,323, 6.2], // W52SA
        "HI3A":     [KDDI,      2.0,    232,323, 6.2], // W52H
        "TS39":     [KDDI,      2.0,    225,229, 6.2], // DRAPE
        "TS3A":     [KDDI,      2.0,    225,229, 6.2], // W47T
        // corporate model
        "KC48":     [KDDI,      2.0,    232,325, 6.2], // 2011 E10K *
        "TS41":     [KDDI,      3.0,    233,358, 7.2], // 2011 E09F *
        "TS3T":     [KDDI,      3.0,    233,358, 7.2], // 2010 E08T *
        "KC3T":     [KDDI,      2.0,    232,325, 6.2], // 2009 E07K *
        "SH3A":     [KDDI,      2.0,    234,331, 7.2], // 2009 E06SH *
        "SH39":     [KDDI,      2.0,    234,331, 7.2], // 2009 E05SH *

        // --- SoftBank ---
        // http://creation.mb.softbank.jp/mc/terminal/terminal_info/terminal_useragent.html
        // https://gist.github.com/uupaa/9b0aebd10939b6ac9495
        //          [0]         [1]     [2]      [4]
        //          BRAND       Flash   DISP     Browser
        //                      Lite             Version
        "301P":     [SOFTBANK,  3.1,    471,700, 1], // 2014
        "301SH":    [SOFTBANK,  3.1,    480,738, 1], // 2013
        "202SHe":   [SOFTBANK,  3.1,    240,350, 1], // 2013 *
        "202SH":    [SOFTBANK,  3.1,    240,350, 1], // 2013
        "109SH":    [SOFTBANK,  3.1,    480,738, 1], // 2012
        "108SH":    [SOFTBANK,  3.1,    240,338, 1], // 2012
        "103P":     [SOFTBANK,  3.1,    231,550, 1], // 2012
        "105SH":    [SOFTBANK,  3.1,    240,350, 1], // 2012
        "008SH":    [SOFTBANK,  3.1,    240,338, 1], // 2011
        "004SH":    [SOFTBANK,  3.1,    480,738, 1], // 2011
        "002Pe":    [SOFTBANK,  2.0,    236,365, 1], // 2011 *
        "002P":     [SOFTBANK,  2.0,    236,365, 1], // 2011
        "001P":     [SOFTBANK,  3.1,    471,700, 1], // 2011
        "001SC":    [SOFTBANK,  0,      240,344, 1], // 2010 * Prepaid
        "002SH":    [SOFTBANK,  3.1,    480,738, 1], // 2010
        "001N":     [SOFTBANK,  3.0,    480,650, 1], // 2010
        "001SH":    [SOFTBANK,  3.1,    240,350, 1], // 2010
        "840Z":     [SOFTBANK,  2.0,    234,320, 1], // 2010
        "840Pp":    [SOFTBANK,  2.0,    236,365, 1], // 2010
        "945SH":    [SOFTBANK,  3.1,    480,738, 1], // 2010
        "843SH":    [SOFTBANK,  3.1,    240,338, 1], // 2010
        "841N":     [SOFTBANK,  3.0,    480,650, 1], // 2010
        "941SC":    [SOFTBANK,  3.1,    480,512, 1], // 2010
        "942P":     [SOFTBANK,  3.1,    471,700, 1], // 2010
        "842SH":    [SOFTBANK,  3.1,    240,350, 1], // 2010
        "840N":     [SOFTBANK,  3.0,    240,325, 1], // 2010
        "840SC":    [SOFTBANK,  3.1,    232,336, 1], // 2010
        "944SH":    [SOFTBANK,  3.1,    480,754, 1], // 2010
        "842P":     [SOFTBANK,  3.0,    231,341, 1], // 2010
        "841SH":    [SOFTBANK,  3.1,    240,350, 1], // 2010
        "841SHs":   [SOFTBANK,  3.1,    240,350, 1], // 2010
        "942SH":    [SOFTBANK,  3.1,    480,754, 1], // 2010
        "943SH":    [SOFTBANK,  3.1,    480,754, 1], // 2010
        "841P":     [SOFTBANK,  2.0,    236,365, 1], // 2010
        "840Pe":    [SOFTBANK,  2.0,    236,365, 1], // 2010 *
        "941P":     [SOFTBANK,  3.0,    471,691, 1], // 2010
        "840SH":    [SOFTBANK,  3.0,    240,350, 1], // 2010
        "940P":     [SOFTBANK,  3.0,    471,691, 1], // 2009
        "940N":     [SOFTBANK,  3.0,    480,650, 1], // 2009
        "840P":     [SOFTBANK,  2.0,    236,365, 1],
        "941SH":    [SOFTBANK,  3.1,    480,824, 1],
        "940SC":    [SOFTBANK,  3.1,    480,512, 1],
        "931N":     [SOFTBANK,  3.0,    480,640, 1],
        "940SH":    [SOFTBANK,  3.1,    480,738, 1],
        "832SHs":   [SOFTBANK,  3.0,    240,350, 1],
        "740SC":    [SOFTBANK,  0,      232,264, 1],
        "831N":     [SOFTBANK,  3.0,    240,325, 1],
        "830SC":    [SOFTBANK,  0,      232,264, 1],
        "936SH":    [SOFTBANK,  3.0,    480,754, 1],
        "832SH":    [SOFTBANK,  3.0,    240,350, 1],
        "935SH":    [SOFTBANK,  3.0,    480,754, 1],
        "931P":     [SOFTBANK,  3.0,    471,691, 1],
        "832T":     [SOFTBANK,  2.0,    236,245, 1],
        "931SC":    [SOFTBANK,  3.1,    471,503, 1],
        "930N":     [SOFTBANK,  3.0,    480,650, 1],
        "934SH":    [SOFTBANK,  3.0,    480,754, 1],
        "933SH":    [SOFTBANK,  3.0,    480,738, 1],
        "832P":     [SOFTBANK,  3.0,    231,341, 1],
        "831SHs":   [SOFTBANK,  3.0,    240,350, 1],
        "831SH":    [SOFTBANK,  3.0,    240,350, 1],
        "830SHp":   [SOFTBANK,  2.0,    240,270, 1],
        "731SC":    [SOFTBANK,  0,      230,264, 1],
        "831P":     [SOFTBANK,  2.0,    236,365, 1],
        "930CA":    [SOFTBANK,  3.0,    480,700, 1],
        "830N":     [SOFTBANK,  3.0,    480,650, 1],
        "932SH":    [SOFTBANK,  3.0,    480,754, 1],
        "930P":     [SOFTBANK,  3.0,    471,691, 1],
        "831T":     [SOFTBANK,  2.0,    236,341, 1],
        "830T":     [SOFTBANK,  2.0,    236,341, 1],
        "931SH":    [SOFTBANK,  3.0,    480,824, 1],
        "930SC":    [SOFTBANK,  3.1,    480,658, 1],
        "930SH":    [SOFTBANK,  3.0,    480,754, 1],
        "830CA":    [SOFTBANK,  3.0,    240,350, 1],
        "830P":     [SOFTBANK,  2.0,    236,365, 1],
        "830SHs":   [SOFTBANK,  2.0,    240,270, 1],
        "830SH":    [SOFTBANK,  2.0,    240,270, 1],
        "824T":     [SOFTBANK,  2.0,    236,341, 1],
        "823T":     [SOFTBANK,  2.0,    236,341, 1],
        "921P":     [SOFTBANK,  2.0,    471,691, 1],
        "824P":     [SOFTBANK,  2.0,    231,341, 1],
        "923SH":    [SOFTBANK,  3.0,    480,754, 1],
        "824SH":    [SOFTBANK,  2.0,    240,350, 1],
        "821N":     [SOFTBANK,  3.0,    240,325, 1],
        "820N":     [SOFTBANK,  3.0,    240,325, 1],
        "825SH":    [SOFTBANK,  2.0,    240,350, 1],
        "823P":     [SOFTBANK,  2.0,    231,341, 1],
        "922SH":    [SOFTBANK,  2.0,    854,384, 1],
        "921T":     [SOFTBANK,  2.0,    236,341, 1],
        "921SH":    [SOFTBANK,  2.0,    480,754, 1],
        "920T":     [SOFTBANK,  2.0,    236,341, 1],
        "920SH":    [SOFTBANK,  2.0,    480,754, 1],
        "920SC":    [SOFTBANK,  2.0,    240,264, 1],
        "920P":     [SOFTBANK,  2.0,    471,691, 1],
        "913SH":    [SOFTBANK,  2.0,    240,350, 1],
        "912T":     [SOFTBANK,  2.0,    236,341, 1],
        "912SH":    [SOFTBANK,  2.0,    480,700, 1],
        "911T":     [SOFTBANK,  2.0,    236,341, 1],
        "911SH":    [SOFTBANK,  2.0,    240,350, 1],
        "910T":     [SOFTBANK,  2.0,    236,261, 1],
        "910SH":    [SOFTBANK,  2.0,    480,540, 1],
        "905SH":    [SOFTBANK,  1.1,    234,350, 1],
        "904T":     [SOFTBANK,  0,      240,261, 1],
        "904SH":    [SOFTBANK,  1.1,    480,540, 1],
        "903T":     [SOFTBANK,  0,      240,261, 1],
        "903SH":    [SOFTBANK,  1.1,    233,264, 1],
        "902T":     [SOFTBANK,  0,      240,261, 1],
        "902SH":    [SOFTBANK,  1.1,    240,264, 1],
        "823SH":    [SOFTBANK,  2.0,    240,350, 1],
        "822T":     [SOFTBANK,  2.0,    236,261, 1],
        "822SH":    [SOFTBANK,  2.0,    240,350, 1],
        "822P":     [SOFTBANK,  2.0,    240,262, 1],
        "821T":     [SOFTBANK,  2.0,    236,245, 1],
        "821SH":    [SOFTBANK,  2.0,    240,350, 1],
        "821SC":    [SOFTBANK,  2.0,    240,264, 1],
        "821P":     [SOFTBANK,  2.0,    240,342, 1],
        "820T":     [SOFTBANK,  2.0,    236,261, 1],
        "820SH":    [SOFTBANK,  2.0,    240,350, 1],
        "820SC":    [SOFTBANK,  2.0,    240,264, 1],
        "820P":     [SOFTBANK,  2.0,    240,342, 1],
        "816SH":    [SOFTBANK,  2.0,    240,270, 1],
        "815T":     [SOFTBANK,  2.0,    236,261, 1],
        "815SH":    [SOFTBANK,  2.0,    480,540, 1],
        "814T":     [SOFTBANK,  2.0,    236,261, 1],
        "814SH":    [SOFTBANK,  2.0,    480,540, 1],
        "813T":     [SOFTBANK,  2.0,    236,261, 1],
        "813SH":    [SOFTBANK,  2.0,    240,270, 1],
        "813SHe":   [SOFTBANK,  2.0,    240,270, 1],
        "812T":     [SOFTBANK,  2.0,    236,261, 1],
        "812SHs":   [SOFTBANK,  2.0,    240,270, 1],
        "812SH":    [SOFTBANK,  2.0,    240,270, 1],
        "811T":     [SOFTBANK,  2.0,    236,261, 1],
        "811SH":    [SOFTBANK,  2.0,    480,540, 1],
        "810T":     [SOFTBANK,  2.0,    236,261, 1],
        "810SH":    [SOFTBANK,  2.0,    480,540, 1],
        "810P":     [SOFTBANK,  2.0,    240,262, 1],
        "805SC":    [SOFTBANK,  0,      230,264, 1],
        "804SS":    [SOFTBANK,  0,      240,264, 1],
        "804SH":    [SOFTBANK,  1.1,    233,264, 1],
        "804NK":    [SOFTBANK,  0,      240,267, 1],
        "804N":     [SOFTBANK,  0,      240,270, 1],
        "803T":     [SOFTBANK,  0,      240,261, 1],
        "802SH":    [SOFTBANK,  1.1,    240,264, 1],
        "802SE":    [SOFTBANK,  1.1,    176,182, 1],
        "802N":     [SOFTBANK,  0,      240,269, 1],
        "709SC":    [SOFTBANK,  0,      230,264, 1],
        "708SC":    [SOFTBANK,  0,      310,186, 1],
        "707SC2":   [SOFTBANK,  0,      230,264, 1],
        "707SC":    [SOFTBANK,  0,      230,264, 1],
        "706SC":    [SOFTBANK,  0,      230,264, 1],
        "706P":     [SOFTBANK,  0,      236,258, 1],
        "706N":     [SOFTBANK,  0,      233,269, 1],
        "705T":     [SOFTBANK,  0,      240,261, 1],
        "705SH":    [SOFTBANK,  1.1,    240,270, 1],
        "705SC":    [SOFTBANK,  0,      230,264, 1],
        "705P":     [SOFTBANK,  0,      236,258, 1],
        "705NK":    [SOFTBANK,  0,      240,267, 1],
        "705N":     [SOFTBANK,  0,      233,269, 1],
        "703SHf":   [SOFTBANK,  1.1,    233,264, 1],
        "703SH":    [SOFTBANK,  1.1,    233,264, 1],
        "703N":     [SOFTBANK,  0,      240,270, 1],
        "702sMO":   [SOFTBANK,  0,      176,182, 1],
        "V702NK2":  [SOFTBANK,  0,      176,173, 1],
        "V702NK":   [SOFTBANK,  0,      176,173, 1],
        "702MO":    [SOFTBANK,  0,      176,182, 1],
        "DM008SH":  [SOFTBANK,  3.1,    240,350, 1], // 2010
        "DM007SH":  [SOFTBANK,  3.1,    480,754, 1], // 2010
        "DM006SH":  [SOFTBANK,  3.0,    240,350, 1], // 2010
        "DM005SH":  [SOFTBANK,  3.1,    480,754, 1], // 2010
        "DM004SH":  [SOFTBANK,  3.0,    240,350, 1], // 2009
        "DM003SH":  [SOFTBANK,  2.0,    240,350, 1], // 2008
        "DM002SH":  [SOFTBANK,  2.0,    240,350, 1], // 2008
        "DM001SH":  [SOFTBANK,  2.0,    240,350, 1], // 2008
        // --- Vodafone ---
        /*
        "V905SH":   [VODAFONE,  1.1,    234,350, 1],
        "V904T":    [VODAFONE,  0,      240,261, 1],
        "V904SH":   [VODAFONE,  1.1,    480,540, 1],
        "V903T":    [VODAFONE,  0,      240,261, 1],
        "V903SH":   [VODAFONE,  1.1,    233,264, 1],
        "V902T":    [VODAFONE,  0,      240,261, 1],
        "V902SH":   [VODAFONE,  1.1,    240,264, 1],
        "V804SS":   [VODAFONE,  0,      240,264, 1],
        "V804SH":   [VODAFONE,  1.1,    233,264, 1],
        "V804NK":   [VODAFONE,  0,      240,267, 1],
        "V804N":    [VODAFONE,  0,      240,270, 1],
        "V803T":    [VODAFONE,  0,      240,261, 1],
        "V802SH":   [VODAFONE,  1.1,    240,264, 1],
        "V802SE":   [VODAFONE,  1.1,    176,182, 1],
        "V802N":    [VODAFONE,  0,      240,269, 1],
        "V705T":    [VODAFONE,  0,      240,261, 1],
        "V705SH":   [VODAFONE,  1.1,    240,270, 1],
        "V703SHf":  [VODAFONE,  1.1,    233,264, 1],
        "V703SH":   [VODAFONE,  1.1,    233,264, 1],
        "V703N":    [VODAFONE,  0,      240,270, 1],
        "V702NK2":  [VODAFONE,  0,      176,173, 1],
        "V702NK":   [VODAFONE,  0,      176,173, 1],
         */
};

// --- validate / assertions -------------------------------
//{@dev
function $valid(val, fn, hint) { if (global["Valid"]) { global["Valid"](val, fn, hint); } }
function $type(obj, type) { return global["Valid"] ? global["Valid"].type(obj, type) : true; }
function $keys(obj, str) { return global["Valid"] ? global["Valid"].keys(obj, str) : true; }
function $some(val, str, ignore) { return global["Valid"] ? global["Valid"].some(val, str, ignore) : true; }
//function $args(fn, args) { if (global["Valid"]) { global["Valid"].args(fn, args); } }
//}@dev

// --- exports ---------------------------------------------
if ("process" in global) {
    module["exports"] = FPSpec;
}
global["FPSpec" in global ? "FPSpec_" : "FPSpec"] = FPSpec; // switch module. http://git.io/Minify

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule

