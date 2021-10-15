"""
    Tests the routes module

    :copyright: Copyright (c) 2021 Chris Hughes
    :license: Mozilla Public License Version 2.0
"""
import bs4
import flask
import pathlib

from src import create_app
from src.settings import Settings

class TestRoutes():
    """ Tests the routes module """

    def test_correct_title(self):
        """ Test that the title is correct on the index page """
        
        app = create_app()
        
        with app.test_client() as client:
            response = client.get('/')
            assert response.status_code == 200

            soup = bs4.BeautifulSoup(response.data, 'html.parser')
            assert soup.title.string == Settings.instance()['page-title']

    def test_serve_js(self):
        """ Test that javascript can be found """
        
        app = create_app()

        with app.test_client() as client:
            response = client.get('/').data
            soup = bs4.BeautifulSoup(response, 'html.parser')
            js_url = soup.find(id='asteroids-entry')['src']

            assert client.get(js_url).status_code == 200
