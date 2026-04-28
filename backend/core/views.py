import logging
from django.conf import settings
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.db import transaction
from django.utils.text import slugify
from django.db.models import Q, Sum, Count
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from .models import Plano, ConfiguracaoLoja, Categoria, Produto, GrupoDeAtributos, AtributoOpcao, Pedido, ItemPedido, PerfilUsuarioLoja, Caixa, MovimentacaoCaixa, UserProfile, BairroEntrega, NotificacaoSistema
from .serializers import (
    StoreDetailSerializer, CategoriaSerializer, ProdutoSerializer,
    PedidoSerializer, FlexibleJSONField, GrupoDeAtributosSerializer,
    AtributoOpcaoSerializer, ItemPedidoSerializer, PerfilUsuarioLojaSerializer,
    CaixaSerializer, MovimentacaoCaixaSerializer, UserSerializer, BairroEntregaSerializer, NotificacaoSistemaSerializer
)
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.http import JsonResponse
from rest_framework.exceptions import PermissionDenied
from .services import EvolutionService
from .ifood_service import IFoodService
from .mercadopago_service import MercadoPagoService
from .ai_service import GeminiService
import json
import uuid

logger = logging.getLogger(__name__)

class HasActiveSubscription(permissions.BasePermission):
    message = "Esta loja não possui uma assinatura ativa."
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS and view.action == 'retrieve':
            return True
        is_owner = obj.owner == request.user
        is_team = PerfilUsuarioLoja.objects.filter(loja=obj, user=request.user).exists()
        if not (is_owner or is_team):
            return False
        if obj.status_assinatura not in ['active', 'trial']:
            return False
        if obj.valido_ate and obj.valido_ate < timezone.now():
            return False
        return True

def api_status(request):
    return JsonResponse({"status": "ok", "message": "API is running"})

