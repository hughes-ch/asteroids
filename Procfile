db-init: yarn db-init
web: yarn api-install && yarn build && gunicorn --chdir api 'src:create_app()'
