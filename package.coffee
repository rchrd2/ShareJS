# Package.json file in CoffeeScript
# Nicer to write and you can have comments
# Compile with "cake package"

module.exports =
  name: "share"

  # Change version with "cake [-V newversion] bump"
  version: "0.6.4"
  description: "ShareJS 0.6.3 with a Filesystem DB"
  keywords: [
  	"operational transformation"
  	"ot"
  	"concurrent"
  	"collaborative"
  	"database"
  	"server"
  ]

  homepage: ""

  author: "Joseph Gentle <josephg@gmail.com>"

  dependencies:
    # Transports
    #sockjs: ">= 0.3.1"
    #"socket.io": "~0.8"
    #"socket.io-client": "~0.8"
    browserchannel: "~1"
    #ws: "*"

    # Server works with v1 or v2
    connect: "<3.x"

    # Prevent upgrade failures like v1.3. Bump this when tested.
    "coffee-script": "<1.7"

    # Useragent hashing
    hat: "*"

  # Developer dependencies
  devDependencies:
    # Example server
    express: "~ 3.x"
    optimist: ">= 0.2.4"

    # Tests
    nodeunit: "*"

    # Unixy shell stuff for Cakefile
    shelljs: "*"

    # Javascript compression
    "uglify-js": "0.1.0"

    # SockJS
    #"websocket": "*"

    "coffeeify": "2.0.1"

  engine: "node >= 0.6"

  # Main file to execute
  main: "index.js"

  # Binaries to install
  bin:
    sharejs: "bin/sharejs"
    "sharejs-exampleserver": "bin/exampleserver"

  scripts:
    build: "cake build"
    test: "cake test"
    #prepublish: "cake webclient"

  licenses: [
    type: "MIT"
  ]

  repository:
    type: "git"
    url: "http://github.com/josephg/sharejs.git"
