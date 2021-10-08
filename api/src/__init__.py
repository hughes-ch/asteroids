"""
    Creates the flask app and registers services

    :copyright: Copyright (c) 2021 Chris Hughes
    :license: Mozilla Public License Version 2.0
"""
import flask

def create_app():
    """ Entry point for flask application """
    app = flask.Flask(__name__)

    from . import routes
    app.register_blueprint(routes.bp)

    return app
