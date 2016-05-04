.PHONY: build
build:
	browserify -t [ coffeeify --bare --header true ] --extension=".coffee" src/client/index.coffee > lib/client/index.js 
	browserify -t [ coffeeify --bare --header true ] --extension=".coffee" src/server/index.coffee > lib/server/index.js

.PHONY: cake
cake:
	cake package
	cake build
	cake webclient
