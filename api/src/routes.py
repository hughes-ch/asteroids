"""
    Registers routes

    :copyright: Copyright (c) 2021 Chris Hughes
    :license: Mozilla Public License Version 2.0
"""
import flask

from src.settings import Settings

bp = flask.Blueprint('routes', __name__)

@bp.route('/')
def index():
    """ Renders the index page """
    context = {
        'settings': Settings.instance()
    }
    return flask.render_template('index.html', **context)
