"""
    Setup instructions

    :copyright: Copyright (c) 2021 Chris Hughes
    :license: Mozilla Public License Version 2.0
"""
import setuptools

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setuptools.setup(
    name='asteroids',
    version='0.0.1',
    author='Chris Hughes',
    author_email='contact@chrishughesdev.com',
    description='A single page application of the game of Asteroids.',
    long_description=long_description,
    long_description_content_type='text/markdown',
    url='https://github.com/hughes-ch/asteroids',
    classifiers=[
        'Programming Language :: Python :: 3',
        'License :: Mozilla Public License Version 2.0',
        'Operating System :: OS Independent',
    ],
    package_dir={'': 'src'},
    packages=setuptools.find_packages(where='src'),
    python_requires='>=3.10',
)
