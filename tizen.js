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

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            var script = document.createElement('script');
            script.src = src;
            script.type = 'text/javascript';
            window.scriptReady = false;

            script.onload = function () {
                const checkReady = () => {
                    if (window.scriptReady) {
                        resolve();
                    } else {
                        setTimeout(checkReady, 100);
                    }
                };
                checkReady();
            };

            script.onerror = function () {
                reject(new Error(`SmartHubPreview not loaded ${src}`));
            };

            document.head.appendChild(script);
        });
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
                    //console.log('Refresh SmartHubPrewiev on exit...');
                    //await loadScript('../smarthub.js');
                    //postMessage('AppHost.exit');
                    tizen.application.getCurrentApplication().exit();
                } catch (error) {
                    console.error('Error:', error.message);
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
                        var serverid = JSON.parse(actionData).serverid
                        var id = JSON.parse(actionData).id

                        // Construct the URL for the details page and redirect
                        var newUrl = "file:///www/index.html#/details?id=" + id + "&serverId=" + serverid;
                        window.location.href = newUrl;
                        console.log(newUrl);

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
