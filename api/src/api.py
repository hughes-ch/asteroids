"""
    Registers routes

    :copyright: Copyright (c) 2021 Chris Hughes
    :license: Mozilla Public License Version 2.0
"""
import flask

from src.db import add_new_entry, get_scores_for

bp = flask.Blueprint('api', __name__, url_prefix='/api')

@bp.route('/<token>/scores', methods=['GET', 'POST'])
def handle_score_request(token):
    """ Returns or updates the player scores

        :param token: <str> User's API token
        :return: Flask.response
        """
    status_code = 200
    
    if flask.request.method == 'POST':
        data = flask.request.get_json()
        try:
            add_new_entry(
                token=token,
                name=data['name'],
                score=int(data['score']))
            
        except ValueError:
            status_code = 500
            
    response = get_scores_for(token);
    return flask.jsonify(response), status_code
