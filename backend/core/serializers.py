from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Plano, ConfiguracaoLoja, Categoria, Produto, GrupoDeAtributos, AtributoOpcao, Pedido, ItemPedido, PerfilUsuarioLoja, Caixa, MovimentacaoCaixa

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

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

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

class StoreDetailSerializer(serializers.ModelSerializer):
    categorias = CategoriaSerializer(many=True, read_only=True)
    plano_details = PlanoSerializer(source='plano', read_only=True)
    horario_funcionamento = FlexibleJSONField(required=False)

    class Meta:
        model = ConfiguracaoLoja
        fields = [
            'id', 'owner', 'nome', 'slug', 'cor_primaria', 'cor_secundaria', 
            'logo', 'banner', 'whatsapp', 'endereco', 'horario_funcionamento', 'ativa',
            'evolution_instance', 'evolution_token',
            'notificar_preparo', 'notificar_entrega', 'notificar_finalizado',
            'msg_preparo', 'msg_entrega', 'msg_finalizado',
            'plano', 'plano_details', 'status_assinatura', 'valido_ate',
            'categorias'
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
        fields = '__all__'

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
    
    class Meta:
        model = Caixa
        fields = '__all__'
