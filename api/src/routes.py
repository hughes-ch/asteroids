"""
    Registers routes

    :copyright: Copyright (c) 2021 Chris Hughes
    :license: Mozilla Public License Version 2.0
"""
import flask
import secrets

from src.settings import Settings

bp = flask.Blueprint('routes', __name__)

@bp.route('/')
def index():
    """ Renders the index page """
    
    # Render contents
    context = {
        'settings': Settings.instance()
    }
    
    contents = flask.render_template('index.html', **context)
    response = flask.make_response(contents)

    if not flask.request.cookies.get(Settings.instance()['cookie-id']):
        response.set_cookie(
            Settings.instance()['cookie-id'],
            secrets.token_urlsafe())

    return response

@bp.route('/robots.txt')
def robots():
    """ Serves the robot.txt page """
    contents = flask.render_template('robots.txt');
    response = flask.make_response(contents)
    response.headers['Content-Type'] = 'text'
    return response
