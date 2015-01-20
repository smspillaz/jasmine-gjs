const Format = imports.format;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Lang = imports.lang;

GObject.ParamFlags.READWRITE = GObject.ParamFlags.READABLE | GObject.ParamFlags.WRITABLE;
String.prototype.format = Format.format;

const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const NORMAL = '\x1b[0m';

function indent(spaces) {
    return ' '.repeat(spaces * 2);
}

function indentLines(str, spaces) {
    return str.split('\n').map((line) => indent(spaces) + line).join('\n');
}

const noopTimer = {
    start: function () {},
    elapsed: function () { return 0; },
};

const ConsoleReporter = new Lang.Class({
    Name: 'ConsoleReporter',
    Extends: GObject.Object,

    Properties: {
        'show-colors': GObject.ParamSpec.boolean('show-colors', 'Show colors',
            'Whether to print color output',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            true),
        'jasmine-core-path': GObject.ParamSpec.string('jasmine-core-path',
            'Jasmine core path',
            'Path to Jasmine core module for stack trace purposes',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            '/nowhere'),
    },

    _init: function (props) {
        props = props || {};

        if (props.hasOwnProperty('print')) {
            this._print = props.print;
            delete props.print;
        }

        this._timer = noopTimer;
        if (props.hasOwnProperty('timer')) {
            this._timer = props.timer;
            delete props.timer;
        }

        if (props.hasOwnProperty('onComplete')) {
            this._onComplete = props.onComplete;
            delete props.onComplete;
        }

        this.parent(props);

        this._failedSpecs = [];
        this._failedSuites = [];
        this._suiteLevel = 0;
        this._specCount = 0;
        this._passingCount = 0;
        this._failureCount = 0;
        this._pendingCount = 0;
    },

    _color: function (str, color) {
        if (typeof color !== 'undefined')
            return this.show_colors? color + str + NORMAL : str;
        return str;
    },

    // default print function that prints to stdout (GJS' built-in print
    // functions, print() and printerr(), unfortunately append newlines to
    // everything)
    _print: (function () {
        const FD_STDOUT = 1;
        let fdstream = new Gio.UnixOutputStream({
            fd: FD_STDOUT,
            close_fd: false,
        });
        let stdout = new Gio.DataOutputStream({
            base_stream: fdstream,
        });
        return function (str) {
            stdout.put_string(str, null);
        };
    })(),

    // Called with an "info" object with the following property:
    //   totalSpecsDefined - number of specs to be run
    jasmineStarted: function (info) {
        this._timer.start();
    },

    jasmineDone: function () {
        if (this._onComplete)
            this._onComplete(this._failureCount === 0);
    },

    // Called with a "result" object with the following properties:
    //   id - a string unique to this suite
    //   description - the name of the suite passed to describe()
    //   fullName - the full name including the names of parent suites
    //   failedExpectations - a list of failures in this suite
    suiteStarted: function (result) {
        this._suiteLevel++;
    },

    // Called with the same object as suiteStarted(), with an extra property:
    //   status - "disabled", "failed", or "finished"
    suiteDone: function (result) {
        this._suiteLevel--;
        if (result.failedExpectations && result.failedExpectations.length > 0) {
            this._failureCount++;
            this._failedSuites.push(result);
        }
    },

    // Called with a "result" object with the following properties:
    //   id - a string unique to this spec
    //   description: the name of the spec passed to it()
    //   fullName - the full name concatenated with the suite's full name
    //   failedExpectations - a list of failures in this spec
    //   passedExpectations - a list of succeeded expectations in this spec
    specStarted: function (result) {
        this._specCount++;
    },

    // Called with the same object as specStarted(), with an extra property:
    //   status - "disabled", "pending", "failed", or "passed"
    specDone: function (result) {
        if (result.status === 'passed') {
            this._passingCount++;
        } else if (result.status === 'pending') {
            this._pendingCount++;
        } else if (result.status === 'failed') {
            this._failureCount++;
            this._failedSpecs.push(result);
        }
    },

    filterStack: function (stack) {
        return stack.split('\n').filter((stackLine) => {
            return stackLine.indexOf(this.jasmine_core_path) === -1;
        }).join('\n');
    },
});

// This reporter has very nearly the same behaviour to Jasmine's default console
// reporter.
const DefaultReporter = new Lang.Class({
    Name: 'DefaultReporter',
    Extends: ConsoleReporter,

    jasmineStarted: function (info) {
        this.parent(info);
        this._print('Started\n');
    },

    jasmineDone: function () {
        this._print('\n\n');
        if (this._failedSpecs.length > 0)
            this._print('Failures:');
        this._failedSpecs.forEach(this._printSpecFailureDetails, this);

        if (this._specCount > 0) {
            this._print('\n');
            this._print('%d %s, %d failed'.format(this._specCount,
                this._specCount === 1 ? 'spec' : 'specs', this._failureCount));

            if (this._pendingCount) {
                this._print(', %d pending'.format(this._pendingCount));
            }
        } else {
            this._print('No specs found');
        }

        this._print('\n');
        let seconds = Math.round(this._timer.elapsed()) / 1000;
        this._print('\nFinished in %f s\n'.format(seconds));

        this._failedSuites.forEach(this._printSuiteFailureDetails, this);

        this.parent();
    },

    specDone: function (result) {
        this.parent(result);

        const colors = {
            passed: GREEN,
            pending: YELLOW,
            failed: RED,
            disabled: undefined,
        };
        const symbols = {
            passed: '.',
            pending: '*',
            failed: 'F',
            disabled: '',
        };
        this._print(this._color(symbols[result.status], colors[result.status]));
    },

    _printSpecFailureDetails: function (result, index) {
        this._print('\n%d) %s\n'.format(index + 1, result.fullName));
        result.failedExpectations.forEach((failedExpectation) => {
            this._print(indent(1) + 'Message:\n');
            this._print(this._color(indent(2) + failedExpectation.message, RED));
            this._print('\n' + indent(1) + 'Stack:\n');
            this._print(indentLines(this.filterStack(failedExpectation.stack), 2));
            this._print('\n');
        });
    },

    _printSuiteFailureDetails: function (result) {
        result.failedExpectations.forEach((failedExpectation) => {
            this._print(this._color('An error was thrown in an afterAll\n' +
                'AfterAll %s\n'.format(failedExpectation.message), RED));
        });
    },
});