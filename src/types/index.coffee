# Import all the built-in types.
type = require './simple'
exports[type.name] = type

type = require './count'
exports[type.name] = type

type = require './text'
exports[type.name] = type
require "./text-api"

type = require './text2'
exports[type.name] = type
require "./text2-api"

type = require './text-composable'
exports[type.name] = type
require "./text-composable-api"

type = require './text-tp2'
exports[type.name] = type
require "./text-tp2-api"

type = require './json'
exports[type.name] = type
require "./json-api"

# register './etherpad'
# register './etherpad-api'
