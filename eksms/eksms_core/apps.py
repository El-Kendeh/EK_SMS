from django.apps import AppConfig


class EksmsCoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'eksms_core'
    verbose_name = 'Academic Management System'

    def ready(self):
        """Import signals when app is ready"""
        import eksms_core.signals  # noqa
