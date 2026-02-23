#!/usr/bin/env python
"""
Setup file for EK-SMS deployment
"""
from setuptools import setup, find_packages

setup(
    name='ek-sms',
    version='1.0.0',
    description='Educational Knowledge - School Management System',
    author='Development Team',
    author_email='dev@ek-sms.local',
    packages=find_packages(),
    python_requires='>=3.12',
    install_requires=[
        'Django==6.0.1',
        'django-cors-headers==4.3.1',
        'python-decouple==3.8',
        'django-ratelimit==4.1.0',
        'whitenoise==6.6.0',
        'gunicorn==21.2.0',
        'djangorestframework==3.14.0',
        'Pillow==11.1.0',
        'django-otp==1.7.0',
        'qrcode==8.2',
    ],
    classifiers=[
        'Environment :: Web Environment',
        'Framework :: Django :: 6.0',
        'Intended Audience :: Education',
        'Operating System :: OS Independent',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.12',
        'Programming Language :: Python :: 3.14',
    ],
)
