[![hughes-ch](https://circleci.com/gh/hughes-ch/asteroids.svg?style=shield)](https://app.circleci.com/pipelines/github/hughes-ch/asteroids)

# Asteroids
A single page web app implementation of the classic game of Asteroids.

The game itself is written in JavaScript. The backend is managed by Python's Flask framework. 

## Project Organization
This project's been designed so that the Flask application and Javascript are side-by-side:

    LICENSE
    package.json
    README.md
    api
    |----manifest.in
    |----requirements.txt
    |----setup.py
    |----src
    |    |----*.ini
    |    |----*.py
    |    |----static
    |    |    |----css/
    |    |----templates/
    |----test
    |    |----test_*.py
    src
    |----*.js
    test
    |----*.test.js
    
The Flask application (and associated testing) is placed within api/. The javascript is within src/.
    
Yarn is used as the package manager on the javascript side, pip on the Python side. Yarn acts as the "top level" package manager, delegating things that are specific to flask to pip. Scripts are defined in package.json. 

## Installation
The backend of Asteroids was written with Python 3.10.0. It's recommended to
[install pyenv](https://realpython.com/intro-to-pyenv/#installing-pyenv) to manage Python versions.

Once the correct version of Python is installed, the easiest way to install the project onto a local
machine is just by pulling from github. Next, create a virtual Python environment with:

     >> pyenv local 3.10.0
     >> python -m venv <name_of_env>
  
This project uses yarn and pip for dependency management. To install dependencies, type:

    yarn install     # to install javascript dependencies
    yarn api-install # to install python dependencies
  
## Testing 
This project uses jest and pytest for unit testing. Javascript unit tests can be found in test/. 
Flask unit tests can be found in api/test. 

Use these two commands to run the unit tests:

    yarn test     # to run jest
    yarn api-test # to run pytest
    
To start a development server on your local network, use this command:

    yarn start-flask

Then you can type "localhost:5000" into your browser search bar and the website will be rendered.
Any machine on the local network will also be able to reach the website using your machine's IP and
port 5000. This can be useful to test mobile.
  
## Workflow
There are two permanent branches in this git repository:
1. main - Code on this branch is intended to be deployed. Changes must be submitted via pull request
2. dev - Code ready to be deployed. Code changes can be merged directly from work branches

Any other changes should be made on temporary work branches. Example for a new "feature-1":
  
    main
    |----dev
    |    |----feature-1
    |    |    | commit f0390e2
    |    |<---| git merge
    |<---|      Pull request on github
  
