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

        js_path = (
            pathlib.Path(__file__).parent /
            pathlib.Path(Settings.instance()['js-directory']))
        
        js_files = list(js_path.rglob('*.js'))

        with app.test_client() as client:
            assert len(js_files) > 0
            
            for js_file in js_files:
                rel_path = js_file.relative_to(js_path)
                response = client.get(
                    f'/{Settings.instance()["js-url"]}/{rel_path}')

                assert response.status_code == 200, (
                    f'{rel_path} not retrieved successfully '
                    f'[{response.status_code}]')

    def test_serve_js_safe(self):
        """ Test that serve_js is safe """
        app = create_app()

        js_path = (
            pathlib.Path(__file__).parent /
            pathlib.Path(Settings.instance()['js-directory']))
                
        not_accessible_files = list(js_path.glob('../*'))

        with app.test_client() as client:
            assert len(not_accessible_files) > 0

            for na_file in not_accessible_files:
                rel_path = na_file.relative_to(js_path)
                response = client.get(
                    f'/{Settings.instance()["js-url"]}/{rel_path}')

                assert response.status_code != 200, (
                    f'{rel_path} retrieved successfully when it should '
                    f'be inaccessible [{response.status_code}]')
                    

