'use strict';

console.log('Tizen adapter');

window.addEventListener('load', function() {
    tizen.tvinputdevice.registerKey('MediaPlay');
    tizen.tvinputdevice.registerKey('MediaPause');
    tizen.tvinputdevice.registerKey('MediaTrackPrevious');
    tizen.tvinputdevice.registerKey('MediaTrackNext');
    tizen.tvinputdevice.registerKey('MediaRewind');
    tizen.tvinputdevice.registerKey('MediaFastForward');
});
