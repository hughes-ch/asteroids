"""
    Defines the database

    :copyright: Copyright (c) 2021 Chris Hughes
    :license: Mozilla Public License Version 2.0
"""
import click
import flask
import flask_sqlalchemy

from src.settings import Settings

db = flask_sqlalchemy.SQLAlchemy()

class Score(db.Model):
    """ Represents a single saved score in the database """

    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(120))
    name = db.Column(db.String(120))
    score = db.Column(db.Integer)

    def __repr__(self):
        return f'Score(name={self.name}, score={self.score}, token={self.token})'

def add_new_entry(token=None, name=None, score=None):
    """ Adds a new entry to the database

        :param token: <str> The token specifying the user
        :param name: <str> The name of the entry
        :param score: <int> The player's score
        :return: None
        """
    newScore = Score(token=token, name=name, score=score)
    db.session.add(newScore)
    db.session.commit()

def get_scores_for(token):
    """ Gets the scores for a user specified with the given token

        :param token: <str> The token specifying the user who is making query
        :return: <list> With query info. Each result specified as dict
        """
    results = []
    for score in Score.query.filter_by(token=token):
        results.append({
            'name': score.name,
            'score': score.score,
        })

    return results

@click.command('db-init')
@flask.cli.with_appcontext
def db_init_command():
    """ Initializes the database

        :return: None
        """
    db.create_all()
    click.echo(f'Created the database {Settings.instance()["database-uri"]}')

@click.command('db-add')
@click.argument('token')
@click.argument('name')
@click.argument('score', type=click.INT)
@flask.cli.with_appcontext
def db_add_command(token, name, score):
    """ Adds an entry to the database

        :param token: <str> The API token
        :param name: <str> The scorer's name
        :param score: <int> The scorer's score
        """
    add_new_entry(token=token, name=name, score=score)
    click.echo(f'Added {newScore} to {Settings.instance()["database-uri"]}')
