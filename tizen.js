(function () {
    'use strict';

    console.log('Tizen adapter');

    // Similar to jellyfin-web
    function generateDeviceId() {
        return btoa([navigator.userAgent, new Date().getTime()].join('|')).replace(/=/g, '1');
    }

    function getDeviceId() {
        // Use variable '_deviceId2' to mimic jellyfin-web

        var deviceId = localStorage.getItem('_deviceId2');

        if (!deviceId) {
            deviceId = generateDeviceId();
            localStorage.setItem('_deviceId2', deviceId);
        }

        return deviceId;
    }

    var AppInfo = {
        deviceId: getDeviceId(),
        deviceName: 'Samsung Smart TV',
        appName: 'Jellyfin for Tizen',
        appVersion: tizen.application.getCurrentApplication().appInfo.version
    };

    // List of supported features
    var SupportedFeatures = [
        'exit',
        'exitmenu',
        'externallinkdisplay',
        'htmlaudioautoplay',
        'htmlvideoautoplay',
        'physicalvolumecontrol',
        'displaylanguage',
        'otherapppromotions',
        'targetblank',
        'screensaver',
        'multiserver',
        'subtitleappearancesettings',
        'subtitleburnsettings'
    ];

    var systeminfo;

    function getSystemInfo() {
        if (systeminfo) {
            return Promise.resolve(systeminfo);
        }

        return new Promise(function (resolve) {
            tizen.systeminfo.getPropertyValue('DISPLAY', function (result) {
                var devicePixelRatio = 1;

                if (typeof webapis.productinfo.is8KPanelSupported === 'function' && webapis.productinfo.is8KPanelSupported()){
                    console.log("8K UHD is supported");
                    devicePixelRatio = 4;
                } else if (typeof webapis.productinfo.isUdPanelSupported === 'function' && webapis.productinfo.isUdPanelSupported()){
                    console.log("4K UHD is supported");
                    devicePixelRatio = 2;
                } else {
                    console.log("UHD is not supported");
                }

                systeminfo = Object.assign({}, result, {
                    resolutionWidth: Math.floor(result.resolutionWidth * devicePixelRatio),
                    resolutionHeight: Math.floor(result.resolutionHeight * devicePixelRatio)
                });

                resolve(systeminfo)
            });
        });
    }

    function postMessage() {
        console.log.apply(console, arguments);
    }

    window.NativeShell = {
        AppHost: {
            init: function () {
                postMessage('AppHost.init', AppInfo);
                return getSystemInfo().then(function () {
                    return Promise.resolve(AppInfo);
                });
            },

            appName: function () {
                postMessage('AppHost.appName', AppInfo.appName);
                return AppInfo.appName;
            },

            appVersion: function () {
                postMessage('AppHost.appVersion', AppInfo.appVersion);
                return AppInfo.appVersion;
            },

            deviceId: function () {
                postMessage('AppHost.deviceId', AppInfo.deviceId);
                return AppInfo.deviceId;
            },

            deviceName: function () {
                postMessage('AppHost.deviceName', AppInfo.deviceName);
                return AppInfo.deviceName;
            },

            exit: async function () {
                try {
                    await runSmartViewUpdate();
                    tizen.application.getCurrentApplication().exit();
                } catch (error) {
                    console.error('Error:', error.message);
                    tizen.application.getCurrentApplication().exit();
                }
            },

            getDefaultLayout: function () {
                postMessage('AppHost.getDefaultLayout', 'tv');
                return 'tv';
            },

            getDeviceProfile: function (profileBuilder) {
                postMessage('AppHost.getDeviceProfile');
                return profileBuilder({ enableMkvProgressive: false, enableSsaRender: true });
            },

            getSyncProfile: function (profileBuilder) {
                postMessage('AppHost.getSyncProfile');
                return profileBuilder({ enableMkvProgressive: false });
            },

            screen: function () {
                return systeminfo ? {
                    width: systeminfo.resolutionWidth,
                    height: systeminfo.resolutionHeight
                } : null;
            },

            supports: function (command) {
                var isSupported = command && SupportedFeatures.indexOf(command.toLowerCase()) != -1;
                postMessage('AppHost.supports', {
                    command: command,
                    isSupported: isSupported
                });
                return isSupported;
            }
        },

        downloadFile: function (url) {
            postMessage('downloadFile', { url: url });
        },

        enableFullscreen: function () {
            postMessage('enableFullscreen');
        },

        disableFullscreen: function () {
            postMessage('disableFullscreen');
        },

        getPlugins: function () {
            postMessage('getPlugins');
            return [];
        },

        openUrl: function (url, target) {
            postMessage('openUrl', {
                url: url,
                target: target
            });
        },

        updateMediaSession: function (mediaInfo) {
            postMessage('updateMediaSession', { mediaInfo: mediaInfo });
        },

        hideMediaSession: function () {
            postMessage('hideMediaSession');
        }
    };

    window.addEventListener('load', function () {
        tizen.tvinputdevice.registerKey('MediaPlay');
        tizen.tvinputdevice.registerKey('MediaPause');
        tizen.tvinputdevice.registerKey('MediaStop');
        tizen.tvinputdevice.registerKey('MediaTrackPrevious');
        tizen.tvinputdevice.registerKey('MediaTrackNext');
        tizen.tvinputdevice.registerKey('MediaRewind');
        tizen.tvinputdevice.registerKey('MediaFastForward');
    });

    function updateKeys() {
        if (location.hash.indexOf('/queue') !== -1 || location.hash.indexOf('/video') !== -1) {
            // Disable on-screen playback control, if available on the page
            tizen.tvinputdevice.registerKey('MediaPlayPause');
        } else {
            tizen.tvinputdevice.unregisterKey('MediaPlayPause');
        }
    }

    window.addEventListener('viewshow', updateKeys);

    /**
     * Handles deep linking by processing requested application control data
     * to retrieve payload information and redirect to a specific URL.
     *  *
     * @see https://developer.samsung.com/smarttv/develop/guides/smart-hub-preview/implementing-public-preview.html#implementing-public-preview-deep-links
     */
    var text = '';
    function deepLink() {

        // Retrieve the app control request for the current application
        var requestedAppControl = tizen.application.getCurrentApplication().getRequestedAppControl();
        var appControlData; // Stores app control data
        var actionData; // Stores parsed action data

        if (requestedAppControl) {
            // Retrieve app control data
            appControlData = requestedAppControl.appControl.data; // get appcontrol data. action_data is in it.
            text = 'appControlData : ' + JSON.stringify(appControlData);
            console.log(text);

            // Iterate over app control data to find the PAYLOAD key
            for (var i = 0; i < appControlData.length; i++) {
                if (appControlData[i].key == 'PAYLOAD') {

                    // Parse the PAYLOAD value to extract action data
                    actionData = JSON.parse(appControlData[i].value[0]).values;
                    console.log('Get element info ' + actionData);

                    // If the action data contains a server ID, assume it is a valid Jellifyn link
                    if (JSON.parse(actionData).serverid) {
                        var serverid = JSON.parse(actionData).serverid;
                        var id = JSON.parse(actionData).id;
                        var type = JSON.parse(actionData).type;
                        var seasonid = JSON.parse(actionData).seasonid;
                        var seriesid = JSON.parse(actionData).seriesid;


                        /* Based on  Deep-link Return Key Policy ( https://developer.samsung.com/smarttv/develop/guides/smart-hub-preview/smart-hub-preview.html#Deep-link-Return-Key-Policy)
                           From a detail page within an application, clicking the “Return/Exit” key must display the previous page in the application.
                           https://developer.samsung.com/media/2424/uxguidelines4.png
                        */
                        history.pushState({}, '', 'file:///www/home.html');
                        if (type =='episode')
                        {
                            history.pushState({}, '', 'file:///www/index.html#/tv.html');
                            history.pushState({}, '', "file:///www/index.html#/details?id=" + seriesid + "&serverId=" + serverid);
                            history.pushState({}, '', "file:///www/index.html#/details?id=" + seasonid + "&serverId=" + serverid);

                        }
                        if (type =='movie')
                        {
                            history.pushState({}, '', 'file:///www/index.html#/movies.html');
                        }
                        // Construct the URL for the details page and redirect
                        history.pushState({}, '', "file:///www/index.html#/details?id=" + id + "&serverId=" + serverid);


                    }
                }
            }
        } else {
            console.log('no req app control');
        }
    }


    // add appcontrol event with deepLink function
    window.addEventListener('appcontrol', deepLink);
    // call deepLink function for first load
    deepLink();

})();
