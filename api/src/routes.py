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

@bp.route(f'/{Settings.instance()["js-url"]}/<path:filename>')
def serve_js(filename):
    """ Serves a javascript file.

        These do not come from the standard static director, so they must
        be handled separately

        :param filename: <str> Name of the Javascript file
        """
    return flask.send_from_directory(
        Settings.instance()['js-directory'],
        filename)
