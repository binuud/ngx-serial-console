# Maintainer Binu Udayakumar <binu@dronasys.com>

## Toggle this flag to true (e.g., make ENABLE_DOCKER=true build)
ENABLE_DOCKER=false

# Optional environmental variables
cnf ?= local.env

REPO=dronasys-com
APP ?= ngx-serial-console
ANGULAR_CLI_DEV=angular-cli-headless-chrome
BUILD_CONTAINER=brain-ui-builder

-include local.env
export


.PHONY: help
help: ## ngx-serial-console, quick commands...
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## build all libraries in this project
ifeq ($(ENABLE_DOCKER),true)
	docker stop $(BUILD_CONTAINER); docker rm $(BUILD_CONTAINER);docker run --rm  --name $(BUILD_CONTAINER) -v "$(shell pwd)/:/app" $(REPO)/$(ANGULAR_CLI_DEV) ng build ngx-serial-console
else
	ng build ngx-serial-console
endif

test: ## run angular tests, if you are running within docker, container must container chromium headless
	ng test ngx-serial-console

run-lib: ## run the lib watching for changes
ifeq ($(ENABLE_DOCKER),true)
	docker stop $(BUILD_CONTAINER); docker rm $(BUILD_CONTAINER);docker run --rm  --name $(BUILD_CONTAINER) -v "$(shell pwd)/:/app" $(REPO)/$(ANGULAR_CLI_DEV) ng build ngx-serial-console --watch
else
	ng build ngx-serial-console --watch
endif

run: ## runs the angular demo project
ifeq ($(ENABLE_DOCKER),true)
	docker stop $(BUILD_CONTAINER); docker rm $(BUILD_CONTAINER);docker run --rm  --name $(BUILD_CONTAINER) -v "$(shell pwd)/:/app" $(REPO)/$(ANGULAR_CLI_DEV) ng serve
else
	ng serve
endif
	

run-shell-angular: ## run shell on angular
	docker run --rm -it -v "$(shell pwd)/:/app" $(REPO)/$(ANGULAR_CLI_DEV) bash	
	
publish: ## publish to npm - cd dist/ngx-serial-console/  && npm publish   	
#	cd dist/ngx-serial-console/  && npm publish   	
