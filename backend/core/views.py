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
from .models import Plano, ConfiguracaoLoja, Categoria, Produto, GrupoDeAtributos, AtributoOpcao, Pedido, ItemPedido, PerfilUsuarioLoja, Caixa, MovimentacaoCaixa
from .serializers import (
    StoreDetailSerializer, CategoriaSerializer, ProdutoSerializer,
    PedidoSerializer, FlexibleJSONField, GrupoDeAtributosSerializer,
    AtributoOpcaoSerializer, ItemPedidoSerializer, PerfilUsuarioLojaSerializer,
    CaixaSerializer, MovimentacaoCaixaSerializer
)
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from .services import EvolutionService
import json

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
                return Response({"message": "Conta e loja criadas com sucesso!", "store_slug": store.slug, "username": user.username}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    @action(detail=False, methods=['get'])
    def me(self, request):
        user = request.user
        roles = PerfilUsuarioLoja.objects.filter(user=user)
        owned_stores = ConfiguracaoLoja.objects.filter(owner=user)
        roles_data = []
        for p in roles:
            roles_data.append({'id': p.loja.id, 'store_slug': p.loja.slug, 'store_name': p.loja.nome, 'role': p.role})
        for s in owned_stores:
            if not any(r['store_slug'] == s.slug for r in roles_data):
                roles_data.append({'id': s.id, 'store_slug': s.slug, 'store_name': s.nome, 'role': 'owner'})
        
        return Response({
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'roles': roles_data
        })

class StoreViewSet(viewsets.ModelViewSet):
    queryset = ConfiguracaoLoja.objects.all()
    serializer_class = StoreDetailSerializer
    lookup_field = 'slug'
    def get_permissions(self):
        if self.action in ['list', 'create', 'update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, HasActiveSubscription]
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

    def update(self, request, *args, **kwargs):
        if 'horario_funcionamento' in request.data and isinstance(request.data['horario_funcionamento'], str):
            try:
                data = request.data.copy()
                data['horario_funcionamento'] = json.loads(data['horario_funcionamento'])
                serializer = self.get_serializer(self.get_object(), data=data, partial=kwargs.get('partial', False))
                serializer.is_valid(raise_exception=True)
                self.perform_update(serializer)
                return Response(serializer.data)
            except json.JSONDecodeError: pass
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
        return Caixa.objects.filter(loja__owner=user).order_by('-data_abertura') | \
               Caixa.objects.filter(loja__equipe__user=user).order_by('-data_abertura')

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
        total_entradas = caixa.movimentacoes.filter(tipo__in=['ABERTURA', 'VENDA', 'SUPRIMENTO']).aggregate(Sum('valor'))['valor__sum'] or 0
        total_saidas = caixa.movimentacoes.filter(tipo__in=['SANGRIA']).aggregate(Sum('valor'))['valor__sum'] or 0
        
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