class RegisterView(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    def create(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        store_name = request.data.get('store_name')
        responsible_name = request.data.get('responsible_name', '')
        if not all([email, password, store_name]):
            return Response({"error": "Email, senha e nome da loja são obrigatórios."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=email).exists() or User.objects.filter(email=email).exists():
            return Response({"error": "Este email já está cadastrado."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            with transaction.atomic():
                user = User.objects.create_user(username=email, email=email, password=password, first_name=responsible_name)
                user.is_active = False # Bloqueia o login até confirmar o email
                user.save()
                
                base_slug = slugify(store_name)
                slug = base_slug
                counter = 1
                while ConfiguracaoLoja.objects.filter(slug=slug).exists():
                    slug = f"{base_slug}-{counter}"
                    counter += 1
                store = ConfiguracaoLoja.objects.create(owner=user, nome=store_name, slug=slug, ativa=True)
                
                PerfilUsuarioLoja.objects.create(user=user, loja=store, role='owner')
                
                profile, _ = UserProfile.objects.get_or_create(user=user)
                token = str(uuid.uuid4())
                profile.verification_token = token
                profile.save()
                
                verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
                subject = "Bem-vindo ao RDS Pedidos - Verifique seu E-mail"
                message = f"Olá {user.first_name or user.username},\n\nObrigado por se cadastrar! Sua loja '{store.nome}' foi criada com sucesso.\n\nPor favor, confirme seu e-mail clicando no link abaixo:\n\n{verify_url}"
                
                logger.info(f"[CADASTRO] Link de verificação para {email}: {verify_url}")
                
                try:
                    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email])
                except Exception as e:
                    logger.error(f"Erro ao enviar e-mail de boas-vindas: {e}")

                return Response({"message": "Conta criada com sucesso! Verifique seu e-mail para ativar sua conta e acessar o sistema.", "store_slug": store.slug, "username": user.username}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['request_password_reset', 'confirm_password_reset', 'confirm_verification']:
            return [permissions.AllowAny()]
        return super().get_permissions()

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='request-password-reset')
    def request_password_reset(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "E-mail é obrigatório."}, status=400)
            
        user = User.objects.filter(email=email).first()
        if user:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}" if hasattr(settings, 'FRONTEND_URL') else f"uid={uid}&token={token}"
            
            subject = "Recuperação de Senha - RDS Pedidos"
            message = f"Olá {user.first_name or user.username},\n\nRecebemos uma solicitação para redefinir sua senha. Clique no link abaixo para prosseguir:\n\n{reset_url}\n\nSe você não solicitou isso, ignore este e-mail."
            
            logger.info(f"[SENHA] Link de recuperação para {email}: {reset_url}")
            
            try:
                send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email])
            except Exception as e:
                logger.error(f"Erro ao enviar e-mail de recuperação: {e}")
                return Response({"error": f"Erro ao enviar e-mail: {str(e)}"}, status=500)
                
        return Response({"message": "Se este e-mail estiver cadastrado, você receberá um link de recuperação em instantes."})

    @action(detail=False, methods=['post'], url_path='confirm-password-reset')
    def confirm_password_reset(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('password')
        
        if not all([uidb64, token, new_password]):
            return Response({"error": "Dados incompletos."}, status=400)
            
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            user.set_password(new_password)
            user.save()
            return Response({"message": "Senha alterada com sucesso!"})
        else:
            return Response({"error": "Link de recuperação inválido ou expirado."}, status=400)

    @action(detail=False, methods=['post'], url_path='confirm-verification')
    def confirm_verification(self, request):
        token = request.data.get('token')
        if not token:
            return Response({"error": "Token é obrigatório."}, status=400)
            
        profile = UserProfile.objects.filter(verification_token=token).first()
        if profile:
            profile.is_verified = True
            profile.verification_token = None
            profile.save()
            
            user = profile.user
            user.is_active = True
            user.save()
            
            return Response({"message": "E-mail verificado com sucesso! Você já pode fazer login."})
        else:
            return Response({"error": "Token inválido."}, status=400)

class StoreViewSet(viewsets.ModelViewSet):
    queryset = ConfiguracaoLoja.objects.all()
    serializer_class = StoreDetailSerializer
    lookup_field = 'slug'
    lookup_url_kwarg = 'slug'
    def get_permissions(self):
        if self.action in ['list', 'create', 'update', 'partial_update', 'destroy', 'migrar_plano']:
            permission_classes = [permissions.IsAuthenticated]
            if self.action != 'migrar_plano':
                permission_classes.append(HasActiveSubscription)
        else: permission_classes = [permissions.AllowAny]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        if self.action in ['list', 'update', 'partial_update', 'destroy']:
            if self.request.user.is_authenticated:
                return ConfiguracaoLoja.objects.filter(Q(owner=self.request.user) | Q(equipe__user=self.request.user)).distinct()
            return ConfiguracaoLoja.objects.none()
        return ConfiguracaoLoja.objects.all()

    @action(detail=True, methods=['get'], url_path='whatsapp-status')
    def whatsapp_status(self, request, slug=None):
        store = self.get_object()
        if not store.evolution_instance: 
            return Response({"status": "disconnected"})
        
        service = EvolutionService()
        try:
            res = service.get_status(store.evolution_instance)
            instance_data = res.get('instance', res)
            state = instance_data.get('state') or res.get('status')
            
            if state == 'open': 
                return Response({"status": "connected"})
            
            qr_res = service.get_qr_code(store.evolution_instance)
            qr_base64 = qr_res.get('base64') or qr_res.get('qrcode', {}).get('base64')
            
            return Response({
                "status": "connecting", 
                "qrCode": qr_base64
            })
        except Exception as e: 
            return Response({"status": "disconnected", "error": str(e)})

    @action(detail=True, methods=['post'], url_path='whatsapp-connect')
    def whatsapp_connect(self, request, slug=None):
        store = self.get_object()
        service = EvolutionService()
        instance_name = store.slug
        try:
            service.create_instance(instance_name)
            store.evolution_instance = instance_name
            store.save()
            service.set_webhook(instance_name)
            qr_res = service.get_qr_code(instance_name)
            qr_base64 = qr_res.get('base64') or qr_res.get('qrcode', {}).get('base64')
            return Response({"status": "connecting", "qrCode": qr_base64})
        except Exception as e: 
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=['post'], url_path='whatsapp-disconnect')
    def whatsapp_disconnect(self, request, slug=None):
        store = self.get_object()
        if not store.evolution_instance: return Response({"message": "Not connected"})
        service = EvolutionService()
        try:
            service.logout_instance(store.evolution_instance)
            service.delete_instance(store.evolution_instance)
            store.evolution_instance = None
            store.save()
            return Response({"message": "Disconnected"})
        except Exception as e: return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=['post'], url_path='migrar-plano')
    def migrar_plano(self, request, slug=None):
        store = self.get_object()
        plano_id = request.data.get('plano_id')
        try:
            plano = Plano.objects.get(id=plano_id)
            store.plano = plano
            store.status_assinatura = 'active'
            store.valido_ate = timezone.now() + timedelta(days=30)
            store.save()
            return Response({"message": "Plano migrado"})
        except Plano.DoesNotExist: return Response({"error": "Plano invalid"}, status=404)

