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
        'page_title': Settings.instance()['page-title']
    }
    return flask.render_template('index.html', **context)
