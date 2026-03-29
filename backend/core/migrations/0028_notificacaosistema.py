from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('core', '0027_configuracaoloja_modo_catalogo_mesa_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='NotificacaoSistema',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titulo', models.CharField(max_length=200)),
                ('mensagem', models.TextField()),
                ('lida', models.BooleanField(default=False)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('loja', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notificacoes_sistema', to='core.configuracaoloja')),
            ],
            options={
                'ordering': ['-criado_em'],
            },
        ),
    ]
