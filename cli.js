#!/usr/bin/env node

const program = require('commander');
const inquirer = require('inquirer');

const luke = require('./dsl.js');
const fs = require('fs');


program
    .command('run <type>')
    .description('Run your app')
    .action(function(type, args) {
        var code = fs.readFileSync(type, 'utf8');
        luke.parse(code);
    });

program
    .description('Run your app')
    .action(function(type, args) {

        if (args) {
            try {
                if (args[0] == "include") {
                    var code = fs.readFileSync(args[1], 'utf8');
                    luke.parse(code);
                }
            } catch (e) {
                console.log('Error including file', e);
            }
        }

        function input() {
            inquirer
                .prompt([{
                    name: 'input',
                    message: '>',
                }, ])
                .then(content => {

                    if (content.input == 'exit') {
                        console.log('Bye');
                        process.exit(0);
                    }

                    luke.parse(content.input)
                    input();

                }).catch(e => {
                    console.log(e)
                });
        }
        input();

    });

program.parse(process.argv);

process
    .on('unhandledRejection', (reason, p) => {
        console.error(reason, 'Unhandled Rejection at Promise', p);
    })
    .on('uncaughtException', err => {
        console.error(err, 'Uncaught Exception thrown');
    });