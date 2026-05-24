#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
import importlib.abc
import importlib.machinery
import importlib.util


def install_pyc_finder(base_dir):
    """
    Install a meta path finder that loads modules from __pycache__ .pyc files
    when the .py source file is missing (e.g. after accidental deletion).
    """
    class PycFinder(importlib.abc.MetaPathFinder):
        PROJECT_ROOTS = ('eksms', 'eksms_core')

        def find_spec(self, fullname, path, target=None):
            parts = fullname.split('.')
            if parts[0] not in self.PROJECT_ROOTS:
                return None

            search_dirs = list(path) if path else [
                os.path.join(base_dir, parts[0])
            ]

            for search_dir in search_dirs:
                module_name = parts[-1]
                py_path = os.path.join(search_dir, f'{module_name}.py')
                if os.path.exists(py_path):
                    return None  # let the normal file finder handle it

                pyc_path = os.path.join(
                    search_dir, '__pycache__',
                    f'{module_name}.cpython-312.pyc'
                )
                if not os.path.exists(pyc_path):
                    continue

                # Decide if this is a package (has its own __pycache__/__init__)
                sub_init = os.path.join(
                    search_dir, module_name, '__pycache__',
                    '__init__.cpython-312.pyc'
                )
                is_package = os.path.exists(sub_init)

                loader = importlib.machinery.SourcelessFileLoader(
                    fullname, pyc_path
                )
                submodule_search_locations = (
                    [os.path.join(search_dir, module_name)] if is_package
                    else None
                )
                spec = importlib.util.spec_from_file_location(
                    fullname,
                    pyc_path,
                    loader=loader,
                    submodule_search_locations=submodule_search_locations,
                )
                return spec

            return None

    sys.meta_path.insert(0, PycFinder())


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eksms.settings_secure')

    base_dir = os.path.dirname(os.path.abspath(__file__))
    if base_dir not in sys.path:
        sys.path.insert(0, base_dir)

    install_pyc_finder(base_dir)

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
