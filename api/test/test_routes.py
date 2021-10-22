"""
    Tests the routes module

    :copyright: Copyright (c) 2021 Chris Hughes
    :license: Mozilla Public License Version 2.0
"""
import bs4
import flask

from src.settings import Settings
from test.fixtures import app

def test_correct_title(app):
    """ Test that the title is correct on the index page """

    with app.test_client() as client:
        response = client.get('/')
        assert response.status_code == 200

        soup = bs4.BeautifulSoup(response.data, 'html.parser')
        assert soup.title.string == Settings.instance()['page-title']

def test_serve_js(app):
    """ Test that javascript can be found """

    with app.test_client() as client:
        response = client.get('/').data
        soup = bs4.BeautifulSoup(response, 'html.parser')
        js_url = soup.find(id='asteroids-entry')['src']

        assert client.get(js_url).status_code == 200

def test_serve_robots(app):
    """ Test that robots.txt is served correctly """

    with app.test_client() as client:
        response = client.get('/robots.txt')
        assert response.status_code == 200

def test_cookie(app):
    """ Test that cookies are provided in response """

    @app.route('/cookie_echo')
    def cookie_echo():
        return flask.jsonify(flask.request.cookies)
    
    with app.test_client() as client:
        client.get('/')
        response = client.get('/cookie_echo')
        assert response.get_json().get(
            Settings.instance()['cookie-id']) is not None
        
