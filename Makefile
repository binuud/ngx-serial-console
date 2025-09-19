

.PHONY: help
help: ## ngx-serial-console, quick commands...
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## build all libraries in this project
	ng build ngx-serial-console
	cp ./projects/ngx-serial-console/ngx-console-window.gif ./dist/ngx-serial-console/

test: ## run angular tests, if you are running within docker, container must container chromium headless
	ng test ngx-serial-console

run: ## runs the angular demo project
	ng serve	