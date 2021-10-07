"""
    Tests the routes module

    :copyright: Copyright (c) 2021 Chris Hughes
    :license: Mozilla Public License Version 2.0
"""
import bs4
import flask

from src import create_app
from src.settings import Settings

class TestRoutes():
    """ Tests the routes module """

    def test_correct_title(self):
        """ Tests that the title is correct on the index page """
        
        app = create_app()
        
        with app.test_client() as client:
            response = client.get('/')
            assert response.status_code == 200

            soup = bs4.BeautifulSoup(response.data, 'html.parser')
            assert soup.title.string == Settings.instance()['page-title']
