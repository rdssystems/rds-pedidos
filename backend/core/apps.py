from django.apps import AppConfig

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        import core.signals
        
        # Iniciar Scheduler
        import os
        # Evitar rodar o scheduler duas vezes no caso de runserver (reloader)
        if os.environ.get('RUN_MAIN', None) != 'true':
            try:
                from apscheduler.schedulers.background import BackgroundScheduler
                from core.jobs.store_routines import check_store_closing_routines
                import logging
                logging.getLogger('apscheduler').setLevel(logging.WARNING)

                scheduler = BackgroundScheduler()
                scheduler.add_job(check_store_closing_routines, 'interval', minutes=15)
                scheduler.start()
                print("Background Scheduler iniciado com sucesso (intervalo 15m).")
            except Exception as e:
                print(f"Erro ao iniciar Scheduler: {e}")
