from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Plano, ConfiguracaoLoja, Categoria, Produto, GrupoDeAtributos, AtributoOpcao, Pedido, ItemPedido, PerfilUsuarioLoja, Caixa, MovimentacaoCaixa, UserProfile, BairroEntrega

import json

class FlexibleJSONField(serializers.Field):
    def to_internal_value(self, data):
        print(f"DEBUG: FlexibleJSONField received: {data} (type: {type(data)})", flush=True)
        if not data:
            return {}
        if isinstance(data, str):
            try:
                import json
                parsed = json.loads(data)
                print(f"DEBUG: Successfully parsed JSON from string: {parsed}", flush=True)
                return parsed
            except (ValueError, TypeError) as e:
                print(f"DEBUG: Failed to parse JSON: {e}", flush=True)
                raise serializers.ValidationError("O formato do JSON é inválido.")
        return data

    def to_representation(self, value):
        return value

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['is_verified']

class UserSerializer(serializers.ModelSerializer):
    roles = serializers.SerializerMethodField()
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'roles', 'profile']

    def get_roles(self, obj):
        roles_data = []
        
        # 1. Stores where user is the Owner
        for s in obj.lojas.all():
            roles_data.append({
                'id': s.id,
                'store_name': s.nome,
                'store_slug': s.slug,
                'role': 'owner'
            })
            
        # 2. Stores where user is a team member
        for p in obj.perfis_lojas.select_related('loja').all():
            # Avoid duplicate if already added as owner
            if not any(r['id'] == p.loja.id for r in roles_data):
                roles_data.append({
                    'id': p.loja.id,
                    'store_name': p.loja.nome,
                    'store_slug': p.loja.slug,
                    'role': p.role
                })
                
        return roles_data

class PerfilUsuarioLojaSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = PerfilUsuarioLoja
        fields = ['id', 'user', 'user_details', 'loja', 'role', 'role_display', 'criado_em']

class PlanoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plano
        fields = '__all__'

class AtributoOpcaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = AtributoOpcao
        # 'grupo' removed from fields as it is handled by the parent serializer
        fields = ['id', 'nome', 'preco_adicional']

class GrupoDeAtributosSerializer(serializers.ModelSerializer):
    opcoes = AtributoOpcaoSerializer(many=True, required=False)
    loja_details = serializers.ReadOnlyField(source='loja.nome', read_only=True)
    loja = serializers.ReadOnlyField(source='loja.id')

    class Meta:
        model = GrupoDeAtributos
        fields = ['id', 'loja', 'loja_details', 'nome', 'tipo', 'min_opcoes', 'max_opcoes', 'opcoes']

    def validate(self, data):
        # Debug print can be removed purely to clean up, but keeping it for a moment is fine.
        return data

    def create(self, validated_data):
        opcoes_data = validated_data.pop('opcoes', [])
        grupo = GrupoDeAtributos.objects.create(**validated_data)
        for opcao_data in opcoes_data:
            AtributoOpcao.objects.create(grupo=grupo, **opcao_data)
        return grupo

    def update(self, instance, validated_data):
        opcoes_data = validated_data.pop('opcoes', [])
        
        instance.nome = validated_data.get('nome', instance.nome)
        instance.tipo = validated_data.get('tipo', instance.tipo)
        instance.min_opcoes = validated_data.get('min_opcoes', instance.min_opcoes)
        instance.max_opcoes = validated_data.get('max_opcoes', instance.max_opcoes)
        instance.save()
        
        # Simple strategy: Delete all and recreate (easier for MVP)
        # Or better: Update existing, create new, delete missing.
        # Let's go with delete/recreate for simplicity/robustness in this context unless IDs matter heavily.
        # IDs don't matter much here since they are just option values.
        
        if opcoes_data is not None:
            instance.opcoes.all().delete()
            for opcao_data in opcoes_data:
                AtributoOpcao.objects.create(grupo=instance, **opcao_data)

        return instance

class ProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produto
        fields = '__all__'

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        try:
            representation['grupos_atributos'] = GrupoDeAtributosSerializer(instance.grupos_atributos.all(), many=True).data
            representation['categoria_nome'] = instance.categoria.nome if instance.categoria else 'Sem Categoria'
        except Exception:
            representation['grupos_atributos'] = []
        return representation

class CategoriaSerializer(serializers.ModelSerializer):
    produtos = ProdutoSerializer(many=True, read_only=True)
    loja_details = serializers.ReadOnlyField(source='loja.nome', read_only=True)
    loja = serializers.ReadOnlyField(source='loja.id')

    class Meta:
        model = Categoria
        fields = ['id', 'loja', 'nome', 'ordem', 'ativa', 'produtos', 'loja_details']