class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        loja = ConfiguracaoLoja.objects.filter(Q(owner=request.user) | Q(equipe__user=request.user)).first()
        if not loja: return Response({"error": "No store"}, status=404)
        
        from django.utils import timezone
        today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        pedidos_base = Pedido.objects.filter(loja=loja)
        pedidos_concluidos = pedidos_base.filter(status='FINALIZADO')
        faturamento = pedidos_concluidos.aggregate(Sum('total'))['total__sum'] or 0
        total_concluidos = pedidos_concluidos.count()
        ticket_medio = float(faturamento / total_concluidos) if total_concluidos > 0 else 0.0
        
        novos_hoje = pedidos_base.filter(criado_em__gte=today).count()
        pedidos_ativos = pedidos_base.exclude(status__in=['FINALIZADO', 'CANCELADO']).count()
        mesas_ocupadas = pedidos_base.filter(tipo='MESA').exclude(status__in=['FINALIZADO', 'CANCELADO']).values('mesa').distinct().count()
        
        from .models import Caixa
        caixa_aberto = Caixa.objects.filter(loja=loja, status='ABERTO').last()
        saldo_caixa = 0.0
        if caixa_aberto:
            total_entradas = caixa_aberto.movimentacoes.filter(tipo__in=['ABERTURA', 'VENDA', 'SUPRIMENTO']).aggregate(Sum('valor'))['valor__sum'] or 0
            total_saidas = caixa_aberto.movimentacoes.filter(tipo__in=['SANGRIA']).aggregate(Sum('valor'))['valor__sum'] or 0
            saldo_caixa = float(total_entradas - total_saidas)

        # Recent Orders for table
        from .serializers import PedidoSerializer
        recent_orders = pedidos_base.order_by('-criado_em')[:5]
        
        # Chart Data (last 24 hours)
        chart_data = []
        for i in range(24):
            hour_start = timezone.now() - timezone.timedelta(hours=23-i)
            hour_end = hour_start + timezone.timedelta(hours=1)
            hour_fat = pedidos_concluidos.filter(criado_em__range=(hour_start, hour_end)).aggregate(Sum('total'))['total__sum'] or 0
            chart_data.append({
                "hour": hour_start.strftime("%H:00"),
                "total": float(hour_fat)
            })

        return Response({
            "stats": {
                "faturamento": float(faturamento),
                "total_pedidos": pedidos_base.count(),
                "pedidos_concluidos": total_concluidos,
                "ticket_medio": ticket_medio,
                "novos_hoje": novos_hoje,
                "pedidos_ativos": pedidos_ativos,
                "mesas_ocupadas": mesas_ocupadas,
                "saldo_caixa": saldo_caixa,
            },
            "recent_orders": PedidoSerializer(recent_orders, many=True).data,
            "chart_data": chart_data,
            "top_products": [] # To implement later if needed
        })

