var packageId = tizen.application.getCurrentApplication().appInfo.packageId;
var applicationId = packageId + '.Jellyfin'
var remoteMessagePort = undefined;
var localMessagePort = undefined;
var watchId = undefined;
var isServiceStarted = false;

/**
 * Handles incoming messages from the local message port.
 *
 * @param {Array} data - Array of key-value pairs received via the message port.
 * @param {Object} remoteMsgPort - The remote message port instance that sent the message.
 */

function onReceived(data, remoteMsgPort) {

    sendMessage("Key0 " + data[0].key)

    if (data[0].key == "Preview") {

        var previewData = data[0].value;
        sendMessage("Preview Data recieved:" + previewData)
        var previewData2 = JSON.parse(previewData);

        try {
            webapis.preview.setPreviewData(JSON.stringify(previewData2),
                function () {
                    console.log('Preview Set!');
                    sendMessage("Preview Set!")
                    // please terminate service after setting preview data
                    tizen.application.getCurrentApplication().exit();
                },
                function (e) {
                    console.log('PreviewData Setting failed : ' + e.message);
                    sendMessage('PreviewData Setting failed : ' + e.message)
                }
            );
        }
        catch (e) {
            sendMessage('PreviewData Setting exception : ' + e.message)
            console.log('PreviewData Setting failed : ' + e.message);
        }


    }
}; 


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
        remoteMessagePort .sendMessage([{ key, value }]);
    } catch (e) {
        console.error("Error sending message:", e.message);
    }
    } else {
        console.log("Message port is undefined");
    }

}

/**
 * Starts the service by setting up a local message port and listener.
 */
function start() {
    if (isServiceStarted) {
        console.log("Service already started.");
        sendMessage("Service already started.")
        return;
    }
        try {
            sendMessage("Service Started:" + packageId )

            localMessagePort  = tizen.messageport.requestLocalMessagePort(packageId);
            watchId = localMessagePort.addMessagePortListener(onReceived);

            /* For debugging purposes, somehow it is not working on the emulator. */
            sendMessage("WatchID :" + watchId)
            isServiceStarted = true;
            console.log("Service started successfully.");
            sendMessage("Service started successfully.");

        }
        catch (e) {
            sendMessage("Creating of local port not sucessfull: " + e.message)
            console.log("Creating of local port not sucessfull: " + e.message);
        }
    
}


function handleDataInRequest()
{
    try {
       
        var reqAppControl = tizen.application.getCurrentApplication().getRequestedAppControl();
        if (!!reqAppControl) {

            if (reqAppControl.appControl.data[0].key == 'Preview') {
                var previewData = reqAppControl.appControl.data[0].value;
                var previewData2 = JSON.parse(previewData);
                sendMessage("Preview Data recieved:" + previewData)

                try {
                    webapis.preview.setPreviewData(JSON.stringify(previewData2),
                        function () {
                            console.log('setPreviewData SuccessCallback');
                            // please terminate service after setting preview data
                            sendMessage("Preview Set!")
                            tizen.application.getCurrentApplication().exit();
                        },
                        function (e) {
                            console.log('PreviewData Setting failed : ' + e.message);
                            sendMessage('PreviewData Setting failed : ' + e.message)
                        }
                    );
                }
                catch (e) {
                    sendMessage('PreviewData Setting exception : ' + e.message)
                }
            }
   
        }
        else
        {
            sendMessage('Unknown Request ')
        }  
    }
    catch (e) {
        sendMessage('On error exception : ' + e.message)
    }
}

module.exports.onStart = function () {
    start();
    sendMessage("OnStart recieved")
};

module.exports.onRequest = function () {
        start();
        sendMessage("onRequest recieved");
        handleDataInRequest();
}


module.exports.onStop = function () {
    console.log("Service stopping...");
    sendMessage("Service stopping...");
};


module.exports.onExit = function () {
    console.log("Service exiting...");
    sendMessage("Service exiting...");
} 