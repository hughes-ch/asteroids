"""
    Creates the flask app and registers services

    :copyright: Copyright (c) 2021 Chris Hughes
    :license: Mozilla Public License Version 2.0
"""
import flask

from .settings import Settings

def create_app():
    """ Entry point for flask application """
    app = flask.Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = Settings.instance()['database-uri']
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    from . import db
    db.db.init_app(app)
    app.cli.add_command(db.db_init_command)
    app.cli.add_command(db.db_add_command)
    
    from . import api
    from . import routes
    app.register_blueprint(api.bp)
    app.register_blueprint(routes.bp)

    return app
