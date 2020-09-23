var environment = 'browser';
if ((typeof process !== 'undefined') && ((process.release || {}).name === 'node')) {
    environment = "node";
    const dependencies = require('./dependencies.js');
    fs = dependencies.fs;
    fetch = dependencies.fetch;
    npm = dependencies.npm;
    pjson = require('./package.json');
} else {
    global = window;

    /*fs = {
        readFile: function(url, cb) {
            if (url.indexOf('http://') == 0 || url.indexOf('https://') == 0)
            {
                // TODO fetch!
                return;
            }

            if(localStorage.getItem(url)) cb(null, localStorage.getItem(url));
            else cb("file not found", null)
        },
        writeFile: function(url, data, cb) {
            localStorage.setItem(url, data)
            cb(null, localStorage.getItem(url));
        }
    }*/

    var LightningFS = require('./dependencies/lightning-fs.min.js');

    fs = new LightningFS('fs')
}

var lang = {
    delimeter: ";",
    assignmentOperator: "=",
    context: {},
    vars: {},
    currentNamespace: "default",
    static: {
        execStatement: function(done) {

            if (lang.context[lang.context.importNamespace]) {
                if (environment != 'node') return global.puzzle.output('feature not available in this environment')
                try {
                    lang.context[lang.context.importNamespace] = require(lang.context.importUrl);
                } catch (e) {
                    global.puzzle.output('Import Error:', e)
                }
                if (done) done();
            }

            if (lang.context['unUseNamespace']) {
                if (global.puzzle.moduleStorage.get('_' + lang.context['unUseNamespace'])) {
                    global.puzzle.moduleStorage.remove('_' + lang.context['unUseNamespace']);
                    global.puzzle.output(lang.context['unUseNamespace'], 'unused');
                }
            }

            if (lang.context['useNamespace']) {

                try {
                    var fileName = lang.context['useNamespace'];
                    var extention = fileName.split(".")[fileName.split(".").length - 1];

                    if (fileName.indexOf('https://') == 0) {

                        fetch(fileName)
                            .then(res => res.text())
                            .then(data => {
                                if (lang.context['_' + lang.context['useNamespace'] + 'permanent']) {
                                    if (!localStorage.getItem('_' + lang.context['useNamespace'])) localStorage.setItem('_' + lang.context['useNamespace'], data)
                                }

                                if (environment == 'node') {
                                    var syntax = new Function("module = {}; " + data + " return syntax;")();
                                    global.puzzle.useSyntax(syntax);
                                } else {
                                    var syntax = new Function("module = {}; " + data + " return syntax;")();
                                    global.puzzle.useSyntax(syntax);
                                }
                                if (done) done();
                            });

                    } else if (extention.toLowerCase() == "js") {
                        if (environment != 'node') return global.puzzle.output('feature not available in this environment')

                        if (fileName.charAt(0) != '/') fileName = './' + fileName;
                        var file = require(fileName);
                        global.puzzle.useSyntax(file);
                        if (done) done();
                    } else {
                        global.puzzle.output('unsupported file type');
                        if (done) done();
                    }


                } catch (e) {
                    global.puzzle.output('Use Error', e);
                    if (done) done();
                }
            } else if (lang.context['includeNamespace']) {

                function includeScript(code) {
                    global.puzzle.parse(code);
                }

                var fileName = lang.context['includeNamespace'];
                var extention = fileName.split(".")[fileName.split(".").length - 1];

                if (fileName.indexOf('https://') == 0) {

                    fetch(fileName)
                        .then(res => res.text())
                        .then(data => {
                            includeScript(data);
                            if (done) done();
                        });

                } else if (extention.toLowerCase() == "puzzle") {
                    if (fileName.charAt(0) != '/') fileName = './' + fileName;
                    fs.readFile(fileName, function(err, data) {
                        if (err) return global.puzzle.output('Error reading file');
                        file = data;
                    });
                    includeScript(file)
                    if (done) done();
                } else {
                    global.puzzle.output('unsupported file type');
                    if (done) done();
                }
            } else if (done) done();
        }
    },
    "$": {
        default: {
            include: {
                manual: "include a puzzle file",
                follow: ["{file}"],
                method: function(ctx, file) {

                    lang.context['includeNamespace'] = global.puzzle.getRawStatement(file);

                }
            },
            ns: {
                manual: "Sets a namespace. Valid until another namespace is set",
                follow: ["{namespace}"],
                method: function(ctx, ns) {
                    lang.currentNamespace = ns;

                }
            },
            var: {
                manual: "Sets a variable",
                follow: ["{key,value}"],
                method: function(ctx, data) {
                    global.puzzle.vars[data.key] = data.value;

                }
            },
            func: {
                manual: "Sets a function",
                follow: ["{key,params,body}"],
                method: function(ctx, data) {
                    global.puzzle.funcs[data.key] = { params: data.params, body: data.body };

                    console.log('fs', global.puzzle.funcs);
                }
            },
            if: {
                follow: ["{condition}", "$then"],
                method: function(ctx, condition) {
                    lang.context.if = condition;
                }
            },
            then: {
                follow: ["{statement}", "$else"],
                method: function(ctx, statement) {
                    if (lang.context.if) {
                        lang.context.if = lang.context.if.replace(/AND/g, '&&').replace(/OR/g, '||')
                        if (eval(lang.context.if)) {
                            lang.context.conditionMet = true;
                            global.puzzle.parse(global.puzzle.getRawStatement(statement));
                        }
                    }
                }
            },
            else: {
                follow: ["{statement}"],
                method: function(ctx, statement) {
                    if (lang.context.if && !lang.context.conditionMet) {
                        global.puzzle.parse(global.puzzle.getRawStatement(statement));
                    }
                }
            },
            while: {
                follow: ["{condition}", "$do"],
                method: function(ctx, statement) {
                    lang.context.while = condition;
                }

            },
            for: {
                follow: ["{condition}", "$do"],
                method: function(ctx, condition) {
                    lang.context.for = condition;
                }
            },
            do: {
                follow: ["{statement}"],
                method: function(ctx, statement) {
                    //new Function("module = {}; " + data + " return syntax;")();
                    if (lang.context.while) {
                        lang.context.while = lang.context.while.replace(/AND/g, '&&').replace(/OR/g, '||')
                        new Function("while(" + global.puzzle.getRawStatement(lang.context.while) + "){ puzzle.parse('" + global.puzzle.getRawStatement(statement) + "') };")()
                    } else if (lang.context.for) {
                        lang.context.for = lang.context.for.replace(/AND/g, '&&').replace(/OR/g, '||');
                        new Function("for(" + global.puzzle.getRawStatement(lang.context.for) + "){ puzzle.parse('var i '+i+'; " + global.puzzle.getRawStatement(statement) + "') };")()
                    }
                }
            },
            version: {
                manual: "See the installed version of puzzle",
                follow: [],
                method: function(ctx, data) {
                    global.puzzle.output('puzzle version: ', pjson.version)
                }
            },
            use: {
                follow: ["$permanent", "{file}"],
                method: function(ctx, ns) {
                    lang.context['useNamespace'] = global.puzzle.getRawStatement(ns);

                }
            },
            unuse: {
                follow: ["{file}"],
                method: function(ctx, ns) {
                    lang.context['unUseNamespace'] = ns;
                }
            },
            permanent: {
                follow: ["{file}"],
                method: function(ctx, file) {
                    lang.context['useNamespace'] = global.puzzle.getRawStatement(file);
                    lang.context['_' + file + 'permanent'] = true;
                }
            },
            write: {
                follow: ["$file"],
                method: function(ctx) {
                    lang.context.fileOperation = 'write';
                }
            },
            read: {
                follow: ["$file"],
                method: function(ctx) {
                    lang.context.fileOperation = 'read';
                }
            },
            remove: {
                follow: ["$file", "$dir"],
                method: function(ctx) {
                    lang.context.fileOperation = 'remove';
                    lang.context.dirOperation = 'remove';
                }
            },
            make: {
                follow: ["$dir"],
                method: function(ctx) {
                    lang.context.dirOperation = 'make';
                }
            },
            file: {
                follow: ["{name,content}"],
                method: function(ctx, file) {
                    var content = file.content;
                    if (environment == 'web') content = new TextEncoder("utf-8").encode(file.content);

                    switch (lang.context.fileOperation) {
                        case 'write':
                            fs.writeFile(file.name, content, 'utf8', function(err, data) {
                                if (err) return global.puzzle.output(err);
                                global.puzzle.output(data);
                            })
                            break;
                        case 'read':
                            fs.readFile(file.name, function(err, data) {
                                if (err) return global.puzzle.output(err);
                                global.puzzle.output(data.toString());
                            })
                            break;
                        case 'remove':
                            fs.unlink(file.name, function(err, data) {
                                if (err) return global.puzzle.output(err);
                                global.puzzle.output(data);
                            })
                            break;
                    }
                }
            },
            dir: {
                follow: ["{dir}"],
                method: function(ctx, dir) {
                    switch (lang.context.dirOperation) {
                        case 'make':
                            fs.mkdir(dir, {}, function(err, data) {
                                if (err) return global.puzzle.output(err);
                                global.puzzle.output(data);
                            })
                            break;
                        case 'remove':
                            fs.rmdir(dir, function(err, data) {
                                if (err) return global.puzzle.output(err);
                                global.puzzle.output(data);
                            })
                            break;
                    }
                }
            },
            print: {
                follow: ["{text}"],
                method: function(ctx, text) {
                    global.puzzle.output(global.puzzle.getRawStatement(text))
                }
            },
            js: {
                follow: ["{code}"],
                method: function(ctx, text) {
                    try {
                        global.puzzle.output(eval(global.puzzle.getRawStatement(text)))
                    } catch (e){
                        global.puzzle.output('JavaScript Error', e)
                    }
                }
            },
            list: {
                follow: ["{param}"],
                method: function(ctx, param) {
                    switch (param) {
                        case 'modules':
                            global.puzzle.output(Object.keys(lang['$']).join(', '));
                            break;
                        case 'commands':
                            Object.keys(lang['$']).forEach((ns) => {
                                global.puzzle.output('namespace:', ns, '\n');
                                Object.keys(lang['$'][ns]).forEach(c => {
                                    var man = "";
                                    if (lang['$'][ns][c].manual) man = ' (' + lang['$'][ns][c].manual + ')';
                                    var seq = "";
                                    lang['$'][ns][c].follow.forEach(f => {
                                        seq += f + " ";
                                    })
                                    global.puzzle.output('  ', c, seq, '\t', man)
                                    global.puzzle.output('\n')
                                })
                            })
                            break;
                    }
                }
            },
            download: {
                follow: ["{param}"],
                method: function(ctx, param) {

                    if (environment != 'node') return global.puzzle.output('download not available in this environment')

                    fetch(param)
                        .then(res => res.text())
                        .then(data => {

                            var fileName = param.split('/')[param.split('/').length - 1];
                            fs.writeFile(fileName, data, function(err, data) {
                                global.puzzle.output(fileName, 'downloaded');
                            })
                        });

                }
            },
            install: {
                follow: ["{param}"],
                method: function(ctx, param) {

                    if (!npm) return global.puzzle.output('npm not available in this environment');

                    npm.load({
                        loaded: false
                    }, function(err) {
                        npm.commands.install([param], function(er, data) {
                            global.puzzle.output(er, data);
                        });
                        npm.on("log", function(message) {
                            global.puzzle.output(message);
                        });
                    });
                }
            },
        }

    }

}

module.exports = lang;