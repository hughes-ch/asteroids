"""
    Tests the db module

    :copyright: Copyright (c) 2021 Chris Hughes
    :license: Mozilla Public License Version 2.0
"""
import os

from src import db, settings
from test.fixtures import app

def test_add_new_entry(app):
    """ Test the add_new_entry function """

    token = '1234'
    name = 'name'
    score = 100
    
    with app.app_context():
        db.add_new_entry(token, name, score)
        
        scores = db.Score.query.all()
        assert len(scores) == 1
        assert scores[0].token == token
        assert scores[0].name == name
        assert scores[0].score == score

def test_get_scores_for(app):
    """ Test the get_scores_for function """

    tokens = ['1', '1', '3']
    names = ['name1', 'name2', 'name3']
    scores = [100, 200, 300]

    with app.app_context():
        for ii in range(3):
            db.add_new_entry(
                token=tokens[ii],
                name=names[ii],
                score=scores[ii])

        scoresForToken = db.get_scores_for(tokens[0])
        assert len(scoresForToken) == 2

        for ii in range(2):
            assert scoresForToken[ii]['name'] == names[ii]
            assert scoresForToken[ii]['score'] == scores[ii]
    
def test_db_uri(app):
    """ Tests the database URI """

    with app.app_context():
        assert db.db_uri() == settings.Settings.instance()['database-uri']

        os.environ['DATABASE_URL'] = 'postgres://'
        assert db.db_uri() == 'postgresql://'
