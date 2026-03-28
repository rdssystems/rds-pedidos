import os
import django
import sys

# Add the current directory to sys.path
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.models import ConfiguracaoLoja, Plano

print("=== INICIANDO MIGRAÇÃO ELITE -> PRO ===")

try:
    # 1. Obter o plano PRO e garantir que ele tem todos os recursos do Elite antigo
    pro_plan, created = Plano.objects.get_or_create(
        nome='PRO',
        defaults={
            'preco_mensal': 149.90,
            'max_produtos': 1000,
            'recursos': {
                'whatsapp': True, 
                'whatsapp_automation': True,
                'cardapio_digital': True, 
                'pedidos': True, 
                'pdv': True, 
                'kanban': True, 
                'mesas': True, 
                'equipe': 10, 
                'ifood': True
            }
        }
    )
    
    # Force update PRO features if it already existed
    pro_plan.max_produtos = 1000
    pro_plan.recursos = {
        'whatsapp': True, 
        'whatsapp_automation': True,
        'cardapio_digital': True, 
        'pedidos': True, 
        'pdv': True, 
        'kanban': True, 
        'mesas': True, 
        'equipe': 10, 
        'ifood': True
    }
    pro_plan.save()
    print(f"Plano PRO atualizado com os novos limites (ID: {pro_plan.id})")

    # 2. Encontrar todas as lojas no plano Elite e migrar
    elite_stores = ConfiguracaoLoja.objects.filter(plano_tipo='ELITE')
    count = elite_stores.count()
    print(f"Encontradas {count} loja(s) no plano Elite.")
    
    for store in elite_stores:
        print(f"  - Migrando loja: {store.nome} (Slug: {store.slug})")
        store.plano_tipo = 'PRO'
        store.plano = pro_plan
        store.save()
        
    # 3. Remover o plano Elite do banco (caso exista a entidade Plano) -> Cuidado se houver ForeignKey protected
    elite_plans = Plano.objects.filter(nome__iexact='elite')
    deleted_count, _ = elite_plans.delete()
    print(f"Objetos do Plano Elite removidos: {deleted_count}")

    print("=== MIGRAÇÃO CONCLUÍDA COM SUCESSO ===")

except Exception as e:
    print(f"ERRO DURANTE MIGRAÇÃO: {e}")