class PedidoViewSet(viewsets.ModelViewSet):
    serializer_class = PedidoSerializer
    def get_permissions(self):
        if self.action in ['create', 'public_history']: return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def mesas(self, request):
        loja_id = request.query_params.get('loja_id')
        if not loja_id:
            return Response({"error": "Loja ID required"}, status=400)
            
        from django.db.models import Count, Sum, Max
        # Filtra apenas pedidos ativos (não finalizados/cancelados) do tipo MESA
        pedidos_ativos = Pedido.objects.filter(
            loja_id=loja_id,
            tipo='MESA'
        ).exclude(status__in=['FINALIZADO', 'CANCELADO'])
        
        # Agrupa por mesa, pegando o nome do cliente mais recente ou primeiro
        mesas_stats = pedidos_ativos.values('mesa').annotate(
            total=Sum('total'),
            itens_count=Count('itens'),
            cliente_nome=Max('cliente_nome')
        )
        
        return Response(list(mesas_stats))

    def get_queryset(self):
        from django.utils.dateparse import parse_datetime
        user = self.request.user
        if self.action == 'create': return Pedido.objects.all()
        
        queryset = Pedido.objects.filter(Q(loja__owner=user) | Q(loja__equipe__user=user)).distinct().order_by('-criado_em')
        
        loja_id = self.request.query_params.get('loja_id')
        if loja_id: queryset = queryset.filter(loja_id=loja_id)

        mesa = self.request.query_params.get('mesa')
        if mesa: queryset = queryset.filter(mesa=mesa)

        tipo = self.request.query_params.get('tipo')
        if tipo: queryset = queryset.filter(tipo=tipo)

        status_param = self.request.query_params.get('status')
        if status_param: queryset = queryset.filter(status=status_param)

        status_in = self.request.query_params.get('status__in')
        if status_in: 
            status_list = status_in.split(',')
            queryset = queryset.filter(status__in=status_list)

        include_pending = self.request.query_params.get('include_pending') == 'true'
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date or end_date:
            date_filter = Q()
            if start_date:
                dt = parse_datetime(start_date)
                if dt: date_filter &= Q(criado_em__gte=dt)
            if end_date:
                dt = parse_datetime(end_date)
                if dt: date_filter &= Q(criado_em__lte=dt)
            
            if include_pending:
                queryset = queryset.filter(date_filter | ~Q(status__in=['FINALIZADO', 'CANCELADO']))
            else:
                queryset = queryset.filter(date_filter)
        elif include_pending:
            queryset = queryset.filter(~Q(status__in=['FINALIZADO', 'CANCELADO']))

        return queryset

    @action(detail=False, methods=['get'], url_path='crm-clientes')
    def crm_clientes(self, request):
        user = request.user
        loja_id = request.query_params.get('loja_id')
        if not loja_id: return Response({"error": "Loja ID required"}, status=400)
        
        # Filtra pedidos da loja que tenham WhatsApp (cliente identificado)
        pedidos_loja = Pedido.objects.filter(
            loja_id=loja_id, 
            cliente_whatsapp__isnull=False
        ).exclude(cliente_whatsapp='')

        # Agrupamento manual via Python para mais flexibilidade (ou via annotate no DB)
        # Vamos usar annotate do Django para performance
        from django.db.models import Count, Sum, Max
        stats = pedidos_loja.values('cliente_whatsapp').annotate(
            nome=Max('cliente_nome'),
            total_pedidos=Count('id'),
            total_gasto=Sum('total'),
            ultima_compra=Max('criado_em')
        ).order_by('-ultima_compra')

        return Response(list(stats))
    
    @action(detail=False, methods=['post'], url_path='excluir-cliente-crm')
    def excluir_cliente_crm(self, request):
        loja_id = request.data.get('loja_id')
        cliente_whatsapp = request.data.get('whatsapp')
        
        if not all([loja_id, cliente_whatsapp]):
            return Response({"error": "Missing params"}, status=400)
            
        # Deleta todos os pedidos deste cliente nesta loja
        deleted_count, _ = Pedido.objects.filter(
            loja_id=loja_id, 
            cliente_whatsapp=cliente_whatsapp
        ).delete()
        
        return Response({"message": f"Cliente e {deleted_count} pedidos removidos com sucesso."})

    @action(detail=False, methods=['post'], url_path='enviar-mensagem-crm')
    def enviar_mensagem_crm(self, request):
        from .services import EvolutionService
        
        loja_id = request.data.get('loja_id')
        cliente_whatsapp = request.data.get('whatsapp')
        mensagem = request.data.get('mensagem')
        
        if not all([loja_id, cliente_whatsapp, mensagem]):
            return Response({"error": "Missing params"}, status=400)
            
        from .models import ConfiguracaoLoja
        loja_config = ConfiguracaoLoja.objects.filter(loja_id=loja_id).first()
        
        if not loja_config or not loja_config.evolution_instance:
            return Response({"error": "Evolution API não configurada nesta loja"}, status=400)
            
        service = EvolutionService()
        # O service já pega API_KEY do env, mas a instância vem da loja
        res = service.send_message(
            number=cliente_whatsapp,
            message=mensagem,
            instance_name=loja_config.evolution_instance
        )
        
        return Response(res)

    @action(detail=False, methods=['get'], url_path='get-cliente-detalhes')
    def get_cliente_detalhes(self, request):
        try:
            import re
            from .models import PerfilCliente
            from .serializers import PerfilClienteSerializer

            loja_id = request.query_params.get('loja_id')
            raw_whatsapp = request.query_params.get('whatsapp')
            
            if not all([loja_id, raw_whatsapp]):
                return Response({"error": "Missing params (loja_id or whatsapp)"}, status=400)
            
            # Clean whatsapp (only digits)
            whatsapp = re.sub(r'\D', '', raw_whatsapp)
                
            # Get orders
            pedidos = Pedido.objects.filter(loja_id=loja_id, cliente_whatsapp=whatsapp).order_by('-criado_em')
            
            # Get or create profile
            perfil, _ = PerfilCliente.objects.get_or_create(loja_id=loja_id, whatsapp=whatsapp)
            if not perfil.nome and pedidos.exists():
                perfil.nome = pedidos.first().cliente_nome
                perfil.save()
                
            return Response({
                "perfil": PerfilClienteSerializer(perfil).data,
                "historico": PedidoSerializer(pedidos, many=True).data
            })
        except Exception as e:
            return Response({"error": f"Erro interno: {str(e)}"}, status=500)

    @action(detail=False, methods=['post'], url_path='salvar-cliente-perfil')
    def salvar_cliente_perfil(self, request):
        try:
            import re
            from .models import PerfilCliente
            
            loja_id = request.data.get('loja_id')
            raw_whatsapp = request.data.get('whatsapp')
            observacoes = request.data.get('observacoes')
            
            if not all([loja_id, raw_whatsapp]):
                return Response({"error": "Missing params (loja_id or whatsapp)"}, status=400)
            
            # Clean whatsapp
            whatsapp = re.sub(r'\D', '', raw_whatsapp)
                
            perfil, _ = PerfilCliente.objects.get_or_create(loja_id=loja_id, whatsapp=whatsapp)
            perfil.observacoes = observacoes
            perfil.save()
            
            return Response({"message": "Perfil atualizado com sucesso."})
        except Exception as e:
            return Response({"error": f"Erro interno: {str(e)}"}, status=500)

    @action(detail=False, methods=['get'], url_path='public-history')
    def public_history(self, request):
        phone = request.query_params.get('phone')
        if not phone: return Response({"error": "Phone required"}, status=400)
        cleaned = ''.join(filter(str.isdigit, phone))
        qs = Pedido.objects.filter(cliente_whatsapp__icontains=cleaned).order_by('-criado_em')
        return Response(PedidoSerializer(qs[:20], many=True).data)

