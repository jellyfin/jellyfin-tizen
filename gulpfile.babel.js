import fs from 'fs';
import gulp from 'gulp';
import gulpif from 'gulp-if';
import { deleteAsync as del } from 'del';
import dom from 'gulp-dom';
import path from 'path';
import scan from 'gulp-scan';

// Allow overriding of jellyfin-web directory
let WEB_DIR = process.env.JELLYFIN_WEB_DIR || 'node_modules/jellyfin-web/dist';
WEB_DIR = path.resolve(WEB_DIR);
console.info('Using jellyfin-web from', WEB_DIR);

const DISCARD_UNUSED_FONTS = !!process.env.DISCARD_UNUSED_FONTS;

const paths = {
    assets: {
        src: [
            WEB_DIR + '/**/*',
            '!' + WEB_DIR + '/index.html'
        ],
        dest: 'www/'
    },
    index: {
        src: WEB_DIR + '/index.html',
        dest: 'www/'
    }
};

// Clean the www directory
function clean() {
    return del([
        'www'
    ]);
}

// Search for used fonts and add them to assets
function searchFonts() {
    if (!DISCARD_UNUSED_FONTS) return Promise.resolve('skipped');

    const assets = paths.assets.src;

    assets.push('!' + WEB_DIR + '/*.woff2');

    return gulp.src(WEB_DIR + '/main*.js')
        .pipe(scan({
            term: /[a-z0-9._-]*\.woff2/gi,
            fn: function (match) {
                const font = WEB_DIR + '/' + match;
                if (!assets.includes(font) && fs.existsSync(font)) {
                    console.debug(`Found font ${match}`);
                    assets.push(font);
                }
            }
        }));
}

// Copy unmodified assets
function copy() {
    return gulp.src(paths.assets.src)
        .pipe(gulp.dest(paths.assets.dest));
}

// Add required tags to index.html
function modifyIndex() {
    return gulp.src(paths.index.src)
        .pipe(dom(function() {
            // inject CSP meta tag
            const meta = this.createElement('meta');
            meta.setAttribute('http-equiv', 'Content-Security-Policy');
            meta.setAttribute('content', 'default-src * \'self\' \'unsafe-inline\' \'unsafe-eval\' data: gap: file: filesystem: ws: wss:;');
            this.head.appendChild(meta);

            // Search for injected main.bundle
            let apploader = this.querySelector('script[src^=main]');

            if (apploader) {
                console.debug('Found injected main.bundle');
                apploader.setAttribute('defer', '');
            } else {
                // Search for injected apploader
                apploader = this.body.querySelector('script[src*="apploader"]');

                if (apploader) {
                    console.debug('Found injected apploader');
                    apploader.setAttribute('defer', '');
                } else {
                    console.debug('Inject apploader');

                    // inject apploader.js
                    apploader = this.createElement('script');
                    apploader.setAttribute('src', 'scripts/apploader.js');
                    apploader.setAttribute('defer', '');
                    this.body.appendChild(apploader);
                }
            }

            const injectTarget = apploader.parentNode;

            // inject webapis.js
            const webapis = this.createElement('script');
            webapis.setAttribute('src', '$WEBAPIS/webapis/webapis.js');
            injectTarget.insertBefore(webapis, apploader);

            // inject appMode script
            const appMode = this.createElement('script');
            appMode.text = 'window.appMode=\'cordova\';';
            injectTarget.insertBefore(appMode, apploader);

            // inject tizen.js
            const tizen = this.createElement('script');
            tizen.setAttribute('src', '../tizen.js');
            tizen.setAttribute('defer', '');
            injectTarget.insertBefore(tizen, apploader);

            return this;
        }))
        .pipe(gulp.dest(paths.index.dest))
}

// Default build task
const build = gulp.series(
    clean,
    searchFonts,
    gulp.parallel(copy, modifyIndex)
);

// Export tasks so they can be run individually
export {
    clean,
    copy,
    modifyIndex
};
// Export default task
export default build;
