"""
    Pytest fixtures

    :copyright: Copyright (c) 2021 Chris Hughes
    :license: Mozilla Public License Version 2.0
"""
import os
import pytest
import tempfile

from src import create_app
from src.db import db, Score
from src.settings import Settings

@pytest.fixture
def app():
    # Define path to unittest database
    db_fd, db_path = tempfile.mkstemp()
    Settings.instance()['database-uri'] = f'sqlite:///{db_path}'

    # Setup app
    app = create_app()
    
    with app.app_context():
        db.create_all()
        
    yield app

    # Cleanup
    os.close(db_fd)
    os.unlink(db_path)
