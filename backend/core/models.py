from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from PIL import Image
from io import BytesIO
import os
from django.core.files.base import ContentFile
import uuid

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    is_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=100, blank=True, null=True)
    
    def __str__(self):
        return f"Profile of {self.user.username}"

def resize_image(image_field, max_size, quality=85):
    if not image_field:
        return
    try:
        img = Image.open(image_field)
        
        # Convert RGBA to RGB (to prevent error when saving as JPEG)
        if img.mode == 'RGBA':
            img = img.convert('RGB')
            
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        buffer = BytesIO()
        img.save(buffer, format='JPEG', quality=quality)
        
        filename = os.path.basename(image_field.name)
        new_image = ContentFile(buffer.getvalue())
        
        image_field.save(filename, new_image, save=False)
    except Exception as e:
        print(f"Error optimizing image: {e}")

class Plano(models.Model):
    nome = models.CharField(max_length=100)
    preco_mensal = models.DecimalField(max_digits=10, decimal_places=2)
    descricao = models.TextField(blank=True)
    max_produtos = models.IntegerField(default=50)
    recursos = models.JSONField(default=dict, help_text="Ex: {'whatsapp': true, 'kanban': true}")

    def __str__(self):
        return self.nome

class ConfiguracaoLoja(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lojas', null=True, blank=True)
    nome = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    cor_primaria = models.CharField(max_length=10, default="#ef4444")
    cor_secundaria = models.CharField(max_length=10, default="#ffffff")
    logo = models.ImageField(upload_to='logos/', null=True, blank=True)
    banner = models.ImageField(upload_to='banners/', null=True, blank=True)
    whatsapp = models.CharField(max_length=20, help_text="Ex: 5511999999999")
    endereco = models.TextField(blank=True, null=True, help_text="Endereço físico da loja")
    horario_funcionamento = models.JSONField(default=dict, help_text="Ex: {'seg': '08:00-18:00'}")
    ativa = models.BooleanField(default=True)
    
    # Delivery Config
    tipo_taxa_entrega = models.CharField(
        max_length=10, 
        choices=[('FIXA', 'Taxa Fixa Única'), ('BAIRRO', 'Taxa por Bairro')],
        default='FIXA'
    )
    taxa_entrega_fixa = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # SaaS Billing
    PLANO_CHOICES = [
        ('START', 'Plano Start'),
        ('PRO', 'Plano Pro'),
        ('ELITE', 'Plano Elite'),
    ]
    plano_tipo = models.CharField(max_length=20, choices=PLANO_CHOICES, default='START')
    plano = models.ForeignKey(Plano, on_delete=models.SET_NULL, null=True, blank=True)
    status_assinatura = models.CharField(
        max_length=20, 
        choices=[('trial', 'Teste'), ('active', 'Ativo'), ('expired', 'Expirado'), ('canceled', 'Cancelado')],
        default='trial'
    )
    valido_ate = models.DateTimeField(null=True, blank=True)
    mp_preapproval_id = models.CharField(max_length=100, blank=True, null=True, help_text="ID da Assinatura no Mercado Pago")
    mp_plan_id = models.CharField(max_length=100, blank=True, null=True, help_text="ID do Plano no Mercado Pago")

    # Evolution API (WhatsApp)
    evolution_instance = models.CharField(max_length=100, blank=True, null=True, help_text="Nome da instância na Evolution API")
    evolution_token = models.CharField(max_length=100, blank=True, null=True, help_text="Token da instância")

    # iFood Integration
    ifood_client_id = models.CharField(max_length=255, blank=True, null=True)
    ifood_client_secret = models.CharField(max_length=255, blank=True, null=True)
    ifood_merchant_id = models.CharField(max_length=100, blank=True, null=True)
    ifood_active = models.BooleanField(default=False)
    ifood_token = models.TextField(blank=True, null=True, help_text="Access Token do iFood")
    ifood_token_expires = models.DateTimeField(blank=True, null=True)

    # Notification Customization
    notificar_preparo = models.BooleanField(default=True, help_text="Notificar cliente quando o pedido entrar em preparo")
    notificar_entrega = models.BooleanField(default=True, help_text="Notificar cliente quando o pedido sair para entrega")
    notificar_finalizado = models.BooleanField(default=True, help_text="Notificar cliente quando o pedido for finalizado")

    msg_preparo = models.TextField(
        default="Olá {cliente}! 👨‍🍳 Seu pedido #{numero} começou a ser preparado em *{loja}*. Em breve avisaremos quando sair para entrega!",
        help_text="Variáveis: {cliente}, {numero}, {loja}"
    )
    msg_entrega = models.TextField(
        default="Olá {cliente}! 🛵 Seu pedido #{numero} de *{loja}* saiu para entrega! Fique atento(a).",
        help_text="Variáveis: {cliente}, {numero}, {loja}"
    )
    msg_finalizado = models.TextField(
        default="Pedido #{numero} de *{loja}* concluído. Obrigado pela preferência, {cliente}! ⭐",
        help_text="Variáveis: {cliente}, {numero}, {loja}"
    )

    def save(self, *args, **kwargs):
        if self.pk:
            old = ConfiguracaoLoja.objects.get(pk=self.pk)
            if self.logo and old.logo != self.logo:
                resize_image(self.logo, (500, 500), quality=75)
            if self.banner and old.banner != self.banner:
                resize_image(self.banner, (1920, 1080), quality=80)
        else:
            if self.logo: resize_image(self.logo, (500, 500), quality=75)
            if self.banner: resize_image(self.banner, (1920, 1080), quality=80)
            
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nome

class PerfilUsuarioLoja(models.Model):
    ROLES = [
        ('owner', 'Proprietário'),
        ('manager', 'Gerente'),
        ('waiter', 'Atendente'),
        ('cashier', 'Operador de Caixa'),
        ('kitchen', 'Cozinha'),
        ('driver', 'Entregador'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='perfis_lojas')
    loja = models.ForeignKey(ConfiguracaoLoja, on_delete=models.CASCADE, related_name='equipe')
    role = models.CharField(max_length=20, choices=ROLES)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'loja')

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()} em {self.loja.nome}"