class CategoriaViewSet(viewsets.ModelViewSet):
    serializer_class = CategoriaSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Categoria.objects.filter(Q(loja__owner=self.request.user) | Q(loja__equipe__user=self.request.user)).distinct()

class ProdutoViewSet(viewsets.ModelViewSet):
    serializer_class = ProdutoSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Produto.objects.filter(Q(categoria__loja__owner=self.request.user) | Q(categoria__loja__equipe__user=self.request.user)).distinct()

class GrupoDeAtributosViewSet(viewsets.ModelViewSet):
    serializer_class = GrupoDeAtributosSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return GrupoDeAtributos.objects.filter(Q(loja__owner=self.request.user) | Q(loja__equipe__user=self.request.user)).distinct()

class AtributoOpcaoViewSet(viewsets.ModelViewSet):
    serializer_class = AtributoOpcaoSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return AtributoOpcao.objects.filter(Q(grupo__loja__owner=self.request.user) | Q(grupo__loja__equipe__user=self.request.user)).distinct()

class TeamMemberViewSet(viewsets.ModelViewSet):
    serializer_class = PerfilUsuarioLojaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PerfilUsuarioLoja.objects.filter(Q(loja__owner=self.request.user) | Q(loja__equipe__user=self.request.user)).distinct()

    def create(self, request, *args, **kwargs):
        full_name = request.data.get('full_name')
        email = request.data.get('email')
        password = request.data.get('password')
        loja_id = request.data.get('loja')
        role = request.data.get('role', 'waiter')

        if not all([email, password, loja_id]):
            return Response({"error": "Email, senha e loja são obrigatórios."}, status=400)

        # Verificar se o usuário já existe
        if User.objects.filter(username=email).exists() or User.objects.filter(email=email).exists():
            return Response({"error": "Este email já está cadastrado."}, status=400)

        try:
            # Verificar se a loja existe e o usuário tem permissão nela
            loja = ConfiguracaoLoja.objects.get(pk=loja_id)
            if loja.owner != request.user and not PerfilUsuarioLoja.objects.filter(loja=loja, user=request.user, role='manager').exists():
                return Response({"error": "Você não tem permissão para adicionar membros a esta loja."}, status=403)

            with transaction.atomic():
                # Criar o usuário
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    password=password,
                    first_name=full_name
                )
                user.is_active = True # Membros de equipe são ativos por padrão
                user.save()

                # Criar o perfil vinculado à loja
                perfil = PerfilUsuarioLoja.objects.create(
                    user=user,
                    loja=loja,
                    role=role
                )

                serializer = self.get_serializer(perfil)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ConfiguracaoLoja.DoesNotExist:
            return Response({"error": "Loja não encontrada."}, status=404)
        except Exception as e:
            return Response({"error": f"Erro ao criar membro: {str(e)}"}, status=500)

