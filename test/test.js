var ModuleTestFPSpec = (function(global) {

var _runOnNode = "process" in global;
var _runOnWorker = "WorkerLocation" in global;
var _runOnBrowser = "document" in global;

return new Test("FPSpec", {
        disable:    false,
        browser:    true,
        worker:     true,
        node:       true,
        button:     true,
        both:       true, // test the primary module and secondary module
    }).add([
        testFPSpec,
    ]).run().clone();

function testFPSpec(test, pass, miss) {
    var spec1 = new FPSpec({ USER_AGENT: "DoCoMo/2.0 P07A3(c500;TB;W24H15)" });
    var spec2 = new FPSpec({ USER_AGENT: "KDDI-TS3H UP.Browser/6.2_7.2.7.1.K.1.400 (GUI) MMP/2.0" });
    var spec3 = new FPSpec({ USER_AGENT: "Vodafone/1.0/V905SH/SHJ001[/Serial] Browser/VF-NetFront/3.3 Profile/MIDP-2.0 Configuration/CLDC-1.1" });
    var spec4 = new FPSpec({ USER_AGENT: "SoftBank/1.0/301P/PJP10[/Serial] Browser/NetFront/3.4 Profile/MIDP-2.0 Configuration/CLDC-1.1" });

    var hasDevice = [
            spec1.hasDeviceID("P07A3") === true,
            spec2.hasDeviceID("TS3H")  === true,
            spec3.hasDeviceID("905SH") === true,
            spec4.hasDeviceID("301P")  === true];

    var canUTF8 = [
            spec1.canDeviceFeature("UTF-8") === true,
            spec2.canDeviceFeature("UTF-8") === true,
            spec3.canDeviceFeature("UTF-8") === true,
            spec4.canDeviceFeature("UTF-8") === true];

    var browserVersion = [
            spec1.getBrowserVersion() === 2.0,
            spec2.getBrowserVersion() === 7.2,
            spec3.getBrowserVersion() === 1.0,
            spec4.getBrowserVersion() === 1.0];

    var flashLiteVersion = [
            spec1.getFlashLiteVersion() === 3.1,
            spec2.getFlashLiteVersion() === 2.0,
            spec3.getFlashLiteVersion() === 1.1,
            spec4.getFlashLiteVersion() === 3.1];

    if ( !/false/.test(hasDevice.join(",")) &&
         !/false/.test(canUTF8.join(",")) &&
         !/false/.test(browserVersion.join(",")) &&
         !/false/.test(flashLiteVersion.join(",")) ) {
        test.done(pass());
    } else {
        test.done(miss());
    }
}

})((this || 0).self || global);

