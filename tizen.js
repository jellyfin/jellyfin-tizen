'use strict';

console.log('Tizen adapter');

window.addEventListener('load', function() {

    //console.log(JSON.stringify(tizen.tvinputdevice.getSupportedKeys()));

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

        var isRestored;
        var lastActiveElement;
        var historyStartup;
        var historyDepth = 0;
        var exitPromise;

        //document.addEventListener('keypress', function(e) {
        //    console.log('keypress');
        //});

        //document.addEventListener('keyup', function(e) {
        //    console.log('keyup');
        //});

        document.addEventListener('keydown', function(e) {
            //console.log('keydown: keyCode: ' + e.keyCode + ' key: ' + e.key + ' location: ' + e.location);

            var command = commands[e.keyCode];

            if (command) {
                //console.log('command: ' + command);

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

        document.addEventListener('click', function() {
            lastActiveElement = document.activeElement;
        });

        document.addEventListener('viewhide', function() {
            lastActiveElement = document.activeElement;
        });

        function onPageLoad() {
            console.debug('onPageLoad ' + window.location.href + ' isRestored=' + isRestored);

            if (isRestored) {
                return;
            }

            var view = viewManager.currentView() || document.body;

            var element = lastActiveElement;
            lastActiveElement = null;

            // These elements are recreated
            if (element) {
                if (element.classList.contains('btnPreviousPage')) {
                    element = view.querySelector('.btnPreviousPage');
                } else if (element.classList.contains('btnNextPage')) {
                    element = view.querySelector('.btnNextPage');
                }
            }

            if (element && focusManager.isCurrentlyFocusable(element)) {
                focusManager.focus(element);
            } else {
                element = focusManager.autoFocus(view);
            }
        }

        // Starts listening for changes in the '.loading-spinner' HTML element
        function installMutationObserver() {
            var mutationObserver = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    console.debug(mutation.type);
                    if (mutation.target.classList.contains('hide')) {
                        onPageLoad();
                    }
                });
            });

            var spinner = document.querySelector('.loading-spinner');

            if (spinner) {
                mutationObserver.observe(spinner, { attributes : true });
                document.removeEventListener('viewshow', installMutationObserver);
            }
        }
        document.addEventListener('viewshow', installMutationObserver);

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

            isRestored = false;

            //console.log('history: ' + historyDepth + ', ' + historyStartup);
        });

        window.addEventListener('popstate', function() {
            historyDepth--;
            isRestored = true;
            //console.log('history: ' + historyDepth + ', ' + historyStartup);
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