class CaixaViewSet(viewsets.ModelViewSet):
    serializer_class = CaixaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Caixa.objects.filter(Q(loja__owner=self.request.user) | Q(loja__equipe__user=self.request.user)).distinct()

    @action(detail=False, methods=['get'])
    def status(self, request):
        loja_id = request.query_params.get('loja_id')
        if not loja_id: return Response({"error": "Loja ID required"}, status=400)
        caixa = Caixa.objects.filter(loja_id=loja_id, status='ABERTO').last()
        if not caixa: return Response(None, status=200)
        return Response(CaixaSerializer(caixa).data)

    @action(detail=False, methods=['post'])
    def abrir(self, request):
        try:
            loja_id = request.data.get('loja_id')
            saldo_inicial = request.data.get('saldo_inicial', 0)
            user = request.user
            
            if not loja_id:
                return Response({"error": "ID da loja não fornecido."}, status=400)
            
            if Caixa.objects.filter(loja_id=int(loja_id), status='ABERTO').exists():
                return Response({"error": "Já existe um caixa aberto para esta loja."}, status=400)
            
            with transaction.atomic():
                caixa = Caixa.objects.create(
                    loja_id=int(loja_id),
                    operador=user,
                    saldo_inicial=Decimal(str(saldo_inicial).replace(',', '.')),
                    status='ABERTO'
                )
                MovimentacaoCaixa.objects.create(
                    caixa=caixa,
                    tipo='ABERTURA',
                    valor=Decimal(str(saldo_inicial).replace(',', '.')),
                    descricao='Abertura de Caixa'
                )
            return Response(CaixaSerializer(caixa).data)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": f"Erro interno ao abrir caixa: {str(e)}"}, status=500)

    @action(detail=True, methods=['post'])
    def fechar(self, request, pk=None):
        caixa = self.get_object()
        saldo_final_informado = request.data.get('saldo_final', 0)
        
        pending = Pedido.objects.filter(loja=caixa.loja).exclude(status__in=['FINALIZADO', 'CANCELADO'])
        if pending.exists():
            return Response({"error": f"Existem {pending.count()} pedidos pendentes. Finalize-os antes de fechar o caixa."}, status=400)

        with transaction.atomic():
            total_entradas = caixa.movimentacoes.filter(tipo__in=['ABERTURA', 'VENDA', 'SUPRIMENTO']).aggregate(Sum('valor'))['valor__sum'] or Decimal('0.00')
            total_saidas = caixa.movimentacoes.filter(tipo__in=['SANGRIA']).aggregate(Sum('valor'))['valor__sum'] or Decimal('0.00')
            saldo_esperado = total_entradas - total_saidas
            
            caixa.status = 'FECHADO'
            caixa.data_fechamento = timezone.now()
            caixa.saldo_final_esperado = saldo_esperado
            caixa.saldo_final_informado = saldo_final_informado
            caixa.save()
            
            MovimentacaoCaixa.objects.create(
                caixa=caixa,
                tipo='FECHAMENTO',
                valor=saldo_final_informado,
                descricao='Fechamento de Caixa'
            )
        return Response(CaixaSerializer(caixa).data)

    @action(detail=True, methods=['post'])
    def sangria(self, request, pk=None):
        caixa = self.get_object()
        valor = request.data.get('valor')
        descricao = request.data.get('descricao', 'Sangria')
        MovimentacaoCaixa.objects.create(caixa=caixa, tipo='SANGRIA', valor=valor, descricao=descricao)
        return Response({"message": "Sangria registrada"})

    @action(detail=True, methods=['post'])
    def suprimento(self, request, pk=None):
        caixa = self.get_object()
        valor = request.data.get('valor')
        descricao = request.data.get('descricao', 'Suprimento')
        MovimentacaoCaixa.objects.create(caixa=caixa, tipo='SUPRIMENTO', valor=valor, descricao=descricao)
        return Response({"message": "Suprimento registrado"})

    @action(detail=True, methods=['get'])
    def blocking_orders(self, request, pk=None):
        caixa = self.get_object()
        pending = Pedido.objects.filter(loja=caixa.loja).exclude(status__in=['FINALIZADO', 'CANCELADO'])
        return Response(PedidoSerializer(pending, many=True).data)

    @action(detail=True, methods=['post'])
    def force_finalize_all(self, request, pk=None):
        caixa = self.get_object()
        Pedido.objects.filter(loja=caixa.loja).exclude(status__in=['FINALIZADO', 'CANCELADO']).update(status='FINALIZADO')
        return Response({"message": "Todos os pedidos foram finalizados."})

    @action(detail=False, methods=['post'])
    def venda(self, request):
        caixa_id = request.data.get('caixa')
        try:
            caixa = Caixa.objects.get(id=caixa_id)
        except Caixa.DoesNotExist:
            return Response({"error": "Caixa inválido"}, status=400)
            
        pedido_data = request.data.copy()
        pedido_data['loja'] = caixa.loja.id
        pedido_data['status'] = 'FINALIZADO'
        
        mesa_orders = request.data.get('mesa_orders', [])
        
        serializer = PedidoSerializer(data=pedido_data)
        if serializer.is_valid():
            with transaction.atomic():
                pedido = serializer.save()
                
                # Finaliza os pedidos vinculados (ex: pedidos de mesa que estão sendo pagos)
                if mesa_orders:
                    Pedido.objects.filter(id__in=mesa_orders).update(status='FINALIZADO')

                MovimentacaoCaixa.objects.create(
                    caixa=caixa,
                    tipo='VENDA',
                    valor=pedido.total,
                    descricao=f'Venda #{pedido.id}',
                    pedido=pedido
                )
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

class BairroEntregaViewSet(viewsets.ModelViewSet):
    serializer_class = BairroEntregaSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return BairroEntrega.objects.filter(Q(loja__owner=self.request.user) | Q(loja__equipe__user=self.request.user)).distinct()

class NotificacaoSistemaViewSet(viewsets.ModelViewSet):
    serializer_class = NotificacaoSistemaSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return NotificacaoSistema.objects.filter(Q(loja__owner=self.request.user) | Q(loja__equipe__user=self.request.user)).distinct()

class MercadoPagoWebhookView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        logger.info(f"Mercado Pago Webhook: {request.data}")
        return Response({"status": "received"})

class WebhookEvolutionView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request, instancia=None):
        logger.info(f"Evolution Webhook ({instancia}): {request.data}")
        return Response({"status": "received"})