class Categoria(models.Model):
    loja = models.ForeignKey(ConfiguracaoLoja, on_delete=models.CASCADE, related_name='categorias')
    nome = models.CharField(max_length=100)
    ordem = models.PositiveIntegerField(default=0)
    ativa = models.BooleanField(default=True)

    class Meta:
        ordering = ['ordem']

    def __str__(self):
        return f"{self.loja.nome} - {self.nome}"

class BairroEntrega(models.Model):
    loja = models.ForeignKey(ConfiguracaoLoja, on_delete=models.CASCADE, related_name='bairros_entrega')
    nome = models.CharField(max_length=100)
    taxa = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ['nome']

    def __str__(self):
        return f"{self.nome} - R$ {self.taxa}"

class GrupoDeAtributos(models.Model):
    TIPO_CHOICES = [
        ('RADIO', 'Seleção Única'),
        ('CHECKBOX', 'Seleção Múltipla'),
    ]
    loja = models.ForeignKey(ConfiguracaoLoja, on_delete=models.CASCADE)
    nome = models.CharField(max_length=100) # Ex: "Escolha o ponto da carne"
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES, default='RADIO')
    min_opcoes = models.PositiveIntegerField(default=0)
    max_opcoes = models.PositiveIntegerField(default=1)

    def __str__(self):
        return self.nome

class AtributoOpcao(models.Model):
    grupo = models.ForeignKey(GrupoDeAtributos, on_delete=models.CASCADE, related_name='opcoes')
    nome = models.CharField(max_length=100)
    preco_adicional = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.grupo.nome} - {self.nome}"

class Produto(models.Model):
    categoria = models.ForeignKey(Categoria, on_delete=models.CASCADE, related_name='produtos')
    nome = models.CharField(max_length=255)
    descricao = models.TextField(blank=True)
    preco = models.DecimalField(max_digits=10, decimal_places=2)
    imagem = models.ImageField(upload_to='produtos/', null=True, blank=True)
    disponivel = models.BooleanField(default=True)
    controlar_estoque = models.BooleanField(default=False)
    estoque_atual = models.IntegerField(default=0)
    grupos_atributos = models.ManyToManyField(GrupoDeAtributos, blank=True)

    def save(self, *args, **kwargs):
        if self.controlar_estoque:
            if self.estoque_atual <= 0:
                self.disponivel = False
        
        # Image Optimization
        if self.pk:
            old = Produto.objects.get(pk=self.pk)
            if self.imagem and old.imagem != self.imagem:
                resize_image(self.imagem, (800, 800), quality=70)
        else:
            if self.imagem: resize_image(self.imagem, (800, 800), quality=70)

        super().save(*args, **kwargs)

    def __str__(self):
        return self.nome

