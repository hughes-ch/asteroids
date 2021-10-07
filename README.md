# Asteroids
A single page web app implementation of the classic game of Asteroids.

The game itself is written in JavaScript. The backend is managed by Python's Flask framework. 

## Installation
The backend of Asteroids was written with Python 3.10.0. It's recommended to
[install pyenv](https://realpython.com/intro-to-pyenv/#installing-pyenv) to manage Python versions.

Once the correct version of Python is installed, the easiest way to install the project onto a local
machine is just by pulling from github. Next, create a virtual environment with:

     >> pyenv local 3.10.0
     >> python -m venv <name_of_env>
  
This project uses pip for dependency management. To install dependencies, type:

    pip install -r requirements.txt

Pip will also install the Asteroids project in development mode so it can be run from anywhere in
the virtual environment. To configure this behavior, update setup.py and manifest.in in the root
directory of the project.
  
## Testing 
This project uses pytest for unit testing. It's recommended to get coverage statistics with:
 
    pytest --cov=src 
  
To start the site on the local machine, use these commands:
  
    export FLASK_APP=src
    export FLASK_ENV='development'
    flask run --host 0.0.0.0
  
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
  
