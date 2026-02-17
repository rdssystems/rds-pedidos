from django.contrib import admin
from .models import Plano, ConfiguracaoLoja, Categoria, GrupoDeAtributos, AtributoOpcao, Produto, Pedido, ItemPedido, PerfilUsuarioLoja

@admin.register(PerfilUsuarioLoja)
class PerfilUsuarioLojaAdmin(admin.ModelAdmin):
    list_display = ('user', 'loja', 'role', 'criado_em')
    list_filter = ('role', 'loja')
    search_fields = ('user__username', 'loja__nome')


@admin.register(Plano)
class PlanoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'preco_mensal', 'max_produtos')

@admin.register(ConfiguracaoLoja)
class ConfiguracaoLojaAdmin(admin.ModelAdmin):
    list_display = ('nome', 'slug', 'owner', 'plano', 'status_assinatura', 'ativa')
    prepopulated_fields = {'slug': ('nome',)}

class AtributoOpcaoInline(admin.TabularInline):
    model = AtributoOpcao
    extra = 1

@admin.register(GrupoDeAtributos)
class GrupoDeAtributosAdmin(admin.ModelAdmin):
    list_display = ('nome', 'loja', 'tipo')
    inlines = [AtributoOpcaoInline]

@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nome', 'loja', 'ordem', 'ativa')
    list_editable = ('ordem', 'ativa')

@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'categoria', 'preco', 'disponivel')
    list_filter = ('categoria', 'disponivel')
    search_fields = ('nome', 'descricao')

class ItemPedidoInline(admin.TabularInline):
    model = ItemPedido
    extra = 0

@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ('id', 'loja', 'cliente_nome', 'total', 'status', 'criado_em')
    list_filter = ('status', 'loja')
    inlines = [ItemPedidoInline]
