var dsl = {

    lang: {},
    api: {},

    parse: function(code) {

        var parts = code.split(this.lang.delimeter);

        // Check if parameter is an object
        var isObject = (a) => {
            return (!!a) && (a.constructor === Object);
        };

        // Return the dynamic following tokens
        var getTokenSequence = (reference) => {
            if (isObject(reference)) {
                return reference.follow
            } else return reference;
        }

        // Call the dynamic, corresponding api method that blongs to a single token
        var callTokenFunction = (key, param, dslKey) => {
            if (this.lang['$'][key]) {
                if (isObject(this.lang[dslKey || '$'][key])) {
                    this.lang[dslKey || '$'][key].method(param);
                } else if (this.api[key]) this.api[key](param)
            }
        }

        // Recoursively parse tokens
        var sequence = (tokens, token, instructionKey, partId) => {

        	console.log(token, tokens.length, partId);

            var instruction = getTokenSequence(this.lang['$'][instructionKey.substring(1)]);
           
            // eaual
            if (instructionKey.substring(1) == token) {
                tokens.shift();

                // execute exact method
                callTokenFunction(token, tokens[0])

                instruction.forEach(instr => {
                    if (instr.charAt(0) == '$') {
                        // pass to next sequence
                        if (tokens.length > 0) sequence(tokens, tokens[0], instr, partId);

                    } else if (instr.charAt(0) == '{') {

                        tokens.shift();
                    }
                })

            } else { // not equal

                if (instructionKey.substring(1).charAt(0) == "{") {
                    tokens.shift();

                    // execute param method
                    callTokenFunction(tokens[0], tokens[0])

                    instruction.forEach(instr => {
                        if (instr.charAt(0) == '$') {
                            // pass to next sequence
                            if (tokens.length > 0) sequence(tokens, tokens[0], instr, partId);

                        } else if (instr.charAt(0) == '{') {

                            tokens.shift();

                            // execute dynamic method
                            callTokenFunction(instructionKey.substring(1))
                        }
                    })
                }
            }
        }

        parts.forEach(p => {

        	var partId = Math.random();

            var tokens = p.split(/\s+/);
            tokens.push(this.lang.delimeter);

            console.log(tokens);

            t = tokens[0]

            if (this.lang.commands[t]) {

                // execute initial command
                callTokenFunction(this.api[t], undefined, 'commands')

                tokens.shift()
                sequence(tokens, tokens[0], this.lang.commands[t], partId);
            }
        })
    }
}

module.exports = dsl;