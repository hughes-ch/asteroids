"""
    Defines the Settings singleton

    :copyright: Copyright (c) 2021 Chris Hughes
    :license: Mozilla Public License Version 2.0
"""
import configparser
import os
import pathlib

class Settings:
    """ Maintains the settings for this app """
    _instance = None

    @staticmethod
    def instance():
        """ Returns instance. Creates one if not already created.
        
            :return: Settings instance
            """
        if Settings._instance is None:
            # Load the default.ini (must be read)
            default_ini_path = pathlib.Path(__file__).parent / 'default.ini'
            
            with default_ini_path.open() as default_ini:
                Settings._instance = configparser.ConfigParser(
                    interpolation=configparser.ExtendedInterpolation())
                Settings._instance.optionxform = str
                Settings._instance.read_file(default_ini)

            # Load the configuration specific .ini (optional)
            try:
                config_spec_ini_path = (
                    pathlib.Path(__file__).parent /
                    os.environ['CONFIG_SPEC_INI'])
                
                Settings._instance.read(str(config_spec_ini_path))
            except KeyError:
                pass
                
        return Settings._instance['settings']

    @staticmethod
    def destroy():
        """ Destroy the instance """
        Settings._instance = None
