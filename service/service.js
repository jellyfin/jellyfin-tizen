var pkg_id = 'AprZAARz4r'
var app_id = 'AprZAARz4r.Jellyfin'
var remote_message_port = undefined;
var local_message_port = undefined;
//var message_port_listener = undefined;
var watchId = undefined;

function onReceived(data, remoteMsgPort) {

    /*remote_message_port = tizen.messageport.requestRemoteMessagePort(app_id, "AprZAARz4r.DataChannel");
    const dataa = [{key: "KEY", value: "Valasz"}];
    remote_message_port.sendMessage(dataa);*/
    //console.log('onReceived : ' + JSON.stringify(data) + ' remotePort : ' + remoteMsgPort);
    sendMessage("KEY", "Recieved!!!!!!")
    console.log("service start");
};

function sendMessage(key, value) {
    if (remote_message_port === undefined) {
        remote_message_port = tizen.messageport.requestRemoteMessagePort(app_id, "AprZAARz4r.DataChannel");
    }
    remote_message_port.sendMessage([{ key, value }]);
    console.error("Message port is undefined");

}

module.exports.onStart = function () {
    //console.log("onStart is called");
    //pkg_id = tizen.application.getCurrentApplication().appInfo.packageId;
    //app_id = tizen.application.getCurrentApplication().appInfo.id;

    try {
        if (remote_message_port === undefined) {
            remote_message_port = tizen.messageport.requestRemoteMessagePort(app_id, "AprZAARz4r.DataChannel");
        }
        sendMessage("KEY", "Service Started with id:" + pkg_id)

        try {
            local_message_port = tizen.messageport.requestLocalMessagePort("CHANNEL2");
            watchId = local_message_port.addMessagePortListener(onReceived);
            sendMessage("KEY", "WatchID :" + watchId)
        }
        catch (e) {
            sendMessage("KEY", "Error " + e.message)
            //const data4 = [{ key: "KEY", value: "Error" + e.message }];
            //remote_message_port.sendMessage(data4);
        }

    }
    catch (e) {
        sendMessage("KEY", "Error " + e.message)
    }

};

module.exports.onRequest = function () {
    try {
        console.log('Request Callback');
        var reqAppControl = tizen.application.getCurrentApplication().getRequestedAppControl();
        if (!!reqAppControl) {

            if (reqAppControl.appControl.data[0].key == 'Preview') {
                var previewData = reqAppControl.appControl.data[0].value;
                var previewData2 = JSON.parse(previewData);
                sendMessage("KEY", "Preview Data recieved:" + previewData)

                try {
                    webapis.preview.setPreviewData(JSON.stringify(previewData2),
                        function () {
                            console.log('setPreviewData SuccessCallback');
                            // please terminate service after setting preview data
                            sendMessage("KEY", "Preview Set!")
                            tizen.application.getCurrentApplication().exit();
                        },
                        function (e) {
                            console.log('PreviewData Setting failed : ' + e.message);
                            sendMessage("KEY", 'PreviewData Setting failed : ' + e.message)
                        }
                    );
                }
                catch (e) {
                    sendMessage("KEY", 'PreviewData Setting exception : ' + e.message)
                }
            }
            local_message_port = tizen.messageport.requestLocalMessagePort("CHANNEL2");
            watchId = local_message_port.addMessagePortListener(onReceived);
        }
        else {
            sendMessage("KEY", 'Unknown Request ')
        }
    }
    catch (e) {
        sendMessage("KEY", 'On error exception : ' + e.message)
    }
}


module.exports.onStop = function () {
    console.log("onStop is called");
    sendMessage("KEY", 'on Stop: : ')
};


module.exports.onExit = function () {
    console.log("onExit is callback");
    sendMessage("KEY", 'Exit Callback')
} 