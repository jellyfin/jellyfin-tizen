var packageId = tizen.application.getCurrentApplication().appInfo.packageId;
var applicationId = packageId + '.Jellyfin'
var remoteMessagePort = undefined;


/**
 * Sends a message to Application and write out the log.
 * It is needed because logs are not visible from service
 *
 * @param {string} value - The value to send in the message and wite to console
 */
function logAndSend(value)
{
    console.log(value);
    sendMessage(value);
}

/**
 * Sends a message to the remote message port.
 *
 * @param {string} value - The value to send in the message.
 * @param {string} [key="KEY"] - The key associated with the value. Defaults to "KEY".
 */
function sendMessage(value, key) {
    key = key || "KEY";
    if (remoteMessagePort  === undefined) {
        remoteMessagePort  = tizen.messageport.requestRemoteMessagePort(applicationId, packageId);
    }
    if (remoteMessagePort ) {
        try {
        remoteMessagePort.sendMessage([{ key, value }]);
    } catch (e) {
        console.error("Error sending message:", e.message);
    }
    } else {
        console.log("Message port is undefined");
    }

}

function handleDataInRequest()
{
    try {
        var reqAppControl = tizen.application.getCurrentApplication().getRequestedAppControl();

        if (!!reqAppControl) {
            var appControlData = reqAppControl.appControl.data;

            // Iterate through all keys in appControl.data
            for (var i = 0; i < appControlData.length; i++) {
                var key = appControlData[i].key;
                var value = appControlData[i].value;

                if (key === 'Preview') {
                    var previewData = value;
                    var previewData2 = JSON.parse(previewData);
                    logAndSend("Preview Data received: " + previewData);

                    try {
                        webapis.preview.setPreviewData(
                            JSON.stringify(previewData2),
                            function () {
                                logAndSend("Preview Set!");
                                tizen.application.getCurrentApplication().exit();
                            },
                            function (e) {
                                logAndSend("PreviewData Setting failed: " + e.message);
                            }
                        );
                    } catch (e) {
                        logAndSend("PreviewData Setting exception: " + e.message);
                    }
                } else {
                    logAndSend("Unhandled key: " + key + ", value: " + value);
                }
            }
        }
    }
    catch (e) {
        logAndSend('On error exception : ' + e.message);
    }
}

module.exports.onStart = function () {
    logAndSend('OnStart recieved');
};

module.exports.onRequest = function () {
    logAndSend('onRequest recieved');
    handleDataInRequest();
}


module.exports.onStop = function () {
    logAndSend('Service stopping...');
};


module.exports.onExit = function () {
    logAndSend("Service exiting...");
} 