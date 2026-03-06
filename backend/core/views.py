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
from .models import Plano, ConfiguracaoLoja, Categoria, Produto, GrupoDeAtributos, AtributoOpcao, Pedido, ItemPedido, PerfilUsuarioLoja, Caixa, MovimentacaoCaixa, UserProfile
from .serializers import (
    StoreDetailSerializer, CategoriaSerializer, ProdutoSerializer,
    PedidoSerializer, FlexibleJSONField, GrupoDeAtributosSerializer,
    AtributoOpcaoSerializer, ItemPedidoSerializer, PerfilUsuarioLojaSerializer,
    CaixaSerializer, MovimentacaoCaixaSerializer, UserSerializer, BairroEntregaSerializer
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
                base_slug = slugify(store_name)
                slug = base_slug
                counter = 1
                while ConfiguracaoLoja.objects.filter(slug=slug).exists():
                    slug = f"{base_slug}-{counter}"
                    counter += 1
                store = ConfiguracaoLoja.objects.create(owner=user, nome=store_name, slug=slug, ativa=True)
                
                # Create profile entry for owner consistency
                PerfilUsuarioLoja.objects.create(user=user, loja=store, role='owner')
                
                # Send verification email
                profile, _ = UserProfile.objects.get_or_create(user=user)
                token = str(uuid.uuid4())
                profile.verification_token = token
                profile.save()
                
                verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
                subject = "Bem-vindo ao RDS Pedidos - Verifique seu E-mail"
                message = f"Olá {user.first_name or user.username},\n\nObrigado por se cadastrar! Sua loja '{store.nome}' foi criada com sucesso.\n\nPor favor, confirme seu e-mail clicando no link abaixo:\n\n{verify_url}"
                
                try:
                    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email])
                except Exception as e:
                    logger.error(f"Erro ao enviar e-mail de boas-vindas: {e}")

                return Response({"message": "Conta e loja criadas com sucesso! Verifique seu e-mail para ativar sua conta.", "store_slug": store.slug, "username": user.username}, status=status.HTTP_201_CREATED)
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
            
            # In a real app, this URL should point to your frontend
            reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}" if hasattr(settings, 'FRONTEND_URL') else f"uid={uid}&token={token}"
            
            subject = "Recuperação de Senha - RDS Pedidos"
            message = f"Olá {user.first_name or user.username},\n\nRecebemos uma solicitação para redefinir sua senha. Clique no link abaixo para prosseguir:\n\n{reset_url}\n\nSe você não solicitou isso, ignore este e-mail."
            
            try:
                send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email])
            except Exception as e:
                return Response({"error": f"Erro ao enviar e-mail: {str(e)}"}, status=500)
                
        # Always return success to prevent email enumeration
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

    @action(detail=False, methods=['post'], url_path='request-verification')
    def request_verification(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        
        if profile.is_verified:
            return Response({"message": "Seu e-mail já está verificado."})
            
        token = str(uuid.uuid4())
        profile.verification_token = token
        profile.save()
        
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}" if hasattr(settings, 'FRONTEND_URL') else f"token={token}"
        
        subject = "Verificação de E-mail - RDS Pedidos"
        message = f"Olá {user.first_name or user.username},\n\nPor favor, confirme seu e-mail clicando no link abaixo:\n\n{verify_url}"
        
        try:
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])
            return Response({"message": "E-mail de verificação enviado!"})
        except Exception as e:
            return Response({"error": f"Erro ao enviar e-mail: {str(e)}"}, status=500)

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
            return Response({"message": "E-mail verificado com sucesso!"})
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
            # HasActiveSubscription might block migrating if already expired, 
            # so we only require IsAuthenticated for migration.
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
        if not store.evolution_instance: return Response({"status": "disconnected"})
        service = EvolutionService()
        try:
            res = service.get_status(store.evolution_instance)
            state = res.get('instance', {}).get('state')
            if state == 'open': return Response({"status": "connected"})
            qr_res = service.get_qr_code(store.evolution_instance)
            return Response({"status": "connecting", "qrCode": qr_res.get('base64')})
        except Exception as e: return Response({"status": "disconnected", "error": str(e)})

    @action(detail=True, methods=['post'], url_path='whatsapp-connect')
    def whatsapp_connect(self, request, slug=None):
        store = self.get_object()
        service = EvolutionService()
        instance_name = store.slug
        try:
            service.create_instance(instance_name)
            store.evolution_instance = instance_name
            store.save()
            qr_res = service.get_qr_code(instance_name)
            return Response({"status": "connecting", "qrCode": qr_res.get('base64')})
        except Exception as e: return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        except Exception as e: return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='ifood-sync')
    def ifood_sync(self, request, slug=None):
        store = self.get_object()
        if not store.ifood_active or not settings.IFOOD_CLIENT_ID:
            return Response({"error": "Integração iFood não está ativa ou configurada."}, status=400)
        
        service = IFoodService(store)
        events = service.get_events()
        
        processed_count = 0
        event_ids = []
        
        for event in events:
            event_ids.append(event['id'])
            if event['eventType'] == 'CREATED':
                order_id = event['orderId']
                # Check if we already have this order
                if not Pedido.objects.filter(external_id=order_id).exists():
                    details = service.get_order_details(order_id)
                    if details:
                        # Convert iFood order to our Pedido
                        with transaction.atomic():
                            # Simple mapping for now
                            pedido = Pedido.objects.create(
                                loja=store,
                                cliente_nome=details.get('customer', {}).get('name', 'Cliente iFood'),
                                total=Decimal(str(details.get('total', {}).get('orderAmount', 0))),
                                status='NOVO',
                                tipo='ENTREGA' if details.get('orderType') == 'DELIVERY' else 'RETIRADA',
                                external_id=order_id,
                                origem='IFOOD',
                                observacoes=details.get('notes', '')
                            )
                            # Add items
                            for item in details.get('items', []):
                                prod = Produto.objects.filter(categoria__loja=store, nome__iexact=item.get('name')).first()
                                if prod:
                                    ItemPedido.objects.create(
                                        pedido=pedido,
                                        produto=prod,
                                        quantidade=item.get('quantity', 1),
                                        preco_unitario=Decimal(str(item.get('unitPrice', 0))),
                                        observacoes=item.get('observations', '')
                                    )
                        processed_count += 1
        
        if event_ids:
            service.acknowledge_events(event_ids)

        return Response({"message": f"Sincronização concluída. {processed_count} novos pedidos importados."})

    @action(detail=True, methods=['post'], url_path='ifood-import-menu')
    def ifood_import_menu(self, request, slug=None):
        store = self.get_object()
        if not store.ifood_active or not settings.IFOOD_CLIENT_ID:
            return Response({"error": "Integração iFood não está ativa ou configurada."}, status=400)
            
        service = IFoodService(store)
        result = service.import_catalog()
        
        if "error" in result:
            return Response({"error": result["error"]}, status=400)
            
        return Response({
            "message": f"Cardápio importado com sucesso! {result['categories']} categorias e {result['products']} produtos criados/atualizados."
        })

    @action(detail=True, methods=['post'], url_path='mp-create-subscription')
    def mp_create_subscription(self, request, slug=None):
        store = self.get_object()
        plan_type = request.data.get('plan_type') # 'START', 'PRO', 'ELITE'
        
        if plan_type not in ['START', 'PRO', 'ELITE']:
            return Response({"error": "Plano inválido."}, status=400)
            
        # Preços definidos na nossa conversa estratégica
        prices = {
            'START': 49.90,
            'PRO': 129.90,
            'ELITE': 199.90
        }
        
        service = MercadoPagoService()
        plan_title = f"{plan_type} - RDS Gestor de Pedidos"
        amount = prices[plan_type]
        
        try:
            print(f"DEBUG: Creating Plan for {plan_title}")
            # No Mercado Pago, o fluxo mais simples para Assinatura via Checkout 
            # é criar um Plano e enviar o cliente para o init_point dele.
            plan_res = service.create_plan(plan_title, float(amount))
            print(f"DEBUG: Plan Full Response: {json.dumps(plan_res)}")
            
            init_point = plan_res.get('init_point')
            plan_id = plan_res.get('id')
            
            if not plan_id:
                 return Response({
                     "error": "Falha ao criar plano no Mercado Pago.", 
                     "details": plan_res
                }, status=400)

            # Se por algum motivo o init_point não vier no JSON, montamos o link padrão
            if not init_point:
                init_point = f"https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id={plan_id}"

            # Salva o ID do plano que o usuário escolheu
            store.mp_plan_id = plan_id
            store.plano_tipo = plan_type
            store.save()
            
            return Response({
                "init_point": init_point,
                "message": "Iniciando processo de assinatura..."
            })
            
        except Exception as e:
            print(f"ERROR: Exception in mp_create_subscription: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({"error": f"Erro interno: {str(e)}"}, status=500)

    @action(detail=True, methods=['post'], url_path='ifood-verify')
    def ifood_verify(self, request, slug=None):
        store = self.get_object()
        if not store.ifood_merchant_id:
            return Response({"error": "ID da loja (Merchant ID) não informado."}, status=400)
            
        service = IFoodService(store)
        catalogs = service.get_catalogs()
        
        # If catalogs returns a list, the ID is valid for the authorized developer app
        if catalogs and not isinstance(catalogs, dict):
            return Response({"message": "Conexão com iFood estabelecida com sucesso!"})
        else:
            return Response({"error": "Não foi possível validar o Merchant ID. Verifique se o código está correto."}, status=400)

    @action(detail=True, methods=['post'], url_path='migrar-plano')
    def migrar_plano(self, request, slug=None):
        print(f"DEBUG: migrar_plano called for slug: {slug}", flush=True)
        store = self.get_object()
        print(f"DEBUG: Found store: {store.nome}", flush=True)
        plano_id = request.data.get('plano_id')
        if not plano_id: return Response({"error": "plano_id é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            plano = Plano.objects.get(id=plano_id)
            store.plano = plano
            store.status_assinatura = 'active'
            store.valido_ate = timezone.now() + timedelta(days=30)
            store.save()
            return Response({"message": f"Plano {plano.nome} ativado com sucesso para testar."}, status=status.HTTP_200_OK)
        except Plano.DoesNotExist:
            return Response({"error": "Plano não encontrado"}, status=status.HTTP_404_NOT_FOUND)

    def update(self, request, *args, **kwargs):
        with open('debug_frontend_payload.txt', 'w') as f:
            f.write(str(dict(request.data)))
            
        if 'horario_funcionamento' in request.data and isinstance(request.data['horario_funcionamento'], str):
            try:
                data = request.data.copy()
                data['horario_funcionamento'] = json.loads(data['horario_funcionamento'])
                serializer = self.get_serializer(self.get_object(), data=data, partial=kwargs.get('partial', False))
                serializer.is_valid(raise_exception=True)
                with open('debug_frontend_payload.txt', 'a') as f:
                    f.write("\nValid custom: " + str(serializer.validated_data))
                self.perform_update(serializer)
                return Response(serializer.data)
            except json.JSONDecodeError: pass
        
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        with open('debug_frontend_payload.txt', 'a') as f:
            f.write("\nValid super: " + str(serializer.validated_data))
        return super().update(request, *args, **kwargs)

class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        loja = ConfiguracaoLoja.objects.filter(Q(owner=request.user) | Q(equipe__user=request.user)).first()
        if not loja:
            return Response({"error": "Loja não encontrada"}, status=404)

        now = timezone.now()
        # Adjusted for BR timezone (UTC-3)
        br_now = now - timedelta(hours=3)
        today_weekday = br_now.strftime('%a').lower()[:3]
        
        weekday_map = {
            'mon': 'seg', 'tue': 'ter', 'wed': 'qua', 'thu': 'qui', 
            'fri': 'sex', 'sat': 'sab', 'sun': 'dom'
        }
        today_key = weekday_map.get(today_weekday, 'seg')
        
        horario = loja.horario_funcionamento or {}
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

        pedidos_hoje = Pedido.objects.filter(loja=loja, criado_em__gte=start_date_utc)
        
        finalizados = pedidos_hoje.filter(status='FINALIZADO')
        faturamento = finalizados.aggregate(total=Sum('total'))['total'] or 0
        concluidos_count = finalizados.count()
        total_count = pedidos_hoje.count()
        ticket_medio = float(faturamento) / concluidos_count if concluidos_count > 0 else 0
        
        em_preparo = pedidos_hoje.filter(status__in=['PREPARO', 'PRONTO']).count()
        novos = pedidos_hoje.filter(status='NOVO').count()
        
        historico = pedidos_hoje.order_by('-criado_em')[:10]
        
        return Response({
            "stats": {
                "faturamento": float(faturamento),
                "pedidos_concluidos": concluidos_count,
                "total_pedidos": total_count,
                "ticket_medio": ticket_medio,
                "em_preparo": em_preparo,
                "novos_hoje": novos
            },
            "recent_orders": PedidoSerializer(historico, many=True).data
        })

class CategoriaViewSet(viewsets.ModelViewSet):
    serializer_class = CategoriaSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return Categoria.objects.filter(Q(loja__owner=self.request.user) | Q(loja__equipe__user=self.request.user)).distinct()

    def perform_create(self, serializer):
        loja = ConfiguracaoLoja.objects.filter(Q(owner=self.request.user) | Q(equipe__user=self.request.user)).first()
        if not loja:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Você não possui uma loja vinculada para criar categorias.")
        serializer.save(loja=loja)

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
    
    def perform_create(self, serializer):
        # Find user's store
        loja = ConfiguracaoLoja.objects.filter(Q(owner=self.request.user) | Q(equipe__user=self.request.user)).first()
        if not loja:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Você não possui uma loja vinculada para criar adicionais.")
        serializer.save(loja=loja)

class AtributoOpcaoViewSet(viewsets.ModelViewSet):
    serializer_class = AtributoOpcaoSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return AtributoOpcao.objects.filter(Q(grupo__loja__owner=self.request.user) | Q(grupo__loja__equipe__user=self.request.user)).distinct()

class BairroEntregaViewSet(viewsets.ModelViewSet):
    serializer_class = BairroEntregaSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return BairroEntrega.objects.filter(Q(loja__owner=self.request.user) | Q(loja__equipe__user=self.request.user)).distinct()
        
    def perform_create(self, serializer):
        loja = ConfiguracaoLoja.objects.filter(Q(owner=self.request.user) | Q(equipe__user=self.request.user)).first()
        if not loja:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Você não possui uma loja vinculada para criar bairros de entrega.")
        serializer.save(loja=loja)

class PedidoViewSet(viewsets.ModelViewSet):
    serializer_class = PedidoSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        from django.utils.dateparse import parse_datetime
        if self.action == 'create':
            return Pedido.objects.all()
        
        user = self.request.user
        queryset = Pedido.objects.filter(Q(loja__owner=user) | Q(loja__equipe__user=user)).distinct().order_by('-criado_em')

        # Get stores where user is specifically a driver
        driver_store_ids = PerfilUsuarioLoja.objects.filter(user=user, role='driver').values_list('loja_id', flat=True)
        
        if driver_store_ids:
            is_generic_staff = PerfilUsuarioLoja.objects.filter(user=user).exclude(role='driver').exists()
            is_owner = ConfiguracaoLoja.objects.filter(owner=user).exists()
            
            if not (is_owner or is_generic_staff):
                queryset = queryset.filter(status__in=['PRONTO', 'DESPACHADO'])

        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            dt = parse_datetime(start_date)
            if dt:
                queryset = queryset.filter(criado_em__gte=dt)
        if end_date:
            dt = parse_datetime(end_date)
            if dt:
                queryset = queryset.filter(criado_em__lte=dt)
        
        tipo = self.request.query_params.get('tipo')
        if tipo:
            queryset = queryset.filter(tipo=tipo)
            
        mesa = self.request.query_params.get('mesa')
        if mesa:
            queryset = queryset.filter(mesa=mesa)
            
        return queryset

    def perform_update(self, serializer):
        instance = serializer.save()
        # Trigger iFood status update if applicable
        if instance.origem == 'IFOOD' and instance.external_id:
            try:
                service = IFoodService(instance.loja)
                service.update_order_status(instance.external_id, instance.status)
            except Exception as e:
                print(f"Erro ao atualizar status no iFood: {e}")

    @action(detail=False, methods=['get'])
    def mesas(self, request):
        loja_id = request.query_params.get('loja_id')
        if not loja_id:
            # Try to get from user's store if not provided
            loja = ConfiguracaoLoja.objects.filter(Q(owner=request.user) | Q(equipe__user=request.user)).first()
            if not loja:
                return Response({'error': 'loja_id required'}, status=400)
            loja_id = loja.id
        
        # Filter active mesa orders for this store
        orders = Pedido.objects.filter(
            loja_id=loja_id, 
            tipo='MESA',
            mesa__isnull=False
        ).exclude(status__in=['FINALIZADO', 'CANCELADO'])
        
        # Group by mesa and get total/items
        mesas_data = {}
        for order in orders:
            m = order.mesa
            if m not in mesas_data:
                mesas_data[m] = {
                    'mesa': m,
                    'pedidos_ids': [],
                    'total': 0,
                    'itens_count': 0,
                    'status': 'OCUPADA',
                    'cliente_nome': order.cliente_nome # Takes last one or representative
                }
            mesas_data[m]['pedidos_ids'].append(order.id)
            mesas_data[m]['total'] += float(order.total)
            mesas_data[m]['itens_count'] += order.itens.count()

        return Response(list(mesas_data.values()))

class CaixaViewSet(viewsets.ModelViewSet):
    serializer_class = CaixaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Users see shifts from stores they belong to
        return (Caixa.objects.filter(loja__owner=user) | \
               Caixa.objects.filter(loja__equipe__user=user)).distinct().order_by('-data_abertura')

    def perform_create(self, serializer):
        # Allow creating a shift manually if needed, but 'abrir' action is preferred
        serializer.save(operador=self.request.user)

    @action(detail=False, methods=['post'])
    def abrir(self, request):
        loja_id = request.data.get('loja_id')
        saldo_inicial = request.data.get('saldo_inicial')

        if not loja_id or saldo_inicial is None:
            return Response({'error': 'loja_id and saldo_inicial are required'}, status=400)

        # Check if user has an open shift in this store
        aberto = Caixa.objects.filter(loja_id=loja_id, operador=request.user, status='ABERTO').first()
        if aberto:
            return Response({'error': 'Você já possui um caixa aberto nesta loja.'}, status=400)

        caixa = Caixa.objects.create(
            loja_id=loja_id,
            operador=request.user,
            saldo_inicial=saldo_inicial,
            status='ABERTO'
        )
        
        # Log opening transaction
        MovimentacaoCaixa.objects.create(
            caixa=caixa,
            tipo='ABERTURA',
            valor=saldo_inicial,
            descricao='Abertura de Caixa'
        )

        return Response(CaixaSerializer(caixa).data)

    @action(detail=False, methods=['get'])
    def status(self, request):
        loja_id = request.query_params.get('loja_id')
        if not loja_id:
            return Response({'error': 'loja_id required'}, status=400)
            
        caixa = Caixa.objects.filter(loja_id=loja_id, operador=request.user, status='ABERTO').last()
        if caixa:
             return Response(CaixaSerializer(caixa).data)
        return Response(None) # No open shift

    @action(detail=True, methods=['post'])
    def fechar(self, request, pk=None):
        caixa = self.get_object()
        
        # Restriction: Only owner can close the cash register
        is_owner = caixa.loja.owner == request.user
        is_profile_owner = PerfilUsuarioLoja.objects.filter(loja=caixa.loja, user=request.user, role='owner').exists()
        
        if not (is_owner or is_profile_owner):
            return Response({'error': 'Somente o proprietário pode fechar o caixa.'}, status=status.HTTP_403_FORBIDDEN)

        if caixa.status != 'ABERTO':
            return Response({'error': 'Caixa já está fechado.'}, status=400)

        saldo_informado = request.data.get('saldo_final')
        if saldo_informado is None:
             return Response({'error': 'saldo_final is required'}, status=400)

        # Calculate expected based on transactions
        total_entradas = caixa.movimentacoes.filter(tipo__in=['ABERTURA', 'VENDA', 'SUPRIMENTO']).aggregate(Sum('valor'))['valor__sum'] or Decimal('0.00')
        total_saidas = caixa.movimentacoes.filter(tipo__in=['SANGRIA']).aggregate(Sum('valor'))['valor__sum'] or Decimal('0.00')
        
        caixa.saldo_final_esperado = total_entradas - total_saidas
        caixa.saldo_final_informado = saldo_informado
        caixa.status = 'FECHADO'
        caixa.data_fechamento = timezone.now()
        caixa.save()
        
        MovimentacaoCaixa.objects.create(
            caixa=caixa,
            tipo='FECHAMENTO',
            valor=saldo_informado,
            descricao=f'Fechamento de Caixa (Esperado: {caixa.saldo_final_esperado})'
        )

        return Response(CaixaSerializer(caixa).data)

    @action(detail=False, methods=['post'])
    def venda(self, request):
        caixa_id = request.data.get('caixa')
        valor = request.data.get('valor')
        forma_pagamento = request.data.get('forma_pagamento', 'DINHEIRO')
        itens_data = request.data.get('itens', [])
        mesa_orders_ids = request.data.get('mesa_orders', [])
        cliente_nome = request.data.get('cliente_nome', 'Consumidor Final')
        cliente_whatsapp = request.data.get('cliente_whatsapp', '')

        if not caixa_id or not valor:
            return Response({'error': 'caixa and valor are required'}, status=400)

        caixa = Caixa.objects.filter(id=caixa_id, status='ABERTO').first()
        if not caixa:
            return Response({'error': 'Caixa não encontrado ou fechado'}, status=400)

        # 1. Create a "Consolidated" Pedido for this sale record
        # Note: In a real app we might want to link the mesa orders directly.
        # Here we create a new one to represent the payment event.
        pedido = Pedido.objects.create(
            loja=caixa.loja,
            cliente_nome=cliente_nome,
            cliente_whatsapp=cliente_whatsapp,
            total=valor,
            forma_pagamento=forma_pagamento,
            status='FINALIZADO',
            tipo='RETIRADA' # Sales at POS usually Withdrawal/Local
        )

        for item in itens_data:
            ItemPedido.objects.create(
                pedido=pedido,
                produto_id=item['produto'],
                quantidade=item['quantidade'],
                preco_unitario=item['preco_unitario'],
                selecoes=item.get('selecoes', [])
            )

        # 2. Mark mesa orders as CANCELADO (Consolidated)
        # We mark as CANCELADO so they don't appear in sales reports as duplicates,
        # since the new 'pedido' created above contains all the items and the full value.
        if mesa_orders_ids:
            Pedido.objects.filter(id__in=mesa_orders_ids).update(status='CANCELADO')

        # 3. Create Cash Move
        mov = MovimentacaoCaixa.objects.create(
            caixa=caixa,
            tipo='VENDA',
            valor=valor,
            descricao=f'Venda PDV {f"(Mesa orders: {mesa_orders_ids} - Consolidados)" if mesa_orders_ids else ""}',
            pedido=pedido
        )

        return Response(MovimentacaoCaixaSerializer(mov).data)

    @action(detail=True, methods=['post'])
    def sangria(self, request, pk=None):
        caixa = self.get_object()
        valor = request.data.get('valor')
        descricao = request.data.get('descricao', 'Sangria')

        if not valor:
             return Response({'error': 'valor is required'}, status=400)

        mov = MovimentacaoCaixa.objects.create(
            caixa=caixa,
            tipo='SANGRIA',
            valor=valor,
            descricao=descricao
        )
        return Response(MovimentacaoCaixaSerializer(mov).data)

    @action(detail=True, methods=['post'])
    def suprimento(self, request, pk=None):
        caixa = self.get_object()
        valor = request.data.get('valor')
        descricao = request.data.get('descricao', 'Suprimento')

        if not valor:
             return Response({'error': 'valor is required'}, status=400)

        mov = MovimentacaoCaixa.objects.create(
            caixa=caixa,
            tipo='SUPRIMENTO',
            valor=valor,
            descricao=descricao
        )
        return Response(MovimentacaoCaixaSerializer(mov).data)

class TeamMemberViewSet(viewsets.ModelViewSet):
    serializer_class = PerfilUsuarioLojaSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return PerfilUsuarioLoja.objects.filter(Q(loja__owner=self.request.user) | Q(loja__equipe__user=self.request.user)).distinct()
    def create(self, request, *args, **kwargs):
        email = request.data.get('email')
        password = request.data.get('password')
        full_name = request.data.get('full_name', '')
        loja_id = request.data.get('loja')
        role = request.data.get('role', 'waiter')

        if not all([email, loja_id]):
            return Response({"error": "Email e loja são obrigatórios"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                loja = ConfiguracaoLoja.objects.get(id=loja_id)
                # Permission check: Only owner or manager (can be refined) can add members
                if loja.owner != request.user and not PerfilUsuarioLoja.objects.filter(loja=loja, user=request.user, role='manager').exists():
                    return Response({"error": "Somente o proprietário ou gerente pode adicionar membros"}, status=status.HTTP_403_FORBIDDEN)

                # Get or Create User
                user_to_add = User.objects.filter(Q(username=email) | Q(email=email)).first()
                
                if not user_to_add:
                    if not password:
                        return Response({"error": "Senha é obrigatória para novos usuários"}, status=status.HTTP_400_BAD_REQUEST)
                    
                    user_to_add = User.objects.create_user(
                        username=email,
                        email=email,
                        password=password,
                        first_name=full_name
                    )
                
                if PerfilUsuarioLoja.objects.filter(loja=loja, user=user_to_add).exists():
                    return Response({"error": "Este usuário já faz parte da equipe"}, status=status.HTTP_400_BAD_REQUEST)

                perfil = PerfilUsuarioLoja.objects.create(
                    user=user_to_add,
                    loja=loja,
                    role=role
                )
                serializer = self.get_serializer(perfil)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ConfiguracaoLoja.DoesNotExist:
            return Response({"error": "Loja não encontrada"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MercadoPagoWebhookView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        return Response(status=200)
