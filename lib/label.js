"use strict";
var github = require('./github'),
    funk = require('./funk'),
    q = require('q');
    
var LEGACY_NAMES = {
    "canvas2d": "2dcontext",
    "crypto-api": "WebCryptoAPI",
    "csp": "CSP",
    "DOMCore": "dom",
    "pagevisibility": "page-visibility",
    "PointerEvents": "pointerevents",
    "ProgressEvents": "progress-events",
    "SelectorsAPI": "selectors-api",
    "ServerSentEvents": "eventsource",
    "ShadowDOM": "shadow-dom",
    "WebMessaging": "webmessaging",
    "WebSockets": "websockets",
    "WebStorage": "webstorage",
    "Workers": "workers",
    "imports": "html-imports"
};

var LABEL_TO_FILENAMES = {
    "assets": ["fonts", "images", "media", "common"],
    "infra": [
        ".gitignore",
        ".gitmodules",
        ".htaccess",
        "CONTRIBUTING.md",
        "examples",
        "harness",
        "LICENSE",
        "README.md",
        "reporting",
        "resources",
        "tools",
        "tr-mappings.json"
    ],
    "old-tests": ["old-tests"]
};

exports.setLabelsOnIssues = setLabelsOnIssues;
function setLabelsOnIssues(state) {
    if (state != "closed") state = "open";
    return github.get("/repos/:owner/:repo/pulls?state=:state", { state: state }).then(function(pull_requests) {
        var promises = pull_requests.map(funk.compose(setLabelsOnIssue, funk.prop('number')));
        return q.all(promises);
    });
}

exports.setLabelsOnIssue = setLabelsOnIssue;
function setLabelsOnIssue(issue) {
    return getLabelsFromIssue(issue).then(funk.curry(setLabels, issue));
}

function _getRootDir(url) {
    return url.split('/')[0]
}

function _legacyNames(k) {
    return LEGACY_NAMES[k] || k;
}

function _specialLabels(dirname) {
    for (var label in LABEL_TO_FILENAMES) {
        if (LABEL_TO_FILENAMES[label].indexOf(dirname) > -1) {
            return label;
        }
    }
    return dirname;
}

function _unique(array) {
    var output = []
    array.forEach(function(item) {
        if (output.indexOf(item) < 0) {
            output.push(item);
        }
    });
    return output;
}

exports.getLabelsFromIssue = getLabelsFromIssue;
function getLabelsFromIssue(issue) {
    return github.get("/repos/:owner/:repo/pulls/:number/files", { number: issue }).then(getLabelsFromFiles);
}

exports.getLabelsFromFiles = getLabelsFromFiles;
function getLabelsFromFiles(files) {
    return _unique(files.map(funk.compose(_specialLabels, _legacyNames, _getRootDir, funk.prop('filename'))));
}

exports.setLabels = setLabels;
function setLabels(issue, labels) {
    return github.post('/repos/:owner/:repo/issues/:number/labels', labels, { number: issue }).then(function(labels) {
        return labels.map(funk.prop('name'));
    });
}

exports.getLabels = getLabels;
function getLabels(issue) {
    return github.get('/repos/:owner/:repo/issues/:number/labels', { number: issue }).then(function(labels) {
        return labels.map(funk.prop('name'));
    });
}

var _isDir = funk.compose(funk.curry(funk.equal, 'dir'), funk.prop('type'));
exports.getLabelNames = getLabelNames;
function getLabelNames() {
    return github.get("/repos/:owner/:repo/contents/").then(function(body) {
        return body.filter(_isDir).map(funk.prop('name'));
    });
}

if (require.main === module) {
    setLabelsOnIssues("open").then(console.log).then(funk.curry(setLabelsOnIssues, "closed")).then(console.log).fail(console.log);
}
