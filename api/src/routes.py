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

@bp.route('/robots.txt')
def robots():
    """ Serves the robot.txt page """
    contents = flask.render_template('robots.txt');
    response = flask.make_response(contents)
    response.headers['Content-Type'] = 'text'
    return response