class Pedido(models.Model):
    STATUS_CHOICES = [
        ('NOVO', 'Novo'),
        ('PREPARO', 'Em Preparo'),
        ('PRONTO', 'Pronto'),
        ('DESPACHADO', 'Entrega'),
        ('FINALIZADO', 'Finalizado'),
        ('CANCELADO', 'Cancelado'),
    ]
    FORMA_PAGAMENTO_CHOICES = [
        ('DINHEIRO', 'Dinheiro'),
        ('DEBITO', 'Débito'),
        ('CREDITO', 'Crédito'),
        ('PIX', 'Pix'),
    ]
    TIPO_CHOICES = [
        ('ENTREGA', 'Entrega'),
        ('RETIRADA', 'Retirada'),
        ('MESA', 'Mesa'),
        ('BALCAO', 'Balcão'),
    ]
    loja = models.ForeignKey(ConfiguracaoLoja, on_delete=models.CASCADE)
    cliente_nome = models.CharField(max_length=255)
    cliente_whatsapp = models.CharField(max_length=20, blank=True, null=True)
    endereco = models.TextField(blank=True, null=True)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    forma_pagamento = models.CharField(max_length=20, choices=FORMA_PAGAMENTO_CHOICES, default='PIX')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NOVO')
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES, default='ENTREGA')
    taxa_entrega = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    mesa = models.PositiveIntegerField(null=True, blank=True)
    numero_diario = models.PositiveIntegerField(null=True, blank=True)
    observacoes = models.TextField(blank=True, null=True)
    external_id = models.CharField(max_length=100, blank=True, null=True, help_text="ID do pedido em plataformas externas (ex: iFood)")
    origem = models.CharField(max_length=50, default='APP', help_text="APP, IFOOD, WHATSAPP, etc")
    criado_em = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.numero_diario and self.loja_id:
            from django.utils import timezone
            from datetime import timedelta
            from django.db.models import Max
            
            now = timezone.now()
            # Ajustado para fuso BR (UTC-3) para cálculo do dia útil
            br_now = now - timedelta(hours=3)
            today_weekday = br_now.strftime('%a').lower()[:3]
            weekday_map = {
                'mon': 'seg', 'tue': 'ter', 'wed': 'qua', 'thu': 'qui', 
                'fri': 'sex', 'sat': 'sab', 'sun': 'dom'
            }
            today_key = weekday_map.get(today_weekday, 'seg')
            
            horario = self.loja.horario_funcionamento or {}
            dia_config = horario.get(today_key, {})
            
            reset_time_hour = 4
            reset_time_minute = 0
            
            if isinstance(dia_config, dict) and not dia_config.get('closed') and dia_config.get('open'):
                try:
                    open_h, open_m = map(int, dia_config.get('open').split(':'))
                    reset_time_hour = open_h - 3
                    reset_time_minute = open_m
                    if reset_time_hour < 0: reset_time_hour += 24
                except: pass

            current_reset_today = br_now.replace(hour=max(0, min(23, reset_time_hour)), minute=reset_time_minute, second=0, microsecond=0)
            
            if br_now < current_reset_today:
                start_date_br = current_reset_today - timedelta(days=1)
            else:
                start_date_br = current_reset_today

            start_date_utc = start_date_br + timedelta(hours=3)

            last_num = Pedido.objects.filter(
                loja=self.loja, 
                criado_em__gte=start_date_utc
            ).aggregate(Max('numero_diario'))['numero_diario__max'] or 0
            
            self.numero_diario = last_num + 1

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Pedido #{self.id} - {self.cliente_nome}"

class ItemPedido(models.Model):
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name='itens')
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT)
    quantidade = models.PositiveIntegerField(default=1)
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    observacoes = models.TextField(blank=True)
    selecoes = models.JSONField(default=list, help_text="Lista de atributos selecionados")

    def __str__(self):
        return f"{self.quantidade}x {self.produto.nome}"

class Caixa(models.Model):
    STATUS_CHOICES = [
        ('ABERTO', 'Aberto'),
        ('FECHADO', 'Fechado'),
    ]
    loja = models.ForeignKey(ConfiguracaoLoja, on_delete=models.CASCADE)
    operador = models.ForeignKey(User, on_delete=models.PROTECT)
    data_abertura = models.DateTimeField(auto_now_add=True)
    data_fechamento = models.DateTimeField(null=True, blank=True)
    saldo_inicial = models.DecimalField(max_digits=10, decimal_places=2)
    saldo_final_esperado = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    saldo_final_informado = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ABERTO')

    def __str__(self):
        return f"Caixa {self.id} - {self.operador.username} ({self.status})"

class MovimentacaoCaixa(models.Model):
    TIPO_CHOICES = [
        ('VENDA', 'Venda'),
        ('SANGRIA', 'Sangria'),
        ('SUPRIMENTO', 'Suprimento'),
        ('ABERTURA', 'Abertura'),
        ('FECHAMENTO', 'Fechamento'),
    ]
    caixa = models.ForeignKey(Caixa, on_delete=models.CASCADE, related_name='movimentacoes')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    descricao = models.CharField(max_length=255)
    pedido = models.ForeignKey(Pedido, on_delete=models.SET_NULL, null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tipo} - R$ {self.valor}"