class BairroEntregaSerializer(serializers.ModelSerializer):
    class Meta:
        model = BairroEntrega
        fields = ['id', 'loja', 'nome', 'taxa', 'ativo']
        read_only_fields = ['loja']

class StoreDetailSerializer(serializers.ModelSerializer):
    categorias = CategoriaSerializer(many=True, read_only=True)
    bairros_entrega = BairroEntregaSerializer(many=True, read_only=True)
    plano_details = PlanoSerializer(source='plano', read_only=True)
    horario_funcionamento = FlexibleJSONField(required=False)

    class Meta:
        model = ConfiguracaoLoja
        fields = [
            'id', 'owner', 'nome', 'slug', 'cor_primaria', 'cor_secundaria', 
            'logo', 'banner', 'whatsapp', 'endereco', 'horario_funcionamento', 'ativa',
            'evolution_instance', 'evolution_token',
            'ifood_client_id', 'ifood_client_secret', 'ifood_merchant_id', 'ifood_active',
            'notificar_preparo', 'notificar_entrega', 'notificar_finalizado',
            'msg_preparo', 'msg_entrega', 'msg_finalizado',
            'plano', 'plano_details', 'plano_tipo', 'status_assinatura', 'valido_ate',
            'valido_ate', 'tipo_taxa_entrega', 'taxa_entrega_fixa',
            'categorias', 'bairros_entrega',
            'bot_ativo_whatsapp', 'bot_personalidade', 'bot_conhecimento', 'bot_alerta_transbordo',
            'modo_catalogo', 'quantidade_mesas'
        ]

class ItemPedidoSerializer(serializers.ModelSerializer):
    produto_obj = ProdutoSerializer(source='produto', read_only=True)

    class Meta:
        model = ItemPedido
        fields = '__all__'
        extra_kwargs = {'pedido': {'required': False}}

class PedidoSerializer(serializers.ModelSerializer):
    itens = ItemPedidoSerializer(many=True, required=False)

    class Meta:
        model = Pedido
        fields = [
            'id', 'loja', 'cliente_nome', 'cliente_whatsapp', 'endereco', 
            'total', 'forma_pagamento', 'status', 'tipo', 'taxa_entrega', 
            'mesa', 'numero_diario', 'observacoes', 'external_id', 'origem', 
            'criado_em', 'itens'
        ]

    def create(self, validated_data):
        try:
            itens_data = validated_data.pop('itens', [])
            
            print(f"DEBUG: Processing create. Validated Data: {validated_data}")
            
            # Ensure forma_pagamento has a default value if missing or null
            current_fp = validated_data.get('forma_pagamento')
            if not current_fp:
                validated_data['forma_pagamento'] = 'PIX'
                print("DEBUG: Set forma_pagamento default to PIX")

            # Pre-check Inventory
            for item_data in itens_data:
                prod = item_data['produto']
                qtd = item_data['quantidade']
                if prod.controlar_estoque and prod.estoque_atual < qtd:
                    raise serializers.ValidationError({"detail": f"Estoque insuficiente para {prod.nome}. Restam apenas {prod.estoque_atual}."})

            pedido = Pedido.objects.create(**validated_data)
            for item_data in itens_data:
                prod = item_data['produto']
                qtd = item_data['quantidade']
                
                # Inventory Decrement
                if prod.controlar_estoque:
                    prod.estoque_atual -= qtd
                    prod.save()
                
                ItemPedido.objects.create(pedido=pedido, **item_data)
            return pedido
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise serializers.ValidationError({"detail": str(e)})

class MovimentacaoCaixaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimentacaoCaixa
        fields = '__all__'

class CaixaSerializer(serializers.ModelSerializer):
    movimentacoes = MovimentacaoCaixaSerializer(many=True, read_only=True)
    operador_nome = serializers.CharField(source='operador.username', read_only=True)
    saldo_atual = serializers.SerializerMethodField()
    
    class Meta:
        model = Caixa
        fields = '__all__'

    def get_saldo_atual(self, obj):
        from django.db.models import Sum
        from decimal import Decimal
        total_entradas = obj.movimentacoes.filter(tipo__in=['ABERTURA', 'VENDA', 'SUPRIMENTO']).aggregate(Sum('valor'))['valor__sum'] or Decimal('0.00')
        total_saidas = obj.movimentacoes.filter(tipo__in=['SANGRIA']).aggregate(Sum('valor'))['valor__sum'] or Decimal('0.00')
        return float(total_entradas - total_saidas)
