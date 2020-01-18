var gulp = require('gulp');
var gulpif = require('gulp-if');
var del = require('del');
var dom = require('gulp-dom');
var path = require('path');

// Allow overriding of jellyfin-web directory
var WEB_DIR = process.env.JELLYFIN_WEB_DIR || 'node_modules/jellyfin-web/dist';
WEB_DIR = path.resolve(WEB_DIR);
console.info('Using jellyfin-web from', WEB_DIR);

var paths = {
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
            var meta = this.createElement('meta');
            meta.setAttribute('http-equiv', 'Content-Security-Policy');
            meta.setAttribute('content', 'default-src * \'self\' \'unsafe-inline\' \'unsafe-eval\' data: gap: file: filesystem: ws: wss:;');
            this.head.appendChild(meta);

            // inject appMode script
            var appMode = this.createElement('script');
            appMode.text = 'window.appMode=\'cordova\';';
            this.body.appendChild(appMode);

            // inject tizen.js
            var tizen = this.createElement('script');
            tizen.setAttribute('src', '../tizen.js');
            tizen.setAttribute('defer', '');
            this.body.appendChild(tizen);

            // inject apploader.js
            var apploader = this.createElement('script');
            apploader.setAttribute('src', 'scripts/apploader.js');
            apploader.setAttribute('defer', '');
            this.body.appendChild(apploader);

            return this;
        }))
        .pipe(gulp.dest(paths.index.dest))
}

// Default build task
var build = gulp.series(
    clean,
    gulp.parallel(copy, modifyIndex)
);

// Export tasks so they can be run individually
exports.clean = clean;
exports.copy = copy;
exports.modifyIndex = modifyIndex;
// Export default task
exports.default = build;
