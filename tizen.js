'use strict';

console.log('Tizen adapter');

window.addEventListener('load', function() {
    tizen.tvinputdevice.registerKey('MediaPlay');
    tizen.tvinputdevice.registerKey('MediaPause');
    tizen.tvinputdevice.registerKey('MediaTrackPrevious');
    tizen.tvinputdevice.registerKey('MediaTrackNext');
    tizen.tvinputdevice.registerKey('MediaRewind');
    tizen.tvinputdevice.registerKey('MediaFastForward');

    require(['inputManager', 'focusManager', 'viewManager', 'appRouter', 'actionsheet'], function(inputManager, focusManager, viewManager, appRouter, actionsheet) {
        const commands = {
            '10009': 'back',
            '19': 'pause',
            '415': 'play',
            '10232': 'previoustrack',
            '10233': 'nexttrack',
            '412': 'rewind',
            '417': 'fastforward'
        };

        var historyStartup;
        var historyDepth = 0;
        var exitPromise;

        document.addEventListener('keydown', function(e) {
            var command = commands[e.keyCode];

            if (command) {
                if (command === 'back' && historyDepth < 2 && !exitPromise) {
                    exitPromise = actionsheet.show({
                        title: Globalize.translate('Exit?'),
                        items: [
                            {id: 'yes', name: Globalize.translate('Yes')},
                            {id: 'no', name: Globalize.translate('No')}
                        ]
                    }).then(function (value) {
                        exitPromise = null;

                        if (value === 'yes') {
                            try {
                                tizen.application.getCurrentApplication().exit();
                            } catch (ignore) {}
                        }
                    },
                    function () {
                        exitPromise = null;
                    });
                    return;
                }

                inputManager.trigger(command);
            }
        });

        window.addEventListener('pushState', function(e) {
            // Reset history on some pages

            var path = e.arguments && e.arguments[2] ? e.arguments[2] : '';
            var pos = path.indexOf('?');
            path = path.substring(0, pos !== -1 ? pos : path.length);

            switch (path) {
            case '#!/home.html':
                if (!historyStartup || historyStartup !== path) {
                    historyStartup = path;
                    historyDepth = 0;
                }
                break;
            case '#!/selectserver.html':
            case '#!/login.html':
                historyStartup = path;
                historyDepth = 0;
                break;
            }

            historyDepth++;
        });

        window.addEventListener('popstate', function() {
            historyDepth--;
        });

        // Add 'pushState' and 'replaceState' events
        var _wr = function(type) {
            var orig = history[type];
            return function() {
                var rv = orig.apply(this, arguments);
                var e = new Event(type);
                e.arguments = arguments;
                window.dispatchEvent(e);
                return rv;
            };
        };
        history.pushState = _wr('pushState');
        history.replaceState = _wr('replaceState');
    });
});
