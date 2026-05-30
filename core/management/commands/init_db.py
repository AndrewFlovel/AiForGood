from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Inicializa la base de datos con un superusuario por defecto para desarrollo.'

    def handle(self, *args, **kwargs):
        User = get_user_model()
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@antigrabiti.com', 'admin123')
            self.stdout.write(self.style.SUCCESS('✅ Superusuario de Hackathon creado automáticamente: admin / admin123'))
        else:
            self.stdout.write(self.style.WARNING('⚡ El superusuario admin ya existe.'))
