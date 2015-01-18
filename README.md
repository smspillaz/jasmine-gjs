[![Build Status](https://travis-ci.org/ptomato/jasmine-gjs.png?branch=master)](https://travis-ci.org/ptomato/jasmine-gjs)

# Jasmine for GJS

[Jasmine](https://github.com/jasmine/jasmine) is a BDD (behavior-driven
development) framework for JavaScript.

## Contents

This module allows you to run Jasmine specs for your GJS code.
The output will be displayed in your terminal.

## Installation

From Git:

```sh
git clone https://github.com/ptomato/jasmine-gjs
cd jasmine-gjs
./autogen.sh
make
sudo make install
```

From a tarball:

```sh
tar xJf jasmine-gjs-2.1.3.tar.xz
cd jasmine-gjs-2.1.3
./configure
make
sudo make install
```

## Usage

To run your test suite, pass its directory to the `jasmine` command:

```bash
jasmine mytestsuitedir
```

To run an individual spec:

```bash
jasmine path/to/spec.js
```

## Options

`--no-color`: Don't output color in the terminal.

`--verbose`: Output verbose results, formatted similarly to Mocha's
output.
(The default output is formatted the same as Jasmine's Node.JS runner's
output.)

## Integration with Autotools

If using autotools, you might want to integrate your test suite into
your makefiles.
Put this code in your `Makefile.am`:

```make
TESTS = path/to/spec1.js path/to/spec2.js
TEST_EXTENSIONS = .js
JS_LOG_COMPILER = jasmine
```

Don't forget to `EXTRA_DIST` your spec files too. Now Jasmine will run
your spec files one by one as part of `make check`.

If you use on-disk test fixtures, you should note that someone may be
building your software with separate source and build trees.
In that case, you have to make sure that your fixtures can be found both
when running tests from the source directory and from a separate build
directory.
I suggest defining an environment variable in your makefile that tells
where the fixtures can be found.
For example, in Jasmine GJS's own tests, this line is in `Makefile.am`:

```make
AM_TESTS_ENVIRONMENT = export SRCDIR='$(srcdir)';
```

The test code then reads the environment variable like this:

```js
let envSrcdir = GLib.getenv('SRCDIR');
const SRCDIR = envSrcdir? envSrcdir + '/' : '';

doSomethingWithFixture(SRCDIR + 'path/to/fixture');
```

## Support

Please file issues here at
[GitHub](https://github.com/ptomato/jasmine-gjs/issues).

## Credits

The idea of Jasmine for GJS was first explored by my coworkers Devin
Ekins and Sam Spilsbury:
[eos-jasmine](https://github.com/endlessm/eos-jasmine).
This code, however, is unashamedly cribbed from Pivotal Labs'
[jasmine-npm](https://github.com/jasmine/jasmine-npm).

Copyright (c) 2015 Philip Chimento.
This software is licensed under the MIT License &mdash; because Jasmine
and Jasmine NPM are too.
